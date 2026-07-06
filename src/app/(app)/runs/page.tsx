import Link from "next/link";
import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RunStatus } from "@/lib/types/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ExportCsvButton } from "@/components/common/export-button";
import { cn, fmt, fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Kiln runs" };

const RUN_STATUSES = ["draft", "submitted", "changes_requested", "approved", "rejected"] as const;

const FILTERS: { key: RunStatus | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "changes_requested", label: "Changes requested" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const supabase = await createClient();

  const sp = await searchParams;
  const status = RUN_STATUSES.includes(sp.status as RunStatus)
    ? (sp.status as RunStatus)
    : undefined;

  let query = supabase
    .from("kiln_runs")
    .select(
      "id, code, status, anomaly_flag, started_at, created_at, biochar_dry_kg, operator_id, sites(name, code), kilns(name, code), production_batches(id, code)",
    )
    .eq("project_id", project.id);
  if (status) query = query.eq("status", status);
  const { data } = await query.order("created_at", { ascending: false });
  const runs = data ?? [];

  // kiln_runs → profiles has two FKs; fetch operator names separately.
  const operatorIds = [...new Set(runs.map((r) => r.operator_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (operatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", operatorIds);
    for (const p of profiles ?? []) names.set(p.id, p.full_name);
  }

  const csvRows = runs.map((r) => {
    const site = r.sites as { name: string; code: string } | null;
    const kiln = r.kilns as { name: string; code: string } | null;
    const batch = r.production_batches as { id: string; code: string } | null;
    return {
      code: r.code ?? r.id,
      site: site?.name ?? "",
      kiln: kiln?.code ?? "",
      operator: (r.operator_id && names.get(r.operator_id)) || "",
      date: r.started_at ?? "",
      biochar_dry_kg: r.biochar_dry_kg ?? "",
      batch: batch?.code ?? "",
      status: r.status,
      anomaly: r.anomaly_flag ? "yes" : "no",
    };
  });

  return (
    <div>
      <PageHeader
        title="Kiln runs"
        description="Every burn logged in the field, with evidence, review status and batch assignment."
      >
        <ExportCsvButton rows={csvRows} filename="kiln-runs" />
        {ctx.can.canOperate && (
          <Button asChild>
            <Link href="/field">
              <Flame className="h-4 w-4" /> Log a kiln run
            </Link>
          </Button>
        )}
      </PageHeader>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => {
          const active = (f.key || undefined) === status;
          return (
            <Link
              key={f.label}
              href={f.key ? `/runs?status=${f.key}` : "/runs"}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-clay-soft bg-clay-tint text-clay"
                  : "border-border bg-surface text-ink-soft hover:bg-surface-2",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card>
        {runs.length === 0 ? (
          <EmptyState
            icon={<Flame />}
            title={status ? "No runs with this status" : "No kiln runs yet"}
            description={
              status
                ? "Try a different filter, or view all runs."
                : "Runs logged in the field will appear here with their evidence and review status."
            }
            className="border-0"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Run</TH>
                <TH>Site / Kiln</TH>
                <TH>Operator</TH>
                <TH>Date</TH>
                <TH className="text-right">Dry biochar</TH>
                <TH>Batch</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {runs.map((r) => {
                const site = r.sites as { name: string; code: string } | null;
                const kiln = r.kilns as { name: string; code: string } | null;
                const batch = r.production_batches as { id: string; code: string } | null;
                return (
                  <TR key={r.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/runs/${r.id}`}
                          className="font-medium text-ink hover:text-clay"
                        >
                          {r.code ?? r.id.slice(0, 8)}
                        </Link>
                        {r.anomaly_flag && (
                          <Badge tone="warn" dot>
                            Anomaly
                          </Badge>
                        )}
                      </div>
                    </TD>
                    <TD className="text-muted">
                      {site?.name ?? "—"} · {kiln?.code ?? "—"}
                    </TD>
                    <TD className="text-muted">
                      {(r.operator_id && names.get(r.operator_id)) || "—"}
                    </TD>
                    <TD className="text-muted">{fmtDate(r.started_at)}</TD>
                    <TD className="text-right tnum">
                      {r.biochar_dry_kg ? `${fmt(Number(r.biochar_dry_kg), 0)} kg` : "—"}
                    </TD>
                    <TD>
                      {batch ? (
                        <Link
                          href={`/batches/${batch.id}`}
                          className="text-clay hover:underline"
                        >
                          {batch.code}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TD>
                    <TD>
                      <StatusBadge kind="run" value={r.status} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

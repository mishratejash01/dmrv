import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Fire16Regular,
  ArrowUp16Regular,
  ArrowDown16Regular,
} from "@/components/common/icons";
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
import { RunsFilters } from "./runs-filters";
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

// Sortable columns → the real DB column they order by ("site" is a joined
// column, sorted in-memory after the fetch).
const SORT_COLUMNS = {
  code: "code",
  date: "created_at",
  biochar: "biochar_dry_kg",
  status: "status",
} as const;
type SortKey = keyof typeof SORT_COLUMNS | "site";
const SORT_KEYS: SortKey[] = ["code", "site", "date", "biochar", "status"];

type SearchParams = { status?: string; site?: string; kiln?: string; sort?: string; dir?: string };

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const supabase = await createClient();

  const sp = await searchParams;
  const status = RUN_STATUSES.includes(sp.status as RunStatus)
    ? (sp.status as RunStatus)
    : undefined;
  const siteFilter = sp.site || "";
  const kilnFilter = sp.kiln || "";
  const sort: SortKey = (SORT_KEYS as string[]).includes(sp.sort ?? "")
    ? (sp.sort as SortKey)
    : "date";
  const dir: "asc" | "desc" = sp.dir === "asc" ? "asc" : "desc";
  const ascending = dir === "asc";

  // Sites + kilns for the dropdowns.
  const { data: siteRows } = await supabase
    .from("sites")
    .select("id, name, code, kilns(id, name, code, site_id)")
    .eq("project_id", project.id)
    .order("name", { ascending: true });
  const sites = (siteRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    kilns: (s.kilns ?? []).map((k) => ({ id: k.id, name: k.name, code: k.code })),
  }));

  // Real per-site / per-kiln run counts (unfiltered, so the dropdowns are stable).
  const { data: allForCounts } = await supabase
    .from("kiln_runs")
    .select("site_id, kiln_id")
    .eq("project_id", project.id);
  const siteCounts: Record<string, number> = {};
  const kilnCounts: Record<string, number> = {};
  for (const r of allForCounts ?? []) {
    if (r.site_id) siteCounts[r.site_id] = (siteCounts[r.site_id] ?? 0) + 1;
    if (r.kiln_id) kilnCounts[r.kiln_id] = (kilnCounts[r.kiln_id] ?? 0) + 1;
  }

  // The filtered, sorted list.
  let query = supabase
    .from("kiln_runs")
    .select(
      "id, code, status, anomaly_flag, started_at, created_at, biochar_dry_kg, operator_id, site_id, kiln_id, sites(name, code), kilns(name, code), production_batches(id, code)",
    )
    .eq("project_id", project.id);
  if (status) query = query.eq("status", status);
  if (siteFilter) query = query.eq("site_id", siteFilter);
  if (kilnFilter) query = query.eq("kiln_id", kilnFilter);
  if (sort !== "site") {
    query = query.order(SORT_COLUMNS[sort], { ascending, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }
  const { data } = await query;
  let runs = data ?? [];

  // "site" is a joined column — sort those rows in memory by site name.
  if (sort === "site") {
    runs = [...runs].sort((a, b) => {
      const an = (a.sites as { name: string } | null)?.name ?? "";
      const bn = (b.sites as { name: string } | null)?.name ?? "";
      return ascending ? an.localeCompare(bn) : bn.localeCompare(an);
    });
  }

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

  // Build a header link that toggles direction on the active column.
  function sortHref(key: SortKey): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (siteFilter) params.set("site", siteFilter);
    if (kilnFilter) params.set("kiln", kilnFilter);
    params.set("sort", key);
    params.set("dir", sort === key && dir === "asc" ? "desc" : "asc");
    return `/runs?${params.toString()}`;
  }
  // A sortable header cell. Plain function (not a component) so header state is
  // computed once per server render from the URL params.
  function sortHead(col: SortKey, label: ReactNode, right?: boolean) {
    const active = sort === col;
    return (
      <TH className={right ? "text-right" : undefined}>
        <Link
          href={sortHref(col)}
          className={cn(
            "inline-flex items-center gap-1 hover:text-ink transition-colors",
            active && "text-ink",
            right && "flex-row-reverse",
          )}
        >
          {label}
          {active &&
            (dir === "asc" ? <ArrowUp16Regular className="h-3 w-3" /> : <ArrowDown16Regular className="h-3 w-3" />)}
        </Link>
      </TH>
    );
  }

  const filtered = Boolean(status || siteFilter || kilnFilter);

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
              <Fire16Regular className="h-4 w-4" /> Log a kiln run
            </Link>
          </Button>
        )}
      </PageHeader>

      {/* Site / kiln filters */}
      <div className="mb-4">
        <RunsFilters
          sites={sites}
          siteCounts={siteCounts}
          kilnCounts={kilnCounts}
          activeSite={siteFilter}
          activeKiln={kilnFilter}
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => {
          const active = (f.key || undefined) === status;
          const params = new URLSearchParams();
          if (f.key) params.set("status", f.key);
          if (siteFilter) params.set("site", siteFilter);
          if (kilnFilter) params.set("kiln", kilnFilter);
          if (sp.sort) params.set("sort", sp.sort);
          if (sp.dir) params.set("dir", sp.dir);
          const href = params.toString() ? `/runs?${params.toString()}` : "/runs";
          return (
            <Link
              key={f.label}
              href={href}
              className={cn(
                "rounded border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-clay-soft bg-clay-tint text-clay"
                  : "border-border bg-surface text-ink-soft hover:bg-surface-2",
              )}
            >
              {f.label}
            </Link>
          );
        })}
        <span className="ml-auto text-xs text-muted">
          {runs.length} run{runs.length === 1 ? "" : "s"}
          {filtered ? " matching" : ""}
        </span>
      </div>

      <Card>
        {runs.length === 0 ? (
          <EmptyState
            icon={<Fire16Regular />}
            title={filtered ? "No runs match these filters" : "No kiln runs yet"}
            description={
              filtered
                ? "Try a different site, kiln or status — or clear the filters."
                : "Runs logged in the field will appear here with their evidence and review status."
            }
            className="border-0"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                {sortHead("code", "Run")}
                {sortHead("site", "Site / Kiln")}
                <TH>Operator</TH>
                {sortHead("date", "Date")}
                {sortHead("biochar", "Dry biochar", true)}
                <TH>Batch</TH>
                {sortHead("status", "Status")}
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

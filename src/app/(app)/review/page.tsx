import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CheckSquare, Flame, ShieldAlert, Thermometer } from "lucide-react";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { fmt, fmtDate, timeAgo } from "@/lib/utils";
import { ReviewActions } from "../runs/[id]/review-actions";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewQueuePage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;

  if (!ctx.can.canReview) {
    return (
      <div>
        <PageHeader
          title="Review queue"
          description="Approve, reject or request changes on submitted kiln runs."
        />
        <EmptyState
          icon={<ShieldAlert />}
          title="Reviewer access required"
          description="Only supervisors and project developers can review submitted kiln runs. Ask a project admin if you need access."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: runsData } = await supabase
    .from("kiln_runs")
    .select(
      "id, code, status, started_at, submitted_at, peak_temp_c, biochar_dry_kg, anomaly_flag, operator_id, sites(name, code), kilns(name, code)",
    )
    .eq("project_id", project.id)
    .in("status", ["submitted", "changes_requested"])
    .order("submitted_at", { ascending: true });

  const runs = runsData ?? [];

  // kiln_runs → profiles has two FKs; fetch operator names in a separate query.
  const operatorIds = [
    ...new Set(runs.map((r) => r.operator_id).filter((x): x is string => !!x)),
  ];
  const operatorName = new Map<string, string>();
  if (operatorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", operatorIds);
    for (const p of profs ?? []) operatorName.set(p.id, p.full_name);
  }

  return (
    <div>
      <PageHeader
        title="Review queue"
        description="Check the evidence for each submitted run, then approve, request changes, or reject."
      >
        <Badge tone={runs.length > 0 ? "ochre" : "neutral"} dot>
          {runs.length} awaiting review
        </Badge>
      </PageHeader>

      {runs.length === 0 ? (
        <EmptyState
          icon={<CheckSquare />}
          title="Nothing to review"
          description="Every submitted run has been reviewed. New submissions from the field will appear here."
        />
      ) : (
        <div className="space-y-4">
          {runs.map((r) => {
            const site = r.sites as { name: string; code: string } | null;
            const kiln = r.kilns as { name: string; code: string } | null;
            const runCode = r.code ?? r.id.slice(0, 8);
            return (
              <Card key={r.id}>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/runs/${r.id}`}
                          className="font-display text-lg text-ink hover:text-clay flex items-center gap-1.5"
                        >
                          <Flame className="h-4 w-4 text-clay shrink-0" />
                          {runCode}
                        </Link>
                        <StatusBadge kind="run" value={r.status} />
                        {r.anomaly_flag && (
                          <Badge tone="warn" dot>
                            Anomaly flagged
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {site ? `${site.name} (${site.code})` : "Unknown site"}
                        {kiln ? ` · ${kiln.name}` : ""}
                        {" · "}
                        {r.operator_id ? operatorName.get(r.operator_id) ?? "Unknown operator" : "Unknown operator"}
                      </p>
                    </div>
                    <Link
                      href={`/runs/${r.id}`}
                      className="text-sm text-clay hover:underline flex items-center gap-1 shrink-0"
                    >
                      Full record <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-surface/60 px-3 py-2.5">
                      <p className="font-display text-lg text-ink tnum flex items-center gap-1.5">
                        <Thermometer className="h-3.5 w-3.5 text-clay" />
                        {r.peak_temp_c ? `${fmt(Number(r.peak_temp_c), 0)} °C` : "—"}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Peak temp</p>
                    </div>
                    <div className="rounded-lg bg-surface/60 px-3 py-2.5">
                      <p className="font-display text-lg text-ink tnum">
                        {r.biochar_dry_kg ? `${fmt(Number(r.biochar_dry_kg), 0)} kg` : "—"}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Dry biochar</p>
                    </div>
                    <div className="rounded-lg bg-surface/60 px-3 py-2.5">
                      <p className="font-display text-lg text-ink tnum">{fmtDate(r.started_at)}</p>
                      <p className="text-xs text-muted mt-0.5">Run date</p>
                    </div>
                    <div className="rounded-lg bg-surface/60 px-3 py-2.5">
                      <p className="font-display text-lg text-ink tnum">
                        {r.submitted_at ? timeAgo(r.submitted_at) : "—"}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Submitted</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border pt-4">
                    <ReviewActions runId={r.id} size="sm" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

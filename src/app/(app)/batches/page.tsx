import Link from "next/link";
import type { Metadata } from "next";
import { Boxes, Flame, ArrowUpRight } from "lucide-react";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Meter } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { fmt, fmtDate, monthsBetween, humanize } from "@/lib/utils";
import { BATCH_LIMITS, KILN_TYPES, METHODOLOGY } from "@/lib/methodology";
import { NewBatch } from "./new-batch";

export const metadata: Metadata = { title: "Production batches" };

export default async function BatchesPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const supabase = await createClient();

  const { data } = await supabase
    .from("production_batches")
    .select("*")
    .eq("project_id", project.id)
    .order("opened_at", { ascending: false });
  const batches = data ?? [];

  const kilnLabel = (key: string) =>
    KILN_TYPES.find((k) => k.key === key)?.label ?? humanize(key);

  return (
    <div>
      <PageHeader
        title="Production batches"
        description={`Biochar grouped by kiln type, feedstock and temperature curve. Under ${METHODOLOGY.id} a batch is valid for at most ${BATCH_LIMITS.maxMonths} months or ${BATCH_LIMITS.maxTonnes} tonnes — whichever comes first.`}
      >
        {ctx.can.canManageProject && <NewBatch projectId={project.id} />}
      </PageHeader>

      {batches.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title="No production batches yet"
          description="Open a batch to start grouping kiln runs of the same kiln type, feedstock and temperature curve."
          action={ctx.can.canManageProject ? <NewBatch projectId={project.id} /> : undefined}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {batches.map((b) => {
            const tonnes = Number(b.total_biochar_dry_kg) / 1000;
            const age = monthsBetween(b.opened_at, b.closed_at ?? undefined);
            const over = tonnes >= BATCH_LIMITS.maxTonnes || age >= BATCH_LIMITS.maxMonths;
            const near =
              !over &&
              (tonnes >= BATCH_LIMITS.maxTonnes * BATCH_LIMITS.warnFraction ||
                age >= BATCH_LIMITS.maxMonths * BATCH_LIMITS.warnFraction);
            return (
              <Card key={b.id}>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle>
                      <Link href={`/batches/${b.id}`} className="hover:text-clay transition-colors">
                        {b.code}
                      </Link>
                    </CardTitle>
                    <p className="text-sm text-muted mt-0.5">
                      {kilnLabel(b.kiln_type)}
                      {b.feedstock_category ? ` · ${humanize(b.feedstock_category)}` : ""}
                    </p>
                  </div>
                  <StatusBadge kind="batch" value={b.status} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Meter
                      value={tonnes}
                      max={BATCH_LIMITS.maxTonnes}
                      label="Tonnage"
                      caption={`${fmt(tonnes, 1)} / ${BATCH_LIMITS.maxTonnes} t dry`}
                    />
                    <Meter
                      value={age}
                      max={BATCH_LIMITS.maxMonths}
                      label="Age"
                      caption={`${fmt(age, 1)} / ${BATCH_LIMITS.maxMonths} mo`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <span className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-clay" />
                        <span className="tnum">{b.run_count}</span> run{b.run_count === 1 ? "" : "s"}
                      </span>
                      <span aria-hidden>·</span>
                      <span>opened {fmtDate(b.opened_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.status === "open" && over && (
                        <Badge tone="err" dot>Limit reached — close</Badge>
                      )}
                      {b.status === "open" && near && (
                        <Badge tone="warn" dot>Approaching limit</Badge>
                      )}
                      <Link
                        href={`/batches/${b.id}`}
                        className="text-sm text-clay hover:underline flex items-center gap-1"
                      >
                        Detail <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
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

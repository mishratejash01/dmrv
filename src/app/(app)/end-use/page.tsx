import Link from "next/link";
import type { Metadata } from "next";
import {
  PlantGrass20Regular,
  Location20Regular,
  BoxMultiple20Regular,
  People20Regular,
  CalendarLtr20Regular,
} from "@/components/common/icons";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionHeader, EmptyState, Stat, DataRow } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Map } from "@/components/map/map";
import { PhotoGallery } from "@/components/evidence/photo-gallery";
import { fmt, fmtDate, humanize } from "@/lib/utils";
import { BUCKETS } from "@/lib/storage";
import { EndUseForm } from "./end-use-form";

export const metadata: Metadata = { title: "End-use" };

export default async function EndUsePage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [recordsRes, batchesRes] = await Promise.all([
    supabase
      .from("end_use_records")
      .select("*, production_batches(code)")
      .eq("project_id", pid)
      .order("applied_at", { ascending: false }),
    supabase
      .from("production_batches")
      .select("id, code")
      .eq("project_id", pid)
      .order("opened_at", { ascending: false }),
  ]);

  const records = recordsRes.data ?? [];
  const batches = batchesRes.data ?? [];

  const totalKg = records.reduce((s, r) => s + Number(r.quantity_kg || 0), 0);
  const recipients = new Set(
    records.map((r) => r.recipient_name).filter((x): x is string => !!x),
  );

  const mapPoints = records
    .filter((r) => r.latitude && r.longitude)
    .map((r) => ({
      id: r.id,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      label: r.recipient_name || humanize(r.application_method),
      sublabel: `${fmt(Number(r.quantity_kg), 0)} kg · ${humanize(r.application_method)}`,
      tone: "sage" as const,
    }));

  const canRecord = ctx.can.canOperate || ctx.can.canReview;

  return (
    <div>
      <PageHeader
        title="End-use tracking"
        description="Applying the biochar to soil or other durable uses locks the carbon in place. Each application is evidenced with quantity, recipient, GPS and proof photos."
      >
        {canRecord && <EndUseForm projectId={pid} batches={batches} />}
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Applications" value={fmt(records.length, 0)} icon={<PlantGrass20Regular />} tone="sage" hint="Carbon-locking events" />
        <Stat label="Biochar applied" value={fmt(totalKg / 1000, 2)} unit="t" icon={<BoxMultiple20Regular />} tone="clay" hint="Cumulative applied mass" />
        <Stat label="Recipients" value={fmt(recipients.size, 0)} icon={<People20Regular />} tone="ochre" hint="Distinct off-takers" />
        <Stat label="Geolocated" value={fmt(mapPoints.length, 0)} icon={<Location20Regular />} tone="info" hint="Applications with GPS" />
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={<PlantGrass20Regular />}
          title="No end-use recorded yet"
          description="Record where the biochar was applied to close the traceability chain and evidence permanent carbon locking."
          action={canRecord ? <EndUseForm projectId={pid} batches={batches} /> : undefined}
        />
      ) : (
        <div className="space-y-4">
          {/* Map */}
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Location20Regular className="h-4 w-4 text-clay" />
                <CardTitle>Application sites</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Map points={mapPoints} height={340} />
            </CardContent>
          </Card>

          {/* Records */}
          <section>
            <SectionHeader title="Applications" />
            <div className="grid lg:grid-cols-2 gap-4">
              {records.map((r) => {
                const batchCode = (r.production_batches as { code: string } | null)?.code;
                const proofs = ((r.proof_paths ?? []) as string[]).map((p) => ({
                  storage_path: p,
                  photo_type: "end_use",
                }));
                return (
                  <Card key={r.id}>
                    <CardContent className="pt-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-xl text-ink tnum leading-tight">
                            {fmt(Number(r.quantity_kg), 0)}
                            <span className="text-sm text-muted ml-1 font-sans">kg</span>
                          </p>
                          <p className="mt-0.5 text-sm text-ink-soft">
                            {r.recipient_name || "Unnamed recipient"}
                          </p>
                        </div>
                        <Badge tone="sage">{humanize(r.application_method)}</Badge>
                      </div>

                      <dl className="mt-4 border-t border-border pt-1">
                        <DataRow label="Batch">
                          {batchCode ? (
                            r.production_batch_id ? (
                              <Link
                                href={`/batches/${r.production_batch_id}`}
                                className="text-clay hover:underline"
                              >
                                {batchCode}
                              </Link>
                            ) : (
                              batchCode
                            )
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </DataRow>
                        <DataRow label="Applied">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarLtr20Regular className="h-3.5 w-3.5 text-muted" />
                            {fmtDate(r.applied_at)}
                          </span>
                        </DataRow>
                        <DataRow label="Recipient contact">
                          {r.recipient_contact || <span className="text-muted">—</span>}
                        </DataRow>
                        <DataRow label="Location">
                          {r.latitude != null && r.longitude != null ? (
                            <span className="inline-flex items-center gap-1.5 tnum">
                              <Location20Regular className="h-3.5 w-3.5 text-muted" />
                              {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-muted">Not geolocated</span>
                          )}
                        </DataRow>
                      </dl>

                      {r.notes && (
                        <p className="mt-3 text-sm text-muted text-pretty">{r.notes}</p>
                      )}

                      <div className="mt-4">
                        <p className="text-xs font-medium text-muted mb-2">Proof of application</p>
                        <PhotoGallery photos={proofs} bucket={BUCKETS.endUseProof} columns={3} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

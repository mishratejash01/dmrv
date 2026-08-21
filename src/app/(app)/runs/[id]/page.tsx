import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, DataRow } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { PhotoGallery } from "@/components/evidence/photo-gallery";
import { TempCurve } from "@/components/charts/charts";
import { Map as GeoMap } from "@/components/map/map";
import { fmt, fmtPct, fmtDate, fmtDateTime, humanize } from "@/lib/utils";
import { kilnTypeLabel } from "@/lib/methodology";
import { ReviewActions } from "./review-actions";

export const metadata: Metadata = { title: "Run detail" };

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("kiln_runs")
    .select(
      "*, sites(name, code, region), kilns(name, code, kiln_type), production_batches(id, code, status), feedstock_batches(source, category, weight_kg, moisture_pct)",
    )
    .eq("id", id)
    .single();
  if (!run || run.project_id !== ctx.activeProject?.id) notFound();

  const { data: photosData } = await supabase
    .from("run_photos")
    .select("id, photo_type, storage_path, latitude, longitude, taken_at")
    .eq("kiln_run_id", id)
    .order("created_at", { ascending: true });
  const photos = photosData ?? [];

  // kiln_runs → profiles has two FKs (operator_id, reviewed_by); fetch names separately.
  const peopleIds = [...new Set([run.operator_id, run.reviewed_by].filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (peopleIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", peopleIds);
    for (const p of profiles ?? []) names.set(p.id, p.full_name);
  }
  const operatorName = (run.operator_id && names.get(run.operator_id)) || "—";
  const reviewerName = (run.reviewed_by && names.get(run.reviewed_by)) || "—";

  const site = run.sites as { name: string; code: string; region: string | null } | null;
  const kiln = run.kilns as { name: string; code: string; kiln_type: string } | null;
  const batch = run.production_batches as { id: string; code: string; status: string } | null;
  const feedstock = run.feedstock_batches as {
    source: string;
    category: string;
    weight_kg: number;
    moisture_pct: number;
  } | null;

  const curveRaw = run.temperature_curve;
  const curve = (Array.isArray(curveRaw) ? curveRaw : []) as { t: number; temp: number }[];

  const durationMin =
    run.started_at && run.ended_at
      ? Math.max(
          0,
          Math.round(
            (new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()) / 60000,
          ),
        )
      : null;

  const canReviewNow =
    ctx.can.canReview && (run.status === "submitted" || run.status === "changes_requested");
  const runCode = run.code ?? run.id.slice(0, 8);

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {runCode}
            <StatusBadge kind="run" value={run.status} />
            {run.anomaly_flag && (
              <Badge tone="warn" dot>
                Anomaly flagged
              </Badge>
            )}
          </span>
        }
        description={`${site?.name ?? "Unknown site"} · ${kiln?.name ?? "Unknown kiln"} · ${fmtDate(run.started_at)}`}
      >
        <Button asChild variant="outline">
          <Link href="/runs">
             All runs
          </Link>
        </Button>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Evidence */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                 Temperature curve
              </CardTitle>
              <span className="text-sm text-muted tnum">
                Peak {run.peak_temp_c ? `${fmt(Number(run.peak_temp_c), 0)} °C` : "—"}
              </span>
            </CardHeader>
            <CardContent>
              {curve.length > 1 ? (
                <>
                  <TempCurve curve={curve} height={220} />
                  <p className="mt-1 text-xs text-muted">
                    Indicative profile modelled from the recorded peak temperature and run duration.
                  </p>
                </>
              ) : (
                <p className="py-5 text-center text-sm text-muted">
                  No temperature curve recorded for this run.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 Photo evidence
                <span className="text-sm font-normal text-muted">({photos.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGallery photos={photos} />
            </CardContent>
          </Card>
              {run.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   Operator notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-soft whitespace-pre-wrap">{run.notes}</p>
              </CardContent>
            </Card>
          )}

          {(run.review_notes || run.reviewed_at) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  Reviewed by <span className="text-ink">{reviewerName}</span>
                  {run.reviewed_at && <> · {fmtDateTime(run.reviewed_at)}</>}
                </p>
                {run.review_notes && (
                  <p className="mt-2 text-sm text-ink-soft whitespace-pre-wrap">
                    {run.review_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
              {/* Record */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Run record</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <DataRow label="Site">
                  {site ? `${site.name} (${site.code})` : "—"}
                </DataRow>
                <DataRow label="Kiln">
                  {kiln ? `${kiln.name} · ${kilnTypeLabel(kiln.kiln_type)}` : "—"}
                </DataRow>
                <DataRow label="Operator">{operatorName}</DataRow>
                <DataRow label="Feedstock">
                  {feedstock
                    ? `${humanize(feedstock.category)} · ${feedstock.source}`
                    : "—"}
                </DataRow>
                <DataRow label="Batch">
                  {batch ? (
                    <Link href={`/batches/${batch.id}`} className="text-clay hover:underline">
                      {batch.code}
                    </Link>
                  ) : (
                    "Unassigned"
                  )}
                </DataRow>
                <DataRow label="Started">
                  <span className="tnum">{fmtDateTime(run.started_at)}</span>
                </DataRow>
                <DataRow label="Ended">
                  <span className="tnum">{fmtDateTime(run.ended_at)}</span>
                </DataRow>
                <DataRow label="Duration">
                  <span className="tnum">{durationMin != null ? `${durationMin} min` : "—"}</span>
                </DataRow>
                <DataRow label="Peak temperature">
                  <span className="tnum">
                    {run.peak_temp_c ? `${fmt(Number(run.peak_temp_c), 0)} °C` : "—"}
                  </span>
                </DataRow>
                <DataRow label="Biochar (wet)">
                  <span className="tnum">
                    {run.biochar_wet_kg ? `${fmt(Number(run.biochar_wet_kg), 0)} kg` : "—"}
                  </span>
                </DataRow>
                <DataRow label="Moisture">
                  <span className="tnum">
                    {run.biochar_moisture_pct != null
                      ? fmtPct(Number(run.biochar_moisture_pct))
                      : "—"}
                  </span>
                </DataRow>
                <DataRow label="Biochar (dry)">
                  <span className="tnum font-medium">
                    {run.biochar_dry_kg ? `${fmt(Number(run.biochar_dry_kg), 0)} kg` : "—"}
                  </span>
                </DataRow>
                <DataRow label="Composite sample">
                  <span className="tnum">
                    {run.composite_sample_kg
                      ? `${fmt(Number(run.composite_sample_kg), 1)} kg`
                      : "—"}
                  </span>
                </DataRow>
                <DataRow label="Quench">{run.quench_method ?? "—"}</DataRow>
                <DataRow label="Quenched at">
                  <span className="tnum">{fmtDateTime(run.quenched_at)}</span>
                </DataRow>
                <DataRow label="Submitted">
                  <span className="tnum">{fmtDateTime(run.submitted_at)}</span>
                </DataRow>
              </dl>
            </CardContent>
          </Card>
              {run.latitude != null && run.longitude != null && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GeoMap
                  points={[
                    {
                      id: run.id,
                      lat: Number(run.latitude),
                      lng: Number(run.longitude),
                      label: runCode,
                      sublabel: site?.name,
                      tone: "clay" as const,
                    },
                  ]}
                  height={200}
                />
                <p className="mt-2 text-xs text-muted tnum">
                  {Number(run.latitude).toFixed(5)}, {Number(run.longitude).toFixed(5)}
                </p>
              </CardContent>
            </Card>
          )}

          {canReviewNow && (
            <Card>
              <CardHeader>
                <CardTitle>Review decision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted">
                  Checkmark16Regular the photos, temperature curve and measurements before deciding.
                </p>
                <ReviewActions runId={run.id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

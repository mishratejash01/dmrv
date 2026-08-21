import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader, EmptyState, DataRow, Stat } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Map as GeoMap } from "@/components/map/map";
import { fmt, fmtDate, humanize } from "@/lib/utils";
import { kilnTypeLabel } from "@/lib/methodology";
import { PhotoGallery } from "@/components/evidence/photo-gallery";
import { BUCKETS } from "@/lib/storage";

export const metadata: Metadata = { title: "Site detail" };

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const supabase = await createClient();

  const { data: site } = await supabase.from("sites").select("*").eq("id", id).single();
  if (!site || site.project_id !== project.id) notFound();

  const [kilnsRes, runsRes, auditsRes] = await Promise.all([
    supabase.from("kilns").select("*").eq("site_id", id).order("code"),
    supabase
      .from("kiln_runs")
      .select("id, code, status, started_at, peak_temp_c, biochar_dry_kg, operator_id, kilns(code)")
      .eq("site_id", id)
      .order("started_at", { ascending: false })
      .limit(12),
    supabase
      .from("site_audits")
      .select("id, visit_date, findings, supervisor_id, photos")
      .eq("site_id", id)
      .order("visit_date", { ascending: false }),
  ]);

  const kilns = kilnsRes.data ?? [];
  const runs = runsRes.data ?? [];
  const audits = auditsRes.data ?? [];

  // kiln_runs → profiles has two FKs, and site_audits references profiles too;
  // fetch names via a single separate query.
  const peopleIds = [
    ...new Set(
      [
        ...runs.map((r) =>r.operator_id),
        ...audits.map((a) =>a.supervisor_id),
      ].filter((x): x is string => !!x),
    ),
  ];
  const personName = new Map<string, string>();
  if (peopleIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", peopleIds);
    for (const p of profs ?? []) personName.set(p.id, p.full_name);
  }

  const hasGps = site.latitude != null && site.longitude != null;
  const mapPoints = hasGps
    ? [
        {
          id: site.id,
          lat: Number(site.latitude),
          lng: Number(site.longitude),
          label: site.name,
          sublabel: site.region ?? undefined,
          tone: "clay" as const,
        },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {site.name}
            <Badge tone={site.status === "active" ? "ok" : "neutral"} dot>
              {humanize(site.status)}
            </Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-1.5">
              {site.region ?? "Region not set"}
            {hasGps && (
              <span className="tnum">
                {" · "}
                {Number(site.latitude).toFixed(5)}, {Number(site.longitude).toFixed(5)}
              </span>
            )}
          </span>
        }
      >
        <Button asChild variant="outline">
          <Link href="/sites">
             All sites
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Kilns" value={fmt(kilns.length, 0)} tone="clay" />
        <Stat label="Kiln runs" value={fmt(runs.length, 0)} tone="ochre" hint="Most recent 12" />
        <Stat label="Site audits" value={fmt(audits.length, 0)} tone="sage" />
        <Stat label="Code" value={site.code} tone="info" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Kilns */}
          <section>
            <SectionHeader title="Kilns" />
            <Card>
              {kilns.length === 0 ? (
                <EmptyState
                  title="No kilns at this site"
                  description="Register the kilns installed here to start logging runs against them."
                  className="border-0"
                />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Name</TH>
                      <TH>Code</TH>
                      <TH>Type</TH>
                      <TH className="text-right">Capacity</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {kilns.map((k) => (
                      <TR key={k.id}>
                        <TD className="font-medium text-ink">{k.name}</TD>
                        <TD>
                          <Badge tone="clay">{k.code}</Badge>
                        </TD>
                        <TD className="text-muted">{kilnTypeLabel(k.kiln_type)}</TD>
                        <TD className="text-right tnum">
                          {k.capacity_kg != null ? `${fmt(Number(k.capacity_kg), 0)} kg` : "—"}
                        </TD>
                        <TD>
                          <Badge tone={k.status === "active" ? "ok" : "neutral"} dot>
                            {humanize(k.status)}
                          </Badge>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>
          </section>
              {/* Recent runs */}
          <section>
            <SectionHeader
              title="Recent kiln runs"
              action={
                <Link href="/runs" className="text-sm text-clay hover:underline">
                  All runs
                </Link>
              }
            />
            <Card>
              {runs.length === 0 ? (
                <EmptyState
                  title="No runs logged here yet"
                  description="Kiln runs recorded at this site will appear here."
                  className="border-0"
                />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Run</TH>
                      <TH>Kiln</TH>
                      <TH>Operator</TH>
                      <TH>Date</TH>
                      <TH className="text-right">Peak °C</TH>
                      <TH className="text-right">Dry biochar</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {runs.map((r) => {
                      const kiln = (r.kilns as { code: string } | null)?.code;
                      return (
                        <TR key={r.id}>
                          <TD>
                            <Link
                              href={`/runs/${r.id}`}
                              className="font-medium text-ink hover:text-clay"
                            >
                              {r.code ?? r.id.slice(0, 8)}
                            </Link>
                          </TD>
                          <TD className="text-muted">{kiln ?? "—"}</TD>
                          <TD className="text-muted">
                            {r.operator_id ? personName.get(r.operator_id) ?? "—" : "—"}
                          </TD>
                          <TD className="text-muted">{fmtDate(r.started_at)}</TD>
                          <TD className="text-right tnum">
                            {r.peak_temp_c ? fmt(Number(r.peak_temp_c), 0) : "—"}
                          </TD>
                          <TD className="text-right tnum">
                            {r.biochar_dry_kg ? `${fmt(Number(r.biochar_dry_kg), 0)} kg` : "—"}
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
          </section>
              {/* Site audits */}
          <section>
            <SectionHeader title="Site audits" />
            {audits.length === 0 ? (
              <EmptyState
                title="No site audits recorded"
                description="Supervisor visits and their findings will be listed here."
              />
            ) : (
              <div className="space-y-3">
                {audits.map((a) => {
                  const photoCount = Array.isArray(a.photos) ? a.photos.length : 0;
                  return (
                    <Card key={a.id}>
                      <CardContent className="pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink tnum">
                            {fmtDate(a.visit_date)}
                          </p>
                          <div className="flex items-center gap-2">
                            {photoCount > 0 && (
                              <Badge tone="neutral">
                                {photoCount} photo{photoCount === 1 ? "" : "s"}
                              </Badge>
                            )}
                            <span className="text-xs text-muted">
                              {a.supervisor_id
                                ? personName.get(a.supervisor_id) ?? "Supervisor"
                                : "Supervisor"}
                            </span>
                          </div>
                        </div>
                        {a.findings ? (
                          <p className="mt-2 text-sm text-ink-soft whitespace-pre-wrap text-pretty">
                            {a.findings}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-muted">No findings noted.</p>
                        )}
                        {Array.isArray(a.photos) && a.photos.length > 0 && (
                          <div className="mt-3">
                            <PhotoGallery
                              photos={(a.photos as string[]).map((p) => ({ storage_path: p, photo_type: "site" }))}
                              bucket={BUCKETS.siteAuditPhotos}
                              columns={3}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
              {/* Side column */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GeoMap points={mapPoints} height={220} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Site details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <DataRow label="Code">{site.code}</DataRow>
                <DataRow label="Region">{site.region ?? "—"}</DataRow>
                <DataRow label="Address">{site.address ?? "—"}</DataRow>
                <DataRow label="Latitude">
                  <span className="tnum">
                    {site.latitude != null ? Number(site.latitude).toFixed(5) : "—"}
                  </span>
                </DataRow>
                <DataRow label="Longitude">
                  <span className="tnum">
                    {site.longitude != null ? Number(site.longitude).toFixed(5) : "—"}
                  </span>
                </DataRow>
                <DataRow label="Supply envelope">{site.supply_envelope ?? "—"}</DataRow>
                <DataRow label="Previous cropping">{site.previous_cropping ?? "—"}</DataRow>
                <DataRow label="Added">{fmtDate(site.created_at)}</DataRow>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionHeader, EmptyState, DataRow } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { GhgBreakdown, type GhgLine } from "@/components/ghg/ghg-breakdown";
import { PrintButton } from "@/components/common/export-button";
import { fmt, fmtCo2, fmtDate, fmtPct, humanize } from "@/lib/utils";
import { HC_ORG, METHODOLOGY, kilnTypeLabel } from "@/lib/methodology";
import { VerificationActions } from "./verification-actions";

export const metadata: Metadata = { title: "Verification package" };

export default async function VerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const supabase = await createClient();

  const { data: verification } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .single();
  if (!verification || verification.project_id !== project.id) notFound();

  const batchId = verification.production_batch_id;

  const [batchRes, ghgRes, labRes, runsRes, findingsRes] = await Promise.all([
    batchId
      ? supabase.from("production_batches").select("*").eq("id", batchId).single()
      : Promise.resolve({ data: null }),
    batchId
      ? supabase
          .from("ghg_quantifications")
          .select("*")
          .eq("production_batch_id", batchId)
          .order("computed_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] }),
    batchId
      ? supabase
          .from("lab_tests")
          .select("*")
          .eq("production_batch_id", batchId)
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] }),
    batchId
      ? supabase.from("kiln_runs").select("id").eq("production_batch_id", batchId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("verification_findings")
      .select("*")
      .eq("verification_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const batch = batchRes.data as
    | { id: string; code: string; kiln_type: string; feedstock_category: string | null; opened_at: string; closed_at: string | null; total_biochar_dry_kg: number; run_count: number; status: string }
    | null;
  const ghg = (ghgRes.data as GhgRow[] | null)?.[0] ?? null;
  const lab = (labRes.data as LabRow[] | null)?.[0] ?? null;
  const runIds = ((runsRes.data as { id: string }[] | null) ?? []).map((r) =>r.id);
  const findings = findingsRes.data ?? [];

  // Run-photo count across the batch's runs.
  let photoCount = 0;
  if (runIds.length > 0) {
    const { count } = await supabase
      .from("run_photos")
      .select("id", { count: "exact", head: true })
      .in("kiln_run_id", runIds);
    photoCount = count ?? 0;
  }

  // Verifier name — separate query (verifications has verifier_id + created_by).
  let verifierName = "Unassigned";
  if (verification.verifier_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", verification.verifier_id)
      .single();
    verifierName = prof?.full_name ?? "Verifier";
  }

  const canDecide =
    ctx.can.canVerify && verification.verifier_id === ctx.profile.id;

  const openFindings = findings.filter((f) =>f.status === "open").length;
  const hc = lab ? Number(lab.hydrogen_carbon_molar_ratio) : null;
  const hcEligible = hc !== null && hc < HC_ORG.maxEligible;

  const period =
    verification.monitoring_period_start && verification.monitoring_period_end
      ? `${fmtDate(verification.monitoring_period_start)} – ${fmtDate(verification.monitoring_period_end)}`
      : "Not specified";

  return (
    <div>
      <PageHeader
        title={`Verification package${batch ? ` · ${batch.code}` : ""}`}
        description={`${humanize(verification.audit_type)} audit · ${METHODOLOGY.id} · monitoring period ${period}`}
      >
        <StatusBadge kind="verification" value={verification.status} />
        <div className="no-print flex items-center gap-2">
          <PrintButton label="Print package" />
        </div>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Evidence package — main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Batch summary */}
          <section>
            <SectionHeader title="Batch under verification" />
            {!batch ? (
              <EmptyState
                title="No batch linked"
              />
            ) : (
              <Card>
                <CardContent className="pt-5">
                  <dl>
                    <DataRow label="Batch">
                      <Link href={`/batches/${batch.id}`} className="text-clay hover:underline">
                        {batch.code}
                      </Link>
                    </DataRow>
                    <DataRow label="Batch status">
                      <StatusBadge kind="batch" value={batch.status} />
                    </DataRow>
                    <DataRow label="Kiln type">{kilnTypeLabel(batch.kiln_type)}</DataRow>
                    <DataRow label="Feedstock">
                      {batch.feedstock_category ? humanize(batch.feedstock_category) : "—"}
                    </DataRow>
                    <DataRow label="Opened">{fmtDate(batch.opened_at)}</DataRow>
                    <DataRow label="Closed">
                      {batch.closed_at ? fmtDate(batch.closed_at) : "—"}
                    </DataRow>
                    <DataRow label="Dry biochar">
                      <span className="tnum">{fmt(Number(batch.total_biochar_dry_kg) / 1000, 2)} t</span>
                    </DataRow>
                  </dl>
                </CardContent>
              </Card>
            )}
          </section>
              {/* GHG result */}
          <section>
            <SectionHeader title="GHG quantification" />
            {!ghg ? (
              <EmptyState
                title="No GHG result"
              />
            ) : (
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                    <div>
                      <p className="text-sm text-muted">Net CO₂ removed</p>
                      <p className="font-display text-3xl text-[#2e7d32] tnum leading-tight">
                        {fmtCo2(Number(ghg.net_co2_removed_tco2e))}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="clay" dot>{humanize(ghg.credit_type)}</Badge>
                      <Badge tone="info">{ghg.durability_years}-yr durability</Badge>
                      <Badge tone="neutral">
                        Permanence {fmt(Number(ghg.permanence_fraction), 3)}
                      </Badge>
                    </div>
                  </div>
                  <GhgBreakdown lines={(ghg.breakdown ?? []) as unknown as GhgLine[]} />
                  <p className="mt-3 text-xs text-muted">
                    Computed {fmtDate(ghg.computed_at)} · functional unit: {ghg.functional_unit}
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
              {/* Lab summary */}
          <section>
            <SectionHeader title="Laboratory results" />
            {!lab ? (
              <EmptyState
                title="No lab test"
              />
            ) : (
              <Card>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-surface/60 p-3 text-center">
                      <p className="font-display text-xl text-ink tnum">{fmtPct(Number(lab.organic_carbon_pct))}</p>
                      <p className="text-xs text-muted mt-0.5">Organic carbon</p>
                    </div>
                    <div className="rounded-lg bg-surface/60 p-3 text-center">
                      <p className="font-display text-xl text-ink tnum">{fmt(hc!, 3)}</p>
                      <p className="text-xs text-muted mt-0.5">H/C_org ratio</p>
                    </div>
                    <div className="rounded-lg bg-surface/60 p-3 text-center">
                      <p className="font-display text-xl text-ink tnum">
                        {lab.ash_content_pct != null ? fmtPct(Number(lab.ash_content_pct)) : "—"}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Ash content</p>
                    </div>
                    <div className="rounded-lg bg-surface/60 p-3 text-center">
                      <p className="font-display text-xl text-ink tnum">
                        {lab.moisture_pct != null ? fmtPct(Number(lab.moisture_pct)) : "—"}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Moisture</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2.5">
                    {hcEligible ? (
                      <Badge tone="ok" dot>Eligible</Badge>
                    ) : (
                      <Badge tone="err" dot>Ineligible</Badge>
                    )}
                    <p className="text-sm text-muted">
                      H/C_org threshold for durable carbon is {HC_ORG.maxEligible}.
                    </p>
                  </div>
                  <dl className="mt-4 border-t border-border pt-1">
                    <DataRow label="Laboratory">{lab.lab_name}</DataRow>
                    <DataRow label="Accreditation">{lab.accreditation ?? "—"}</DataRow>
                    <DataRow label="Sample ID">{lab.sample_id ?? "—"}</DataRow>
                    <DataRow label="Tested">{lab.tested_at ? fmtDate(lab.tested_at) : "—"}</DataRow>
                  </dl>
                </CardContent>
              </Card>
            )}
          </section>
              {/* Evidence counts */}
          <section>
            <SectionHeader title="Evidence chain" />
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 text-center">
                  
                  <p className="mt-2 font-display text-2xl text-ink tnum">{runIds.length}</p>
                  <p className="text-xs text-muted">Kiln runs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 text-center">
                  
                  <p className="mt-2 font-display text-2xl text-ink tnum">{photoCount}</p>
                  <p className="text-xs text-muted">Run photos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 text-center">
                  
                  <p className="mt-2 font-display text-2xl text-ink tnum">{lab ? 1 : 0}</p>
                  <p className="text-xs text-muted">Lab tests</p>
                </CardContent>
              </Card>
            </div>
          </section>
              {/* Findings */}
          <section>
            <SectionHeader title="Findings" />
            {findings.length === 0 ? (
              <EmptyState
                title="No findings raised"
              />
            ) : (
              <Card>
                <CardContent className="pt-5 space-y-3">
                  {findings.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg border border-border bg-surface/40 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge kind="severity" value={f.severity} />
                          <span className="text-sm font-medium text-ink">{humanize(f.category)}</span>
                        </div>
                        <Badge tone={f.status === "resolved" ? "ok" : "warn"} dot>
                          {humanize(f.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-ink-soft text-pretty">{f.description}</p>
                      {f.related_entity && (
                        <p className="mt-1 text-xs text-muted">Related: {f.related_entity}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
              {/* Side column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Verification</CardTitle>
              
            </CardHeader>
            <CardContent>
              <dl>
                <DataRow label="Status">
                  <StatusBadge kind="verification" value={verification.status} />
                </DataRow>
                <DataRow label="Verifier">{verifierName}</DataRow>
                <DataRow label="Audit type">{humanize(verification.audit_type)}</DataRow>
                <DataRow label="Monitoring period">
                  <span className="tnum">{period}</span>
                </DataRow>
                <DataRow label="Open findings">
                  <span className="tnum">{openFindings}</span>
                </DataRow>
                <DataRow label="Requested">{fmtDate(verification.created_at)}</DataRow>
                <DataRow label="Decided">
                  {verification.decided_at ? fmtDate(verification.decided_at) : "—"}
                </DataRow>
              </dl>
              {verification.summary && (
                <p className="mt-3 text-sm text-muted text-pretty">{verification.summary}</p>
              )}
            </CardContent>
          </Card>
              {openFindings > 0 && verification.status !== "rejected" && (
            <div className="no-print flex items-start gap-3 rounded-xl border border-ochre-soft bg-warn-tint px-4 py-3.5">
              
              <p className="text-sm text-[#8a5200]">
                {openFindings} finding{openFindings === 1 ? "" : "s"} still open on this package.
              </p>
            </div>
          )}

          <VerificationActions
            verificationId={verification.id}
            canDecide={canDecide}
            status={verification.status}
            findings={findings.map((f) => ({
              id: f.id,
              category: f.category,
              severity: f.severity,
              description: f.description,
              status: f.status,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

interface GhgRow {
  net_co2_removed_tco2e: number;
  credit_type: string;
  durability_years: number;
  permanence_fraction: number;
  functional_unit: string;
  computed_at: string;
  breakdown: unknown;
}

interface LabRow {
  lab_name: string;
  accreditation: string | null;
  sample_id: string | null;
  organic_carbon_pct: number;
  hydrogen_carbon_molar_ratio: number;
  ash_content_pct: number | null;
  moisture_pct: number | null;
  tested_at: string | null;
}

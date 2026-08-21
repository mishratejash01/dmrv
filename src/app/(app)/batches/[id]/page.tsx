import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionHeader, EmptyState, DataRow } from "@/components/ui/misc";
import { Meter } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableSection, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { GhgBreakdown, type GhgLine } from "@/components/ghg/ghg-breakdown";
import { fmt, fmtCo2, fmtDate, fmtPct, humanize, monthsBetween } from "@/lib/utils";
import { BATCH_LIMITS, HC_ORG, KILN_TYPES, METHODOLOGY } from "@/lib/methodology";
import { BatchActions } from "./batch-actions";

export const metadata: Metadata = { title: "Batch detail" };

const SAMPLE_STAGES = [
  {
    key: "site_pile",
    label: "Site composite piles",
    detail: "Each kiln run contributes a subsample to its site's composite pile.",
  },
  {
    key: "site_sample",
    label: "Site composite samples",
    detail: "Drawn from each site pile when the batch completes.",
  },
  {
    key: "batch_sample",
    label: "Batch representative sample",
    detail: "Combined across sites and sent to an accredited laboratory.",
  },
] as const;

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("production_batches")
    .select("*")
    .eq("id", id)
    .single();
  if (!batch || batch.project_id !== project.id) notFound();

  const [runsRes, samplesRes, labRes, ghgRes, verifRes, sitesRes, verifierMembersRes] =
    await Promise.all([
      supabase
        .from("kiln_runs")
        .select("id, code, status, started_at, peak_temp_c, biochar_dry_kg, operator_id, sites(name), kilns(code)")
        .eq("production_batch_id", id)
        .order("started_at", { ascending: false }),
      supabase
        .from("composite_samples")
        .select("*")
        .eq("production_batch_id", id)
        .order("collected_at", { ascending: true }),
      supabase
        .from("lab_tests")
        .select("*")
        .eq("production_batch_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("ghg_quantifications")
        .select("*")
        .eq("production_batch_id", id)
        .order("computed_at", { ascending: false })
        .limit(1),
      supabase
        .from("verifications")
        .select("id, status, audit_type, verifier_id, created_at")
        .eq("production_batch_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("sites").select("id, name").eq("project_id", project.id),
      supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", project.id)
        .eq("role", "verifier"),
    ]);

  const runs = runsRes.data ?? [];
  const samples = samplesRes.data ?? [];
  const lab = labRes.data?.[0] ?? null;
  const ghg = ghgRes.data?.[0] ?? null;
  const verifications = verifRes.data ?? [];
  const verifierIds = (verifierMembersRes.data ?? []).map((m) => m.user_id);

  // People names — separate query (kiln_runs has two FKs to profiles).
  const peopleIds = Array.from(
    new Set([
      ...runs.map((r) => r.operator_id).filter((x): x is string => !!x),
      ...verifications.map((v) => v.verifier_id).filter((x): x is string => !!x),
      ...verifierIds,
    ]),
  );
  const people = new Map<string, string>();
  if (peopleIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", peopleIds);
    for (const p of profs ?? []) people.set(p.id, p.full_name);
  }

  const siteName = new Map((sitesRes.data ?? []).map((s) => [s.id, s.name]));
  const runCode = new Map(runs.map((r) => [r.id, r.code ?? r.id.slice(0, 8)]));

  // --- Limits -----------------------------------------------------------
  const tonnes = Number(batch.total_biochar_dry_kg) / 1000;
  const age = monthsBetween(batch.opened_at, batch.closed_at ?? undefined);
  const overTonnes = tonnes >= BATCH_LIMITS.maxTonnes;
  const overAge = age >= BATCH_LIMITS.maxMonths;
  const nearTonnes = !overTonnes && tonnes >= BATCH_LIMITS.maxTonnes * BATCH_LIMITS.warnFraction;
  const nearAge = !overAge && age >= BATCH_LIMITS.maxMonths * BATCH_LIMITS.warnFraction;
  const isOpen = batch.status === "open";

  const kilnLabel = KILN_TYPES.find((k) => k.key === batch.kiln_type)?.label ?? humanize(batch.kiln_type);

  // --- Lab eligibility ---------------------------------------------------
  const hc = lab ? Number(lab.hydrogen_carbon_molar_ratio) : null;
  const hcEligible = hc !== null && hc < HC_ORG.maxEligible;
  const hcStrong = hc !== null && hc <= HC_ORG.strongBand;

  return (
    <div>
      <PageHeader
        title={batch.code}
        description={`${kilnLabel}${batch.feedstock_category ? ` · ${humanize(batch.feedstock_category)}` : ""} · opened ${fmtDate(batch.opened_at)}${batch.closed_at ? ` · closed ${fmtDate(batch.closed_at)}` : ""}`}
      >
        <StatusBadge kind="batch" value={batch.status} />
        <BatchActions
          batchId={batch.id}
          projectId={project.id}
          status={batch.status}
          openedAt={batch.opened_at}
          closedAt={batch.closed_at}
          canReview={ctx.can.canReview}
          verifiers={verifierIds.map((vid) => ({ id: vid, name: people.get(vid) ?? "Verifier" }))}
        />
      </PageHeader>
              {/* Over-limit / near-limit warnings */}
      {isOpen && (overTonnes || overAge) && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-err/30 bg-err-tint px-4 py-3.5">
          
          <div>
            <p className="text-sm font-medium text-err">
              {overTonnes && overAge
                ? "Both validity limits reached — this batch must be closed."
                : overTonnes
                  ? `Tonnage limit reached (${fmt(tonnes, 1)} of ${BATCH_LIMITS.maxTonnes} t) — this batch must be closed.`
                  : `Age limit reached (${fmt(age, 1)} of ${BATCH_LIMITS.maxMonths} months) — this batch must be closed.`}
            </p>
            <p className="mt-0.5 text-sm text-err/90">
              Under {METHODOLOGY.id}, a production batch is valid for at most {BATCH_LIMITS.maxMonths}{" "}
              months or {BATCH_LIMITS.maxTonnes} tonnes — whichever comes first. New runs should go
              to a fresh batch.
            </p>
          </div>
        </div>
      )}
      {isOpen && !overTonnes && !overAge && (nearTonnes || nearAge) && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-ochre-soft bg-warn-tint px-4 py-3.5">
          
          <p className="text-sm text-warn">
            This batch is approaching its {nearTonnes && nearAge ? "tonnage and age limits" : nearTonnes ? `${BATCH_LIMITS.maxTonnes}-tonne limit` : `${BATCH_LIMITS.maxMonths}-month limit`}.
            Plan to close it and draw the composite samples soon.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Runs */}
          <section>
            <SectionHeader
              title="Kiln runs"
              action={
                <Link href="/runs" className="text-sm text-clay hover:underline flex items-center gap-1">
                  All runs 
                </Link>
              }
            />
            <TableSection>
              {runs.length === 0 ? (
                <EmptyState
                  title="No runs assigned"
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
                      <TH className="text-right">Peak °C</TH>
                      <TH className="text-right">Dry biochar</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {runs.map((r) => {
                      const site = (r.sites as { name: string } | null)?.name;
                      const kiln = (r.kilns as { code: string } | null)?.code;
                      return (
                        <TR key={r.id}>
                          <TD>
                            <Link href={`/runs/${r.id}`} className="font-medium text-ink hover:text-clay">
                              {r.code ?? r.id.slice(0, 8)}
                            </Link>
                          </TD>
                          <TD className="text-muted">
                            {site} · {kiln}
                          </TD>
                          <TD className="text-muted">
                            {r.operator_id ? people.get(r.operator_id) ?? "—" : "—"}
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
            </TableSection>
          </section>
              {/* Composite sampling chain */}
          <section>
            <SectionHeader title="Composite sampling chain" />
            {samples.length === 0 ? (
              <EmptyState
                title="No composite samples yet"
              />
            ) : (
              <Card>
                <CardContent className="pt-5 space-y-4">
                  {SAMPLE_STAGES.map((stage, idx) => {
                    const rows = samples.filter((s) => s.stage === stage.key);
                    const total = rows.reduce((sum, s) => sum + Number(s.mass_kg || 0), 0);
                    return (
                      <div key={stage.key}>
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <p className="text-sm font-medium text-ink">
                            <span className="text-muted tnum mr-1.5">{idx + 1} ·</span>
                            {stage.label}
                          </p>
                          <p className="text-xs text-muted tnum">
                            {rows.length === 0
                              ? "pending"
                              : `${rows.length} sample${rows.length === 1 ? "" : "s"} · ${fmt(total, 1)} kg`}
                          </p>
                        </div>
                        <p className="text-xs text-muted mb-2">{stage.detail}</p>
                        {rows.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border-strong bg-surface/40 px-3 py-2 text-xs text-muted">
                            Not yet collected.
                          </p>
                        ) : (
                          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                            {rows.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between gap-3 bg-surface/40 px-3 py-2 text-sm"
                              >
                                <span className="text-ink-soft min-w-0 truncate">
                                  {s.site_id
                                    ? siteName.get(s.site_id) ?? "Site"
                                    : s.kiln_run_id
                                      ? `Run ${runCode.get(s.kiln_run_id) ?? s.kiln_run_id.slice(0, 8)}`
                                      : "Batch pile"}
                                </span>
                                <span className="flex items-center gap-3 shrink-0">
                                  <span className="text-muted text-xs">{fmtDate(s.collected_at)}</span>
                                  <span className="tnum text-ink">{fmt(Number(s.mass_kg), 2)} kg</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </section>
              {/* Lab test */}
          <section>
            <SectionHeader
              title="Lab test"
              action={
                lab && (
                  <Link href="/lab" className="text-sm text-clay hover:underline flex items-center gap-1">
                    All tests 
                  </Link>
                )
              }
            />
            {!lab ? (
              <EmptyState
                title="No lab test recorded"
                action={
                  ctx.can.canReview ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href="/lab">Record a lab test</Link>
                    </Button>
                  ) : undefined
                }
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

                  <div className="mt-4 flex items-start gap-2.5">
                    {hcEligible ? (
                      <Badge tone={hcStrong ? "sage" : "ok"} dot>
                        {hcStrong ? "Highly stable" : "Eligible"}
                      </Badge>
                    ) : (
                      <Badge tone="err" dot>Ineligible</Badge>
                    )}
                    <p className="text-sm text-muted text-pretty">
                      {hcEligible
                        ? `H/C_org of ${fmt(hc!, 3)} is below the ${HC_ORG.maxEligible} eligibility threshold${hcStrong ? ` and within the high-permanence band (≤ ${HC_ORG.strongBand})` : ""}.`
                        : `H/C_org must be below ${HC_ORG.maxEligible} to qualify as durable carbon — this batch does not qualify.`}
                    </p>
                  </div>

                  <dl className="mt-4 border-t border-border pt-1">
                    <DataRow label="Laboratory">{lab.lab_name}</DataRow>
                    <DataRow label="Accreditation">{lab.accreditation ?? "—"}</DataRow>
                    <DataRow label="Sample ID">{lab.sample_id ?? "—"}</DataRow>
                    <DataRow label="Tested">{fmtDate(lab.tested_at)}</DataRow>
                    <DataRow label="pH">{lab.ph != null ? fmt(Number(lab.ph), 1) : "—"}</DataRow>
                    <DataRow label="Pollutants">
                      {lab.pollutants_ok == null ? "—" : lab.pollutants_ok ? "Within limits" : "Exceeded"}
                    </DataRow>
                  </dl>
                </CardContent>
              </Card>
            )}
          </section>
              {/* GHG quantification */}
          <section>
            <SectionHeader
              title="GHG quantification"
              action={
                ghg && (
                  <Link href="/ghg" className="text-sm text-clay hover:underline flex items-center gap-1">
                    All quantifications 
                  </Link>
                )
              }
            />
            {!ghg ? (
              <EmptyState
                title="Not yet quantified"
                action={
                  ctx.can.canReview ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href="/ghg">Compute GHG result</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                    <div>
                      <p className="text-sm text-muted">Net CO₂ removed</p>
                      <p className="font-display text-3xl text-ink tnum leading-tight">
                        {fmtCo2(Number(ghg.net_co2_removed_tco2e))}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="clay" dot>{humanize(ghg.credit_type)}</Badge>
                      <Badge tone="info">{ghg.durability_years}-yr durability</Badge>
                      <Badge tone="neutral">
                        Permanence {fmt(Number(ghg.permanence_fraction), 3)}
                      </Badge>
                      <Badge tone="ochre">
                        {humanize(ghg.uncertainty_tier)} uncertainty · −{fmtPct(Number(ghg.uncertainty_discount) * 100, 0)}
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
        </div>
              {/* Side column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validity limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Meter
                  value={tonnes}
                  max={BATCH_LIMITS.maxTonnes}
                  label="Tonnage"
                  caption={`${fmt(tonnes, 1)} / ${BATCH_LIMITS.maxTonnes} t dry`}
                />
                {overTonnes && (
                  <p className="mt-1.5 text-xs text-err">Over the {BATCH_LIMITS.maxTonnes}-tonne limit.</p>
                )}
                {nearTonnes && (
                  <p className="mt-1.5 text-xs text-warn">
                    Past {Math.round(BATCH_LIMITS.warnFraction * 100)}% of the tonnage limit.
                  </p>
                )}
              </div>
              <div>
                <Meter
                  value={age}
                  max={BATCH_LIMITS.maxMonths}
                  label="Age"
                  caption={`${fmt(age, 1)} / ${BATCH_LIMITS.maxMonths} mo`}
                />
                {overAge && (
                  <p className="mt-1.5 text-xs text-err">Over the {BATCH_LIMITS.maxMonths}-month limit.</p>
                )}
                {nearAge && (
                  <p className="mt-1.5 text-xs text-warn">
                    Past {Math.round(BATCH_LIMITS.warnFraction * 100)}% of the age limit.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted text-pretty">
                A production batch is valid for at most {BATCH_LIMITS.maxMonths} months or{" "}
                {BATCH_LIMITS.maxTonnes} tonnes — whichever comes first ({METHODOLOGY.id}).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <DataRow label="Kiln type">{kilnLabel}</DataRow>
                <DataRow label="Feedstock">
                  {batch.feedstock_category ? humanize(batch.feedstock_category) : "—"}
                </DataRow>
                <DataRow label="Temperature profile">{batch.temperature_profile ?? "—"}</DataRow>
                <DataRow label="Opened">{fmtDate(batch.opened_at)}</DataRow>
                <DataRow label="Closed">{batch.closed_at ? fmtDate(batch.closed_at) : "—"}</DataRow>
                <DataRow label="Runs">
                  <span className="tnum">{batch.run_count}</span>
                </DataRow>
                <DataRow label="Dry biochar">
                  <span className="tnum">{fmt(tonnes, 2)} t</span>
                </DataRow>
              </dl>
              {batch.notes && <p className="mt-3 text-sm text-muted text-pretty">{batch.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Verifications</CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-3">
              {verifications.length === 0 ? (
                <p className="text-sm text-muted">
                  No verification requested for this batch yet.
                </p>
              ) : (
                verifications.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/verification/${v.id}`}
                        className="text-sm font-medium text-ink hover:text-clay"
                      >
                        {humanize(v.audit_type)} audit
                      </Link>
                      <p className="text-xs text-muted">
                        {v.verifier_id ? people.get(v.verifier_id) ?? "Assigned" : "Unassigned"} ·{" "}
                        {fmtDate(v.created_at)}
                      </p>
                    </div>
                    <StatusBadge kind="verification" value={v.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

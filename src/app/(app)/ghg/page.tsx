import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronDown16Regular,
  Scales16Regular,
} from "@/components/common/icons";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader, EmptyState } from "@/components/ui/misc";
import { GhgBreakdown, type GhgLine } from "@/components/ghg/ghg-breakdown";
import { fmtCo2, fmt, fmtDate, fmtPct, humanize } from "@/lib/utils";
import { METHODOLOGY } from "@/lib/methodology";
import { GhgCalculator, type GhgCalcBatch } from "./ghg-calculator";
import { EmissionsPanel, type EmissionRow } from "./emissions-panel";
import type { DurabilityPathway } from "@/lib/ghg";

export const metadata: Metadata = { title: "GHG quantification" };

export default async function GhgPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const durabilityYears: DurabilityPathway =
    project.durability_pathway === "years_1000" ? 1000 : 100;

  const [quantsRes, batchesRes] = await Promise.all([
    supabase
      .from("ghg_quantifications")
      .select("*, production_batches!inner(code, project_id)")
      .eq("production_batches.project_id", pid)
      .order("computed_at", { ascending: false }),
    supabase
      .from("production_batches")
      .select(
        "id, code, total_biochar_dry_kg, lab_tests(id, organic_carbon_pct, hydrogen_carbon_molar_ratio, moisture_pct, random_reflectance_pct, created_at)",
      )
      .eq("project_id", pid)
      .order("opened_at", { ascending: false }),
  ]);

  const quants = quantsRes.data ?? [];
  const batchRows = batchesRes.data ?? [];

  // Aggregate logged emissions per batch (so the calculator auto-subtracts
  // transport/processing/capture instead of asking for them again).
  const emissionsByBatch = new Map<
    string,
    { transport: number; processing: number; capture: number }
  >();
  await Promise.all(
    batchRows.map(async (b) => {
      const { data } = await supabase.rpc("fn_batch_emissions", { p_batch: b.id });
      const row = Array.isArray(data) ? data[0] : data;
      emissionsByBatch.set(b.id, {
        transport: Number(row?.transport_tco2e ?? 0),
        processing: Number(row?.processing_tco2e ?? 0),
        capture: Number(row?.capture_tco2e ?? 0),
      });
    }),
  );

  // All logged emission entries, for the panel.
  const { data: emRows } = await supabase
    .from("emissions_entries")
    .select("id, kind, method, description, co2e_kg, production_batch_id, production_batches(code)")
    .eq("project_id", pid)
    .order("created_at", { ascending: false });
  const emEntries: EmissionRow[] = (emRows ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    method: e.method,
    description: e.description,
    co2e_kg: Number(e.co2e_kg),
    production_batch_id: e.production_batch_id,
    batchCode: (e.production_batches as { code: string } | null)?.code ?? null,
  }));

  const calcBatches: GhgCalcBatch[] = batchRows.map((b) => {
    const tests = ([...(b.lab_tests ?? [])] as {
      id: string;
      organic_carbon_pct: number | null;
      hydrogen_carbon_molar_ratio: number | null;
      moisture_pct: number | null;
      random_reflectance_pct: number | null;
      created_at: string;
    }[]).sort((a, c) => (a.created_at < c.created_at ? 1 : -1));
    const lab = tests[0] ?? null;
    const dryTonnes = Number(b.total_biochar_dry_kg) / 1000;
    const moisture = lab?.moisture_pct != null ? Number(lab.moisture_pct) : 0;
    const freshTonnes = moisture > 0 && moisture < 100 ? dryTonnes / (1 - moisture / 100) : dryTonnes;
    const em = emissionsByBatch.get(b.id) ?? { transport: 0, processing: 0, capture: 0 };
    return {
      id: b.id,
      code: b.code,
      freshTonnes: Math.round(freshTonnes * 1000) / 1000,
      soilTempC: Number(project.soil_temp_c),
      durabilityYears,
      labTestId: lab?.id ?? null,
      organicCarbonPct: lab?.organic_carbon_pct != null ? Number(lab.organic_carbon_pct) : null,
      hcOrgRatio:
        lab?.hydrogen_carbon_molar_ratio != null ? Number(lab.hydrogen_carbon_molar_ratio) : null,
      moisturePct: lab?.moisture_pct != null ? Number(lab.moisture_pct) : null,
      reflectancePct: lab?.random_reflectance_pct != null ? Number(lab.random_reflectance_pct) : null,
      captureTco2e: em.capture,
      processingTco2e: em.processing,
      transportTco2e: em.transport,
    };
  });

  return (
    <div>
      <PageHeader
        title="GHG quantification"
        description={`Net CO₂ removal computed as a comparative life-cycle assessment per ${METHODOLOGY.lcaStandard}. Functional unit: ${METHODOLOGY.functionalUnit}.`}
      />

      {calcBatches.length === 0 ? (
        <EmptyState
          icon={<Scales16Regular />}
          title="No batches to quantify yet"
          description="Open a production batch and record its lab results, then the calculator can quantify net CO₂ removal here."
        />
      ) : (
        <GhgCalculator batches={calcBatches} canCompute={ctx.can.canReview} />
      )}

      <div className="mt-4 rounded-xl border border-border bg-surface/40 px-4 py-3.5 text-sm text-muted text-pretty">
        Removal is quantified transparently: gross biochar carbon removal (permanence fraction ×
        C_org × dry mass × 3.67) minus baseline storage, project and transport emissions, then an
        uncertainty discount. Every intermediate value is shown so the figure is auditable, never a
        black box.
      </div>

      <EmissionsPanel
        projectId={pid}
        batches={calcBatches.map((b) => ({ id: b.id, code: b.code }))}
        entries={emEntries}
        canManage={ctx.can.canReview}
      />

      <div className="mt-10">
        <SectionHeader title="Saved quantifications" />
        {quants.length === 0 ? (
          <EmptyState
            icon={<Scales16Regular />}
            title="No quantifications saved"
            description="Use the calculator above to compute and persist a batch's net CO₂ removal."
          />
        ) : (
          <div className="space-y-3">
            {quants.map((q) => {
              const batchCode =
                (q.production_batches as { code: string } | null)?.code ?? "—";
              const lines = (q.breakdown ?? []) as unknown as GhgLine[];
              return (
                <Card key={q.id}>
                  <CardContent className="pt-0">
                    <details className="group">
                      <summary className="flex flex-wrap items-center justify-between gap-3 py-4 cursor-pointer list-none">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/batches/${q.production_batch_id}`}
                              className="font-medium text-ink hover:text-clay"
                            >
                              {batchCode}
                            </Link>
                            <Badge tone="clay">{humanize(q.credit_type)}</Badge>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            Computed {fmtDate(q.computed_at)} · {q.durability_years}-yr durability ·
                            permanence {fmt(Number(q.permanence_fraction), 3)} · −
                            {fmtPct(Number(q.uncertainty_discount) * 100, 0)} uncertainty
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-display text-xl text-[#2e7d32] tnum leading-tight">
                              {fmtCo2(Number(q.net_co2_removed_tco2e))}
                            </p>
                            <p className="text-xs text-muted">net removed</p>
                          </div>
                          <ChevronDown16Regular className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
                        </div>
                      </summary>
                      <div className="pb-4">
                        <GhgBreakdown lines={lines} />
                        <p className="mt-3 text-xs text-muted">
                          Functional unit: {q.functional_unit} · {METHODOLOGY.lcaStandard}
                        </p>
                      </div>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

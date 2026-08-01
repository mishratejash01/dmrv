"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/actions/errors";
import { getUser } from "@/lib/auth";
import { quantify, type DurabilityPathway, type UncertaintyTier } from "@/lib/ghg";
import type { Json } from "@/lib/types/database";

// ----------------------------- Lab tests -----------------------------
export async function addLabTest(input: {
  production_batch_id: string;
  lab_name: string;
  accreditation?: string;
  sample_id?: string;
  organic_carbon_pct: number;
  hydrogen_carbon_molar_ratio: number;
  ash_content_pct?: number;
  moisture_pct?: number;
  ph?: number;
  inertinite_pct?: number;
  random_reflectance_pct?: number;
  pollutants_ok?: boolean;
  stability_notes?: string;
  tested_at?: string;
}) {
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("lab_tests")
    .insert({ ...input, recorded_by: user?.id ?? null });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/lab");
  revalidatePath(`/batches/${input.production_batch_id}`);
  return { ok: true };
}

// ----------------------------- GHG quantification -----------------------------
export async function computeGhg(input: {
  production_batch_id: string;
  lab_test_id?: string | null;
  credit_type?: "removal" | "avoidance";
  durability_years: DurabilityPathway;
  biocharFreshTonnes: number;
  moistureFraction: number;
  organicCarbonFraction: number;
  hcOrgRatio: number;
  soilTempC: number;
  captureEmissions?: number;
  transformationEmissions?: number;
  transportEmissions?: number;
  reflectanceFraction?: number;
  residualCarbonFraction?: number;
  feedstockDryTonnes?: number;
  feedstockCarbonFraction?: number;
  applyBaselineDiscount?: boolean;
  uncertaintyTier?: UncertaintyTier;
}) {
  const user = await getUser();
  const supabase = await createClient();

  // A batch that has already been issued must not be re-quantified (its credits
  // reference this figure).
  const { count: issuedCount } = await supabase
    .from("rcc_issuances")
    .select("id", { count: "exact", head: true })
    .eq("production_batch_id", input.production_batch_id);
  if ((issuedCount ?? 0) > 0) {
    return { error: "This batch already has an issuance — its quantification is locked." };
  }

  const result = quantify({
    biocharFreshTonnes: input.biocharFreshTonnes,
    moistureFraction: input.moistureFraction,
    organicCarbonFraction: input.organicCarbonFraction,
    hcOrgRatio: input.hcOrgRatio,
    soilTempC: input.soilTempC,
    durabilityYears: input.durability_years,
    reflectanceFraction: input.reflectanceFraction,
    residualCarbonFraction: input.residualCarbonFraction,
    captureEmissions: input.captureEmissions,
    transformationEmissions: input.transformationEmissions,
    transportEmissions: input.transportEmissions,
    feedstockDryTonnes: input.feedstockDryTonnes,
    feedstockCarbonFraction: input.feedstockCarbonFraction,
    applyBaselineDiscount: input.applyBaselineDiscount,
    uncertaintyTier: input.uncertaintyTier,
  });

  // Permanence eligibility gate (H/C_org < 0.7) enforced on save, not just shown.
  if (!result.eligible) {
    return {
      error:
        "Batch is ineligible: H/C_org must be below 0.7 and net removal positive under a low/medium uncertainty tier. Nothing was saved.",
    };
  }

  // One active quantification per batch (unique on production_batch_id) — upsert
  // supersedes any prior draft so totals never double-count.
  const { data, error } = await supabase
    .from("ghg_quantifications")
    .upsert(
      {
        production_batch_id: input.production_batch_id,
        lab_test_id: input.lab_test_id ?? null,
        credit_type: input.credit_type ?? "removal",
        durability_years: input.durability_years,
        biochar_fresh_t: input.biocharFreshTonnes,
        moisture_fraction: input.moistureFraction,
        dry_t: result.dryTonnes,
        organic_carbon_fraction: input.organicCarbonFraction,
        hc_org_ratio: input.hcOrgRatio,
        soil_temp_c: input.soilTempC,
        permanence_fraction: result.permanenceFraction,
        gross_removal_tco2e: result.grossRemoval,
        baseline_removal_tco2e: result.baselineRemoval,
        project_emissions_tco2e: result.projectEmissions,
        transport_emissions_tco2e: result.transportEmissions,
        uncertainty_tier: input.uncertaintyTier ?? "low",
        uncertainty_discount: result.uncertaintyDiscount,
        net_before_discount_tco2e: result.netBeforeDiscount,
        net_co2_removed_tco2e: result.netCo2Removed,
        eligible: result.eligible,
        breakdown: result.lines as unknown as Json,
        computed_by: user?.id ?? null,
      },
      { onConflict: "production_batch_id" },
    )
    .select("id")
    .single();

  if (error) return { error: friendlyError(error) };
  revalidatePath("/ghg");
  revalidatePath(`/batches/${input.production_batch_id}`);
  return { ok: true, id: data?.id, result };
}

// ----------------------------- End-use -----------------------------
export async function addEndUse(input: {
  project_id: string;
  production_batch_id?: string | null;
  quantity_kg: number;
  application_method: string;
  recipient_name?: string;
  recipient_contact?: string;
  latitude?: number | null;
  longitude?: number | null;
  applied_at?: string;
  proof_paths?: string[];
  notes?: string;
}) {
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from("end_use_records").insert({
    ...input,
    proof_paths: input.proof_paths ?? [],
    recorded_by: user?.id ?? null,
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/end-use");
  return { ok: true };
}

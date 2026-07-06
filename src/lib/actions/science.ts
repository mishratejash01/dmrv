"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  if (error) return { error: error.message };
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
  uncertaintyTier?: UncertaintyTier;
}) {
  const user = await getUser();
  const supabase = await createClient();

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
    uncertaintyTier: input.uncertaintyTier,
  });

  const { data, error } = await supabase
    .from("ghg_quantifications")
    .insert({
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
      breakdown: result.lines as unknown as Json,
      computed_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
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
  if (error) return { error: error.message };
  revalidatePath("/end-use");
  return { ok: true };
}

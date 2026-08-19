"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { friendlyError } from "@/lib/actions/errors";

type EmissionKind = "transport" | "processing" | "capture";
type EmissionMethod = "distance" | "fuel";

/**
 * Record a project/transport/processing emission. Logged once here (with the
 * exact emission factor), then summed into the GHG quantification by
 * fn_batch_emissions — so the GHG page never re-asks for these numbers.
 */
export async function addEmissionsEntry(input: {
  project_id: string;
  production_batch_id?: string | null;
  feedstock_batch_id?: string | null;
  kind: EmissionKind;
  method: EmissionMethod;
  description?: string | null;
  distance_km?: number | null;
  weight_t?: number | null;
  fuel_type?: string | null;
  fuel_qty?: number | null;
  emission_factor: number;
}) {
  const supabase = await createClient();
  const user = await getUser();
  const { error } = await supabase
    .from("emissions_entries")
    .insert({ ...input, recorded_by: user?.id ?? null });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/ghg");
  return { ok: true };
}

export async function deleteEmissionsEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("emissions_entries").delete().eq("id", id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/ghg");
  return { ok: true };
}

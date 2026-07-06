"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FeedstockCategory, KilnType } from "@/lib/types/db";

// ----------------------------- Sites & kilns -----------------------------
export async function addSite(input: {
  project_id: string;
  name: string;
  code: string;
  latitude?: number | null;
  longitude?: number | null;
  region?: string;
  address?: string;
  supply_envelope?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({ ...input, status: "active" });
  if (error) return { error: error.message };
  revalidatePath("/sites");
  return { ok: true };
}

export async function addKiln(input: {
  project_id: string;
  site_id: string;
  name: string;
  code: string;
  kiln_type: KilnType;
  capacity_kg?: number | null;
  sop_reference?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("kilns").insert({ ...input, status: "active" });
  if (error) return { error: error.message };
  revalidatePath("/sites");
  return { ok: true };
}

export async function assignOperatorToSite(siteId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("site_assignments").insert({ site_id: siteId, user_id: userId });
  if (error) return { error: error.message };
  revalidatePath("/sites");
  revalidatePath("/team");
  return { ok: true };
}

// ----------------------------- Feedstock -----------------------------
export async function addApprovedFeedstock(input: {
  project_id: string;
  name: string;
  category: FeedstockCategory;
  carbon_fraction: number;
  forestry_certification?: string;
  proof_method?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("approved_feedstocks").insert({ ...input, active: true });
  if (error) return { error: error.message };
  revalidatePath("/feedstock");
  return { ok: true };
}

export async function addFeedstockDelivery(input: {
  project_id: string;
  site_id?: string | null;
  approved_feedstock_id?: string | null;
  source: string;
  category: FeedstockCategory;
  weight_kg: number;
  moisture_pct: number;
  source_area_description?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("feedstock_batches").insert(input);
  if (error) return { error: error.message };
  revalidatePath("/feedstock");
  return { ok: true };
}

// ----------------------------- Production batches -----------------------------
export async function createBatch(input: {
  project_id: string;
  kiln_type: KilnType;
  feedstock_category?: FeedstockCategory | null;
  temperature_profile?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("production_batches")
    .select("*", { count: "exact", head: true })
    .eq("project_id", input.project_id);
  const code = `PB-${year}-${String((count ?? 0) + 1).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("production_batches")
    .insert({ ...input, code, status: "open" })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/batches");
  return { ok: true, id: data?.id };
}

export async function setBatchStatus(
  batchId: string,
  status: "open" | "closed" | "testing" | "verified",
) {
  const supabase = await createClient();
  const { error } =
    status === "closed"
      ? await supabase
          .from("production_batches")
          .update({ status, closed_at: new Date().toISOString() })
          .eq("id", batchId)
      : await supabase.from("production_batches").update({ status }).eq("id", batchId);
  if (error) return { error: error.message };
  revalidatePath("/batches");
  revalidatePath(`/batches/${batchId}`);
  return { ok: true };
}

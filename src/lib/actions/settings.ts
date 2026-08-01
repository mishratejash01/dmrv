"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/actions/errors";
import { getUser, getProfile } from "@/lib/auth";

export async function updateProfile(input: {
  full_name?: string;
  phone?: string;
  organization?: string;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name,
      phone: input.phone ?? null,
      organization: input.organization ?? null,
    })
    .eq("id", user.id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProject(
  projectId: string,
  input: {
    name?: string;
    region?: string;
    description?: string;
    soil_temp_c?: number;
    buffer_pool_pct?: number;
    durability_pathway?: "years_100" | "years_1000";
    status?: "draft" | "active" | "closed";
  },
) {
  const profile = await getProfile();
  if (!profile) return { error: "Not authenticated" };
  const supabase = await createClient();
  // RLS proj_update requires project_developer; enforced by the database.
  const { error } = await supabase.from("projects").update(input).eq("id", projectId);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

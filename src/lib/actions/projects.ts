"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { friendlyError } from "@/lib/actions/errors";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/auth";

export interface CreateProjectInput {
  name: string;
  country_code: string;
  region: string;
  durability_pathway: "years_100" | "years_1000";
  soil_temp_c: number;
  buffer_pool_pct: number;
  description?: string;
}

/**
 * Create a project and make the caller its Project Developer.
 * Uses the service role (server-only) so the first membership row can be written
 * before any project-scoped policy could grant the caller access.
 */
export async function createProject(input: CreateProjectInput) {
  const user = await getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { count } = await admin.from("projects").select("*", { count: "exact", head: true });
  const code = `P${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: project, error } = await admin
    .from("projects")
    .insert({
      name: input.name,
      code,
      developer_id: user.id,
      country_code: input.country_code.toUpperCase().slice(0, 2),
      region: input.region,
      durability_pathway: input.durability_pathway,
      soil_temp_c: input.soil_temp_c,
      buffer_pool_pct: input.buffer_pool_pct,
      description: input.description ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error || !project) {
    return { error: friendlyError(error, "Could not create project") };
  }

  await admin
    .from("project_members")
    .insert({ project_id: project.id, user_id: user.id, role: "project_developer" });

  const store = await cookies();
  store.set(ACTIVE_PROJECT_COOKIE, project.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { ok: true, projectId: project.id };
}

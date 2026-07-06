"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import type { ProjectRole } from "@/lib/types/db";

/** Ensure the caller can manage this project's team (developer or super admin). */
async function assertCanManage(projectId: string) {
  const profile = await getProfile();
  if (!profile) return false;
  if (profile.global_role === "super_admin") return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", profile.id)
    .eq("role", "project_developer")
    .maybeSingle();
  return !!data;
}

export async function inviteMember(input: {
  project_id: string;
  email: string;
  full_name?: string;
  role: ProjectRole;
}) {
  if (!(await assertCanManage(input.project_id))) return { error: "Not authorised" };
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  let userId = existing?.id;
  let tempPassword: string | undefined;

  if (!userId) {
    tempPassword = `Acres-${Math.random().toString(36).slice(2, 9)}`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: input.full_name || email.split("@")[0] },
    });
    if (error) return { error: error.message };
    userId = created.user.id;
  }

  const { error: mErr } = await admin
    .from("project_members")
    .insert({ project_id: input.project_id, user_id: userId, role: input.role });
  if (mErr && !mErr.message.toLowerCase().includes("duplicate")) return { error: mErr.message };

  revalidatePath("/team");
  return { ok: true, tempPassword, email };
}

export async function removeMember(membershipId: string, projectId: string) {
  if (!(await assertCanManage(projectId))) return { error: "Not authorised" };
  const admin = createAdminClient();
  const { error } = await admin.from("project_members").delete().eq("id", membershipId);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return { ok: true };
}

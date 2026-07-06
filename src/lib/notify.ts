import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectRole } from "@/lib/types/db";

/** Insert a notification for a user (uses service role so cross-user notifies work). */
export async function notify(params: {
  userId: string;
  projectId?: string | null;
  type?: "review_request" | "batch_limit" | "verification_status" | "issuance" | "end_use" | "info";
  title: string;
  body?: string;
  link?: string;
}) {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: params.userId,
    project_id: params.projectId ?? null,
    type: params.type ?? "info",
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
  });
}

/** Notify every member of a project that holds one of the given roles. */
export async function notifyProjectRoles(params: {
  projectId: string;
  roles: ProjectRole[];
  title: string;
  body?: string;
  link?: string;
  type?: "review_request" | "batch_limit" | "verification_status" | "issuance" | "end_use" | "info";
}) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", params.projectId)
    .in("role", params.roles);
  const userIds = [...new Set((data ?? []).map((m) => m.user_id))];
  if (userIds.length === 0) return;
  await admin.from("notifications").insert(
    userIds.map((uid) => ({
      user_id: uid,
      project_id: params.projectId,
      type: params.type ?? "info",
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
    })),
  );
}

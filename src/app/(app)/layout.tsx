import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { PROJECT_ROLE_LABEL, GLOBAL_ROLE_LABEL } from "@/lib/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  if (!ctx.activeProject) redirect("/onboarding");

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", ctx.profile.id)
    .eq("read", false);

  const roleLabel = ctx.can.isSuperAdmin
    ? GLOBAL_ROLE_LABEL.super_admin
    : ctx.can.isRegistry
      ? GLOBAL_ROLE_LABEL.registry_admin
      : ctx.projectRoles.length > 0
        ? PROJECT_ROLE_LABEL[ctx.projectRoles[0]]
        : "Member";

  return (
    <AppShell
      profile={{
        full_name: ctx.profile.full_name,
        email: ctx.profile.email,
        organization: ctx.profile.organization,
      }}
      projects={ctx.projects.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
      activeProjectId={ctx.activeProject.id}
      can={ctx.can}
      roleLabel={roleLabel}
      unreadCount={count ?? 0}
    >
      {children}
    </AppShell>
  );
}

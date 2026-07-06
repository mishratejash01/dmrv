import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Project, ProjectRole, GlobalRole } from "@/lib/types/db";

export const ACTIVE_PROJECT_COOKIE = "dmrv_project";

/** The authenticated auth.users record (or null). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The current user's profile (or null). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
});

/** Projects the user can access (memberships; registry/super see all). */
export const getAccessibleProjects = cache(async (): Promise<Project[]> => {
  const profile = await getProfile();
  if (!profile) return [];
  const supabase = await createClient();
  // RLS already scopes this: members see theirs, registry/super see all.
  const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: true });
  return data ?? [];
});

export interface AppCapabilities {
  isSuperAdmin: boolean;
  isRegistry: boolean;
  isDeveloper: boolean;
  isSupervisor: boolean;
  isOperator: boolean;
  isVerifier: boolean;
  canReview: boolean;
  canOperate: boolean;
  canVerify: boolean;
  canIssue: boolean;
  canManageProject: boolean;
}

export interface AppContext {
  profile: Profile;
  projects: Project[];
  activeProject: Project | null;
  projectRoles: ProjectRole[];
  globalRole: GlobalRole;
  can: AppCapabilities;
}

/** Resolve the active project from cookie, else the first accessible project. */
async function resolveActiveProject(projects: Project[]): Promise<Project | null> {
  if (projects.length === 0) return null;
  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;
  return projects.find((p) => p.id === wanted) ?? projects[0];
}

/** Full app context — redirects to /login if unauthenticated. */
export const getAppContext = cache(async (): Promise<AppContext> => {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const projects = await getAccessibleProjects();
  const activeProject = await resolveActiveProject(projects);

  let projectRoles: ProjectRole[] = [];
  if (activeProject) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", activeProject.id)
      .eq("user_id", profile.id);
    projectRoles = (data ?? []).map((r) => r.role);
  }

  const globalRole = profile.global_role;
  const isSuperAdmin = globalRole === "super_admin";
  const isRegistry = globalRole === "registry_admin" || isSuperAdmin;
  const isDeveloper = projectRoles.includes("project_developer") || isSuperAdmin;
  const isSupervisor = projectRoles.includes("kiln_supervisor");
  const isOperator = projectRoles.includes("kiln_operator");
  const isVerifier = projectRoles.includes("verifier") || isSuperAdmin;

  const can: AppCapabilities = {
    isSuperAdmin,
    isRegistry,
    isDeveloper,
    isSupervisor,
    isOperator,
    isVerifier,
    canReview: isDeveloper || isSupervisor,
    canOperate: isOperator || isDeveloper || isSupervisor,
    canVerify: isVerifier,
    canIssue: isRegistry,
    canManageProject: isDeveloper,
  };

  return { profile, projects, activeProject, projectRoles, globalRole, can };
});

/** Guard for pages: returns context or redirects. */
export async function requireContext() {
  return getAppContext();
}

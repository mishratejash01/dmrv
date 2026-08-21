import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, SectionHeader, EmptyState, Stat } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableSection, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PROJECT_ROLE_LABEL } from "@/lib/nav";
import { fmtDate } from "@/lib/utils";
import type { ProjectRole } from "@/lib/types/db";
import {
  InviteMemberDialog,
  AssignOperatorDialog,
  RemoveMemberButton,
  type OperatorOption,
  type SiteOption,
} from "./team-actions";

export const metadata: Metadata = { title: "Team & roles" };

const ROLE_TONE: Record<string, "clay" | "sage" | "ochre" | "info"> = {
  project_developer: "clay",
  kiln_supervisor: "sage",
  kiln_operator: "ochre",
  verifier: "info",
};

export default async function TeamPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const supabase = await createClient();
  const canManage = ctx.can.canManageProject;

  const [membersRes, sitesRes] = await Promise.all([
    supabase
      .from("project_members")
      .select("id, user_id, role, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
    supabase.from("sites").select("id, name, code").eq("project_id", project.id).order("name"),
  ]);

  const members = membersRes.data ?? [];
  const sites = sitesRes.data ?? [];

  // Fetch profile names/emails separately to avoid ambiguous embeds.
  const userIds = Array.from(new Set(members.map((m) => m.user_id)));
  const profilesRes = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email, organization").in("id", userIds)
    : { data: [] };
  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [
      p.id,
      { full_name: p.full_name, email: p.email, organization: p.organization },
    ]),
  );

  // Site assignments per operator (site_id → name, then user_id → site labels).
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const assignRes = sites.length
    ? await supabase
        .from("site_assignments")
        .select("id, site_id, user_id")
        .in("site_id", sites.map((s) => s.id))
    : { data: [] };
  const sitesByUser = new Map<string, string[]>();
  for (const a of assignRes.data ?? []) {
    const site = siteById.get(a.site_id);
    if (!site) continue;
    const list = sitesByUser.get(a.user_id) ?? [];
    list.push(site.code);
    sitesByUser.set(a.user_id, list);
  }

  const roleCount = (role: ProjectRole) => members.filter((m) => m.role === role).length;

  const operators: OperatorOption[] = Array.from(
    new Map(
      members
        .filter((m) => m.role === "kiln_operator")
        .map((m) => {
          const p = profileById.get(m.user_id);
          return [m.user_id, { id: m.user_id, full_name: p?.full_name ?? "Unknown", email: p?.email ?? "" }];
        }),
    ).values(),
  );
  const siteOptions: SiteOption[] = sites.map((s) => ({ id: s.id, name: s.name, code: s.code }));

  return (
    <div>
      <PageHeader
        title="Team & roles"
        description={`People with access to ${project.name}, and the duties they hold.`}
      >
        {canManage && (
          <>
            <AssignOperatorDialog sites={siteOptions} operators={operators} />
            <InviteMemberDialog projectId={project.id} />
          </>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Developers" value={roleCount("project_developer")} tone="clay" />
        <Stat label="Supervisors" value={roleCount("kiln_supervisor")} tone="sage" />
        <Stat label="Operators" value={roleCount("kiln_operator")} tone="ochre" />
        <Stat label="Verifiers" value={roleCount("verifier")} tone="info" />
      </div>
              {/* Separation of duties note */}
      <Card className="mb-4 border-sage-soft bg-sage-tint/40">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sage-tint text-sage">
              
            </span>
            <div>
              <p className="font-display text-base text-ink">Separation of duties</p>
              <p className="mt-1 text-sm text-ink-soft text-pretty max-w-3xl">
                The people who <span className="font-medium">produce</span>biochar — kiln operators —
                are kept strictly separate from those who <span className="font-medium">review and
                report</span>the data: supervisors, developers and independent verifiers. This
                separation prevents conflicts of interest and keeps every carbon claim credible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionHeader title="Members" />
      <TableSection>
        {members.length === 0 ? (
          <EmptyState
            title="No members yet"
            description={
              canManage
                ? "Invite your first team member to start building the project team."
                : "This project has no members assigned yet."
            }
            className="border-0"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Member</TH>
                <TH>Role</TH>
                <TH>Sites</TH>
                <TH>Since</TH>
                {canManage && <TH className="text-right">Actions</TH>}
              </TR>
            </THead>
            <TBody>
              {members.map((m) => {
                const p = profileById.get(m.user_id);
                const name = p?.full_name ?? "Unknown";
                const assigned = sitesByUser.get(m.user_id) ?? [];
                const roleLabel = PROJECT_ROLE_LABEL[m.role] ?? m.role;
                return (
                  <TR key={m.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={name} size={32} />
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{name}</p>
                          <p className="text-xs text-muted truncate">
                            {p?.email}
                            {p?.organization ? ` · ${p.organization}` : ""}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={ROLE_TONE[m.role] ?? "neutral"}>{roleLabel}</Badge>
                    </TD>
                    <TD className="text-muted">
                      {m.role === "kiln_operator"
                        ? assigned.length
                          ? assigned.join(", ")
                          : "— unassigned —"
                        : "—"}
                    </TD>
                    <TD className="text-muted tnum">{fmtDate(m.created_at)}</TD>
                    {canManage && (
                      <TD className="text-right">
                        <RemoveMemberButton
                          membershipId={m.id}
                          projectId={project.id}
                          name={name}
                          roleLabel={roleLabel}
                        />
                      </TD>
                    )}
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableSection>
              {!canManage && (
        <p className="mt-4 text-xs text-muted">
          You are viewing the team in read-only mode. Only project developers can invite or remove
          members.
        </p>
      )}
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Stat } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableSection, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fmt, fmtDate, humanize } from "@/lib/utils";
import { NewVerification } from "./new-verification";

export const metadata: Metadata = { title: "Verification" };

export default async function VerificationPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [verifsRes, batchesRes, verifierMembersRes] = await Promise.all([
    supabase
      .from("verifications")
      .select("*, production_batches(code)")
      .eq("project_id", pid)
      .order("created_at", { ascending: false }),
    supabase
      .from("production_batches")
      .select("id, code, status")
      .eq("project_id", pid)
      .order("opened_at", { ascending: false }),
    supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", pid)
      .eq("role", "verifier"),
  ]);

  const verifications = verifsRes.data ?? [];
  const batches = batchesRes.data ?? [];
  const verifierIds = (verifierMembersRes.data ?? []).map((m) => m.user_id);

  // Verifier names — separate query (verifications has verifier_id + created_by).
  const people = new Map<string, string>();
  const peopleIds = Array.from(
    new Set([
      ...verifications.map((v) => v.verifier_id).filter((x): x is string => !!x),
      ...verifierIds,
    ]),
  );
  if (peopleIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", peopleIds);
    for (const p of profs ?? []) people.set(p.id, p.full_name);
  }

  const pending = verifications.filter((v) => v.status === "assigned" || v.status === "in_review");
  const approved = verifications.filter((v) => v.status === "approved");

  // Batches eligible to verify — closed or testing (not open, not already verified).
  const verifiableBatches = batches.filter((b) => b.status !== "open");

  return (
    <div>
      <PageHeader
        title="Verification"
      >
        {ctx.can.canReview && (
          <NewVerification
            projectId={pid}
            batches={verifiableBatches.map((b) => ({ id: b.id, code: b.code }))}
            verifiers={verifierIds.map((id) => ({ id, name: people.get(id) ?? "Verifier" }))}
          />
        )}
      </PageHeader>
              {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Stat label="Verifications" value={fmt(verifications.length, 0)} tone="clay" hint="All monitoring periods" />
        <Stat label="In progress" value={fmt(pending.length, 0)} tone="ochre" hint="Assigned or in review" />
        <Stat label="Approved" value={fmt(approved.length, 0)} tone="sage" hint="Cleared for issuance" />
      </div>

      <TableSection>
        {verifications.length === 0 ? (
          <EmptyState
            title="No verifications yet"
            description={
              ctx.can.canReview
                ? "Request a verification for a closed batch to have its evidence chain independently audited."
                : "Verifications assigned to you will appear here."
            }
            className="border-0"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Batch</TH>
                <TH>Verifier</TH>
                <TH>Monitoring period</TH>
                <TH>Audit</TH>
                <TH>Status</TH>
                <TH className="text-right"></TH>
              </TR>
            </THead>
            <TBody>
              {verifications.map((v) => {
                const batchCode = (v.production_batches as { code: string } | null)?.code;
                return (
                  <TR key={v.id}>
                    <TD className="font-medium">
                      <Link href={`/verification/${v.id}`} className="text-ink hover:text-clay">
                        {batchCode ?? "—"}
                      </Link>
                    </TD>
                    <TD className="text-muted">
                      {v.verifier_id ? people.get(v.verifier_id) ?? "Assigned" : "Unassigned"}
                    </TD>
                    <TD className="text-muted tnum">
                      {v.monitoring_period_start && v.monitoring_period_end
                        ? `${fmtDate(v.monitoring_period_start)} – ${fmtDate(v.monitoring_period_end)}`
                        : "—"}
                    </TD>
                    <TD className="text-muted">{humanize(v.audit_type)}</TD>
                    <TD>
                      <StatusBadge kind="verification" value={v.status} />
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/verification/${v.id}`}
                        className="text-sm text-ink hover:text-clay transition-colors inline-flex items-center gap-1"
                      >
                        Open 
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableSection>
    </div>
  );
}

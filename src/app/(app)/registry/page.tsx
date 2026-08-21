import Link from "next/link";
import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat, PageHeader, SectionHeader, EmptyState, DataRow } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableSection, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CopyButton } from "@/components/common/copy-button";
import { ExportCsvButton } from "@/components/common/export-button";
import { fmt, fmtDate, humanize } from "@/lib/utils";
import { CREDIT_STATUS_META } from "@/lib/rcc";
import {
  InitiateIssuanceButton,
  ApproveIssuanceButton,
  RetireCreditDialog,
  TransferCreditDialog,
} from "./registry-actions";

export const metadata: Metadata = { title: "Credit registry" };

export default async function RegistryPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [batchesRes, ghgRes, issuancesRes, creditsRes, bufferRes] = await Promise.all([
    supabase
      .from("production_batches")
      .select("id, code, status")
      .eq("project_id", pid),
    supabase
      .from("ghg_quantifications")
      .select(
        "id, credit_type, net_co2_removed_tco2e, computed_at, production_batch_id, production_batches!inner(project_id, code, status)",
      )
      .eq("production_batches.project_id", pid)
      .order("computed_at", { ascending: false }),
    supabase
      .from("rcc_issuances")
      .select("*")
      .eq("project_id", pid)
      .order("created_at", { ascending: false }),
    supabase
      .from("rcc_credits")
      .select("*")
      .eq("project_id", pid)
      .order("created_at", { ascending: true }),
    supabase.from("buffer_pool_ledger").select("contribution_tco2e").eq("project_id", pid),
  ]);

  const ghg = ghgRes.data ?? [];
  const issuances = issuancesRes.data ?? [];
  const credits = creditsRes.data ?? [];

  // Issuable = GHG quantifications for VERIFIED batches that have no issuance yet.
  const issuedGhgIds = new Set(
    issuances.map((i) => i.ghg_quantification_id).filter((x): x is string => !!x),
  );
  const issuable = ghg.filter((g) => {
    const batch = g.production_batches as { status: string } | null;
    return batch?.status === "verified" && !issuedGhgIds.has(g.id);
  });

  const batchCode = new Map((batchesRes.data ?? []).map((b) => [b.id, b.code]));

  // Ledger metrics.
  const issued = credits.filter((c) => c.status === "issued" || c.status === "transferred").length;
  const retired = credits.filter((c) => c.status === "retired").length;
  const bufferCredits = credits.filter((c) => c.status === "buffer").length;
  const bufferBal = (bufferRes.data ?? []).reduce(
    (s, r) => s + Number(r.contribution_tco2e || 0),
    0,
  );

  const csvRows = credits.map((c) => ({
    serial_number: c.serial_number,
    credit_type: c.credit_type,
    vintage: c.vintage,
    geography: c.geography,
    status: c.status,
    current_holder: c.current_holder ?? "",
    created_at: c.created_at,
  }));

  return (
    <div>
      <PageHeader title="Credit registry">
        <Button asChild variant="secondary">
          <Link href="/registry/buffer">
             Buffer pool
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/registry-public" target="_blank">
            Public registry 
          </Link>
        </Button>
      </PageHeader>
              {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Credits issued" value={fmt(issued, 0)} unit="RCCs" tone="clay" hint={`${credits.length} minted total`} />
        <Stat label="Retired" value={fmt(retired, 0)} unit="RCCs" tone="sage" hint="Locked to beneficiaries" />
        <Stat label="Buffer pool" value={fmt(bufferBal, 0)} unit="tCO₂e" tone="info" hint={`${bufferCredits} credits held`} />
        <Stat label="Awaiting issuance" value={fmt(issuable.length, 0)} unit="batches" tone="ochre" hint="Verified & quantified" />
      </div>
              {/* 1 · Issuable */}
      <section className="mb-10">
        <SectionHeader title="Ready to issue" />
        <TableSection>
          {issuable.length === 0 ? (
            <EmptyState
              title="Nothing awaiting issuance"
              className="border-0"
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Batch</TH>
                  <TH>Type</TH>
                  <TH className="text-right">Net CO₂ removed</TH>
                  <TH>Quantified</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {issuable.map((g) => {
                  const b = g.production_batches as { code: string } | null;
                  return (
                    <TR key={g.id}>
                      <TD>
                        <Link
                          href={`/batches/${g.production_batch_id}`}
                          className="font-medium text-ink hover:text-clay"
                        >
                          {b?.code ?? g.production_batch_id.slice(0, 8)}
                        </Link>
                      </TD>
                      <TD>
                        <Badge tone="clay" dot>{humanize(g.credit_type)}</Badge>
                      </TD>
                      <TD className="text-right tnum">
                        {fmt(Number(g.net_co2_removed_tco2e), 1)} tCO₂e
                      </TD>
                      <TD className="text-muted">{fmtDate(g.computed_at)}</TD>
                      <TD className="text-right">
                        <div className="flex justify-end">
                          <InitiateIssuanceButton ghgId={g.id} canIssue={ctx.can.canIssue} />
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </TableSection>
        {!ctx.can.canIssue && issuable.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            Only registry admins may initiate and approve issuances.
          </p>
        )}
      </section>
              {/* 2 · Issuances */}
      <section className="mb-10">
        <SectionHeader title="Issuances" />
        <TableSection>
          {issuances.length === 0 ? (
            <EmptyState
              title="No issuances yet"
              className="border-0"
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Batch</TH>
                  <TH>Vintage</TH>
                  <TH>Type</TH>
                  <TH className="text-right">Gross</TH>
                  <TH className="text-right">Buffer</TH>
                  <TH className="text-right">Net</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {issuances.map((i) => (
                  <TR key={i.id}>
                    <TD>
                      {i.production_batch_id ? (
                        <Link
                          href={`/batches/${i.production_batch_id}`}
                          className="font-medium text-ink hover:text-clay"
                        >
                          {batchCode.get(i.production_batch_id) ?? i.production_batch_id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TD>
                    <TD className="tnum">{i.vintage}</TD>
                    <TD>{humanize(i.credit_type)}</TD>
                    <TD className="text-right tnum">{fmt(Number(i.gross_tco2e), 0)}</TD>
                    <TD className="text-right tnum text-ochre">{fmt(Number(i.buffer_tco2e), 0)}</TD>
                    <TD className="text-right tnum font-medium text-ink">
                      {fmt(Number(i.net_issued_tco2e), 0)}
                    </TD>
                    <TD>
                      <StatusBadge kind="issuance" value={i.status} />
                    </TD>
                    <TD className="text-right">
                      {i.status !== "issued" ? (
                        <div className="flex justify-end">
                          <ApproveIssuanceButton
                            issuanceId={i.id}
                            canIssue={ctx.can.canIssue}
                            selfInitiated={!!i.initiated_by && i.initiated_by === ctx.profile.id}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted">{fmtDate(i.issued_at)}</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </TableSection>
      </section>
              {/* 3 · Credit ledger */}
      <section>
        <SectionHeader
          title="Credit ledger"
          action={<ExportCsvButton rows={csvRows} filename={`rcc-credits-${project.code}`} />}
        />
        <TableSection>
          {credits.length === 0 ? (
            <EmptyState
              title="No credits minted"
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Serial number</TH>
                    <TH>Type</TH>
                    <TH>Vintage</TH>
                    <TH>Status</TH>
                    <TH>Holder</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {credits.map((c) => {
                    const meta = CREDIT_STATUS_META[c.status] ?? {
                      label: humanize(c.status),
                      tone: "neutral" as const,
                    };
                    return (
                      <TR key={c.id}>
                        <TD>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/registry/${encodeURIComponent(c.serial_number)}`}
                              className="font-mono text-xs text-ink hover:text-clay"
                            >
                              {c.serial_number}
                            </Link>
                            <CopyButton value={c.serial_number} />
                          </div>
                        </TD>
                        <TD>{humanize(c.credit_type)}</TD>
                        <TD className="tnum">{c.vintage}</TD>
                        <TD>
                          <Badge tone={meta.tone} dot>{meta.label}</Badge>
                        </TD>
                        <TD className="text-muted">{c.current_holder ?? "—"}</TD>
                        <TD className="text-right">
                          {ctx.can.canIssue && c.status !== "retired" && c.status !== "buffer" ? (
                            <div className="flex justify-end gap-2">
                              <TransferCreditDialog
                                creditId={c.id}
                                serial={c.serial_number}
                                currentHolder={c.current_holder}
                                canIssue={ctx.can.canIssue}
                              />
                              <RetireCreditDialog
                                creditId={c.id}
                                serial={c.serial_number}
                                canIssue={ctx.can.canIssue}
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </TableSection>
              {/* Serial format legend */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Serial number format</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-mono text-sm text-ink">
              RCC-BIO-<span className="text-clay">CC</span>-<span className="text-clay">PROJECT</span>-<span className="text-clay">VINTAGE</span>-<span className="text-clay">RMV|AVD</span>-<span className="text-clay">NNNNNN</span>
            </p>
            <dl className="mt-3">
              <DataRow label="RCC · BIO">Rainbow Carbon Credit · biochar asset class</DataRow>
              <DataRow label="CC">ISO country code (geography) — e.g. IN</DataRow>
              <DataRow label="PROJECT">Short project code — {project.code}</DataRow>
              <DataRow label="VINTAGE">Crediting year — e.g. {new Date().getFullYear()}</DataRow>
              <DataRow label="RMV | AVD">Mechanism — removal or avoidance</DataRow>
              <DataRow label="NNNNNN">Zero-padded sequence, unique per project · mechanism · vintage</DataRow>
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

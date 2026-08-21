import Link from "next/link";
import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat, PageHeader, SectionHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fmt, fmtDate, humanize } from "@/lib/utils";
import { BUFFER_POOL } from "@/lib/methodology";

export const metadata: Metadata = { title: "Buffer pool" };

export default async function BufferPoolPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [ledgerRes, bufferCreditsRes] = await Promise.all([
    supabase
      .from("buffer_pool_ledger")
      .select("*")
      .eq("project_id", pid)
      .order("created_at", { ascending: false }),
    supabase
      .from("rcc_credits")
      .select("id", { count: "exact", head: true })
      .eq("project_id", pid)
      .eq("status", "buffer"),
  ]);

  const ledger = ledgerRes.data ?? [];
  const totalBuffer = ledger.reduce((s, r) =>s + Number(r.contribution_tco2e || 0), 0);
  const heldCredits = bufferCreditsRes.count ?? 0;
  const pct = Math.round(BUFFER_POOL.minFraction * 100);

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/registry"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-clay"
        >
           Registry
        </Link>
      </div>

      <PageHeader
        title="Buffer pool"
        description="A shared reversal-insurance reserve held under the Rainbow Standard. A minimum share of every removal issuance is set aside here so reversals can be covered across all projects."
      />
              {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Stat
          label="Buffer balance"
          value={fmt(totalBuffer, 0)}
          unit="tCO₂e"
          tone="info"
          hint="This project's contribution"
        />
        <Stat
          label="Credits held"
          value={fmt(heldCredits, 0)}
          unit="RCCs"
          tone="ochre"
          hint="Status: buffer"
        />
        <Stat
          label="Minimum rate"
          value={fmt(pct, 0)}
          unit="%"
          tone="sage"
          hint="Of verified removals"
        />
      </div>
              {/* Explainer */}
      <Card className="mb-8">
        <CardHeader className="flex-row items-center gap-2">
          
          <CardTitle>How reversal insurance works</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted text-pretty">
            Under the Rainbow Standard, at least{" "}
            <span className="font-medium text-ink">{pct}%</span>of every batch&rsquo;s verified
            removal credits are transferred into the buffer pool at issuance instead of being handed
            to the developer. If sequestered carbon is later reversed — for example biochar that
            fails to persist — buffered credits are cancelled to make the atmosphere whole, so no
            retired credit is ever left unbacked. The contribution is rounded up to whole credits
            and is non-tradeable while held.
          </p>
        </CardContent>
      </Card>
              {/* Ledger */}
      <section>
        <SectionHeader title="Buffer ledger" />
        <Card>
          {ledger.length === 0 ? (
            <EmptyState
              title="No buffer contributions yet"
              description={`Once a removal issuance is approved, ${pct}% of its credits are recorded here.`}
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Project</TH>
                    <TH>Reason</TH>
                    <TH className="text-right">Contribution</TH>
                    <TH className="text-right">Balance after</TH>
                  </TR>
                </THead>
                <TBody>
                  {ledger.map((r) => (
                    <TR key={r.id}>
                      <TD className="text-muted">{fmtDate(r.created_at)}</TD>
                      <TD>{r.project_id === pid ? project.code : "—"}</TD>
                      <TD className="text-muted">{humanize(r.reason)}</TD>
                      <TD className="text-right tnum text-ochre">
                        +{fmt(Number(r.contribution_tco2e), 0)} tCO₂e
                      </TD>
                      <TD className="text-right tnum font-medium text-ink">
                        {fmt(Number(r.balance_after), 0)} tCO₂e
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

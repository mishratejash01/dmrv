import type { Metadata } from "next";
import { Coins, ArrowLeftRight, Archive, Wallet, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, SectionHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fmt, fmtDate, humanize } from "@/lib/utils";
import { CREDIT_STATUS_META } from "@/lib/rcc";

export const metadata: Metadata = {
  title: "Rainbow Registry — Public ledger",
  description: "Public transparency ledger of serialised Rainbow Carbon Credits.",
};

export default async function RegistryPublicPage() {
  const supabase = await createClient();

  const [creditsRes, bufferRes] = await Promise.all([
    supabase
      .from("rcc_credits")
      .select("id, serial_number, credit_type, vintage, geography, status, current_holder, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("buffer_pool_ledger").select("contribution_tco2e"),
  ]);

  const credits = creditsRes.data ?? [];
  const issued = credits.filter((c) => c.status === "issued" || c.status === "transferred").length;
  const retired = credits.filter((c) => c.status === "retired").length;
  const bufferCredits = credits.filter((c) => c.status === "buffer").length;
  const bufferBal = (bufferRes.data ?? []).reduce(
    (s, r) => s + Number(r.contribution_tco2e || 0),
    0,
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl text-ink leading-tight text-balance">
          Public credit registry
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm md:text-base text-muted text-pretty">
          Every Rainbow Carbon Credit is minted as a serialised, one-tonne unit tied to a verified
          batch of distributed open-kiln biochar. This ledger is open for anyone to inspect.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Credits on ledger" value={fmt(credits.length, 0)} unit="RCCs" icon={<Coins />} tone="clay" />
        <Stat label="Live / transferred" value={fmt(issued, 0)} unit="RCCs" icon={<ArrowLeftRight />} tone="info" />
        <Stat label="Retired" value={fmt(retired, 0)} unit="RCCs" icon={<Archive />} tone="sage" hint="Permanently claimed" />
        <Stat label="Buffer pool" value={fmt(bufferBal, 0)} unit="tCO₂e" icon={<Wallet />} tone="ochre" hint={`${bufferCredits} credits`} />
      </div>

      {/* Transparency note */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-sage-soft bg-sage-tint/40 px-4 py-3.5">
        <ShieldCheck className="h-5 w-5 text-sage shrink-0 mt-0.5" />
        <p className="text-sm text-[#5c6a4c] text-pretty">
          Retired credits are locked to a beneficiary and can never be reused. A share of every
          removal issuance is held in a shared buffer pool as reversal insurance. Serial numbers
          encode the geography, project, vintage and mechanism of each credit.
        </p>
      </div>

      {/* Ledger */}
      <section>
        <SectionHeader title="Credit ledger" />
        <Card>
          {credits.length === 0 ? (
            <EmptyState
              icon={<Coins />}
              title="No credits issued yet"
              description="Issued Rainbow Carbon Credits will appear here as they are minted."
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
                    <TH>Geography</TH>
                    <TH>Status</TH>
                    <TH>Holder</TH>
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
                          <span className="font-mono text-xs text-ink">{c.serial_number}</span>
                        </TD>
                        <TD>{humanize(c.credit_type)}</TD>
                        <TD className="tnum">{c.vintage}</TD>
                        <TD>{c.geography}</TD>
                        <TD>
                          <Badge tone={meta.tone} dot>{meta.label}</Badge>
                        </TD>
                        <TD className="text-muted">{c.current_holder ?? "—"}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, DataRow, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/common/copy-button";
import { fmtDateTime, fmtDate, humanize } from "@/lib/utils";
import { parseSerial, CREDIT_STATUS_META } from "@/lib/rcc";

export const metadata: Metadata = { title: "Credit detail" };

// Full literal classes (Tailwind can't see dynamically-built `text-${tone}`).
const TONE_TEXT: Record<string, string> = {
  clay: "text-clay",
  sage: "text-sage",
  ochre: "text-ochre",
  info: "text-info",
  err: "text-err",
};

const TXN_META: Record<
  string,
  { label: string; tone: "clay" | "sage" | "ochre" | "info" | "err" }
> = {
  issue: { label: "Issued", tone: "info" },
  transfer: { label: "Transferred", tone: "clay" },
  retire: { label: "Retired", tone: "sage" },
  buffer: { label: "Buffered", tone: "ochre" },
  cancel: { label: "Cancelled", tone: "err" },
};

export default async function CreditDetailPage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial: rawSerial } = await params;
  const serial = decodeURIComponent(rawSerial);
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data: credit } = await supabase
    .from("rcc_credits")
    .select("*")
    .eq("serial_number", serial)
    .maybeSingle();
  if (!credit) notFound();

  const parsed = parseSerial(credit.serial_number);

  const [txnRes, issuanceRes] = await Promise.all([
    supabase
      .from("credit_transactions")
      .select("*")
      .eq("credit_id", credit.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("rcc_issuances")
      .select("id, production_batch_id, vintage, credit_type")
      .eq("id", credit.issuance_id)
      .maybeSingle(),
  ]);
  const txns = txnRes.data ?? [];
  const issuance = issuanceRes.data ?? null;

  const meta = CREDIT_STATUS_META[credit.status] ?? {
    label: humanize(credit.status),
    tone: "neutral" as const,
    description: "",
  };

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
        title={<span className="font-mono text-xl md:text-2xl">{credit.serial_number}</span>}
        description={meta.description}
      >
        <Badge tone={meta.tone} dot>{meta.label}</Badge>
        <CopyButton value={credit.serial_number} label="Copy serial" />
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Lifecycle timeline */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lifecycle</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {txns.length === 0 ? (
                <EmptyState
                  title="No transactions recorded"
                  className="border-0"
                />
              ) : (
                <ol className="relative border-l border-border pl-6 space-y-4 py-1">
                  {txns.map((t) => {
                    const tm = TXN_META[t.txn_type] ?? {
                      label: humanize(t.txn_type),
                      tone: "info" as const,
                    };
                    return (
                      <li key={t.id} className="relative">
                        <span
                          className={`absolute -left-[2.1rem] grid h-7 w-7 place-items-center rounded-full border border-border bg-elevated ${TONE_TEXT[tm.tone] ?? "text-info"}`}
                        >
                        </span>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-ink">{tm.label}</p>
                          <p className="text-xs text-muted tnum">{fmtDateTime(t.created_at)}</p>
                        </div>
                        <div className="mt-1 text-sm text-muted space-y-0.5">
                          {t.from_holder && (
                            <p>
                              From <span className="text-ink-soft">{t.from_holder}</span>
                            </p>
                          )}
                          {t.to_holder && (
                            <p>
                              To <span className="text-ink-soft">{t.to_holder}</span>
                            </p>
                          )}
                          {t.notes && <p className="text-pretty">{t.notes}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
              {/* Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Credit</CardTitle>
              
            </CardHeader>
            <CardContent>
              <dl>
                <DataRow label="Status">
                  <Badge tone={meta.tone} dot>{meta.label}</Badge>
                </DataRow>
                <DataRow label="Type">{humanize(credit.credit_type)}</DataRow>
                <DataRow label="Vintage">
                  <span className="tnum">{credit.vintage}</span>
                </DataRow>
                <DataRow label="Geography">{credit.geography}</DataRow>
                <DataRow label="Current holder">{credit.current_holder ?? "—"}</DataRow>
                {credit.status === "retired" && (
                  <>
                    <DataRow label="Retired reason">{credit.retired_reason ?? "—"}</DataRow>
                    <DataRow label="Retired at">{fmtDate(credit.retired_at)}</DataRow>
                  </>
                )}
                <DataRow label="Minted">{fmtDate(credit.created_at)}</DataRow>
              </dl>
            </CardContent>
          </Card>
              {parsed.valid && (
            <Card>
              <CardHeader>
                <CardTitle>Decoded serial</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  <DataRow label="Registry · asset">
                    {parsed.registry} · {parsed.asset}
                  </DataRow>
                  <DataRow label="Country">{parsed.country}</DataRow>
                  <DataRow label="Project">{parsed.project}</DataRow>
                  <DataRow label="Vintage">
                    <span className="tnum">{parsed.vintage}</span>
                  </DataRow>
                  <DataRow label="Mechanism">
                    {parsed.mechanismLabel} ({parsed.mechanism})
                  </DataRow>
                  <DataRow label="Sequence">
                    <span className="tnum">{parsed.sequence}</span>
                  </DataRow>
                </dl>
              </CardContent>
            </Card>
          )}

          {issuance?.production_batch_id && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm text-muted mb-2">Traceable to production batch</p>
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/batches/${issuance.production_batch_id}`}>View source batch</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

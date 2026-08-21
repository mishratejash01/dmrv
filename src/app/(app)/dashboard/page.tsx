import Link from "next/link";
import type { Metadata } from "next";
import {
  Scales16Regular,
  Ribbon16Regular,
  Fire16Regular,
  ArrowUpRight16Regular,
  CheckboxChecked16Regular,
  Wallet16Regular,
  BoxMultipleRegular,
} from "@/components/common/icons";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, PageHeader, SectionHeader, EmptyState } from "@/components/ui/misc";
import { Meter } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Map } from "@/components/map/map";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fmt, fmtDate, fmtCo2 } from "@/lib/utils";
import { monthsBetween } from "@/lib/utils";
import { BATCH_LIMITS } from "@/lib/methodology";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [sitesRes, kilnsRes, runsRes, ghgRes, creditsRes, bufferRes, batchesRes, pendingRes] =
    await Promise.all([
      supabase.from("sites").select("id, name, code, latitude, longitude, region").eq("project_id", pid),
      supabase.from("kilns").select("id", { count: "exact", head: true }).eq("project_id", pid),
      supabase
        .from("kiln_runs")
        .select("id, code, status, started_at, biochar_dry_kg, sites(name), kilns(code)")
        .eq("project_id", pid)
        .order("started_at", { ascending: false })
        .limit(7),
      supabase
        .from("ghg_quantifications")
        .select("net_co2_removed_tco2e, production_batches!inner(project_id)")
        .eq("production_batches.project_id", pid),
      supabase.from("rcc_credits").select("status").eq("project_id", pid),
      supabase.from("buffer_pool_ledger").select("contribution_tco2e").eq("project_id", pid),
      supabase.from("production_batches").select("*").eq("project_id", pid).order("opened_at", { ascending: false }),
      supabase.from("kiln_runs").select("id", { count: "exact", head: true }).eq("project_id", pid).eq("status", "submitted"),
    ]);

  const sites = sitesRes.data ?? [];
  const runs = runsRes.data ?? [];
  const ghg = ghgRes.data ?? [];
  const credits = creditsRes.data ?? [];
  const batches = batchesRes.data ?? [];

  const netCo2 = ghg.reduce((s, r) => s + Number(r.net_co2_removed_tco2e || 0), 0);
  const dryKg = batches.reduce((s, b) => s + Number(b.total_biochar_dry_kg || 0), 0);
  const issued = credits.filter((c) => c.status === "issued" || c.status === "transferred").length;
  const retired = credits.filter((c) => c.status === "retired").length;
  const bufferBal = (bufferRes.data ?? []).reduce((s, r) => s + Number(r.contribution_tco2e || 0), 0);
  const openBatches = batches.filter((b) => b.status === "open");

  const mapPoints = sites
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      id: s.id,
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      label: s.name,
      sublabel: s.region ?? undefined,
      tone: "clay" as const,
    }));

  return (
    <div>
      <PageHeader
        title={project.name}
        description={[project.region, project.methodology, `${project.status} project`].filter(Boolean).join(" · ")}
      >
        {ctx.can.canOperate && (
          <Button asChild>
            <Link href="/field">
              <Fire16Regular className="h-4 w-4" /> Log a kiln run
            </Link>
          </Button>
        )}
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        <Stat label="Net CO₂ removed" value={fmt(netCo2, 1)} unit="tCO₂e" icon={<Scales16Regular />} tone="sage" hint="Across quantified batches" />
        <Stat label="RCCs issued" value={fmt(issued, 0)} unit="credits" icon={<Ribbon16Regular />} tone="clay" hint={`${retired} retired`} />
        <Stat label="Biochar produced" value={fmt(dryKg / 1000, 1)} unit="t dry" icon={<BoxMultipleRegular />} tone="ochre" hint={`${batches.length} batches`} />
        <Stat label="Buffer pool" value={fmt(bufferBal, 0)} unit="tCO₂e" icon={<Wallet16Regular />} tone="info" hint="Reversal insurance" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Map */}
        <section className="lg:col-span-2">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Sites &amp; operations</h2>
            <Link href="/sites" className="text-sm text-clay hover:underline flex items-center gap-1">
              All sites <ArrowUpRight16Regular className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Card className="overflow-hidden">
          <CardContent className="pt-5">
            <Map points={mapPoints} height={340} />
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface/60 py-2.5">
                <p className="font-display text-xl text-ink tnum">{sites.length}</p>
                <p className="text-xs text-muted">Sites</p>
              </div>
              <div className="rounded-lg bg-surface/60 py-2.5">
                <p className="font-display text-xl text-ink tnum">{kilnsRes.count ?? 0}</p>
                <p className="text-xs text-muted">Kilns</p>
              </div>
              <div className="rounded-lg bg-surface/60 py-2.5">
                <p className="font-display text-xl text-ink tnum">{pendingRes.count ?? 0}</p>
                <p className="text-xs text-muted">Awaiting review</p>
              </div>
            </div>
          </CardContent>
          </Card>
        </section>

        {/* Batch progress + review */}
        <div className="space-y-5">
          <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Open batches</h2>
            <Link href="/batches" className="text-sm text-clay hover:underline">All</Link>
          </div>
          <Card>
            <CardContent className="space-y-4 pt-5">
              {openBatches.length === 0 && (
                <p className="text-sm text-muted">No open batches. Every batch is closed or verified.</p>
              )}
              {openBatches.map((b) => {
                const tonnes = Number(b.total_biochar_dry_kg) / 1000;
                const age = monthsBetween(b.opened_at);
                return (
                  <div key={b.id}>
                    <Link href={`/batches/${b.id}`} className="text-sm font-medium text-ink hover:text-clay">
                      {b.code}
                    </Link>
                    <div className="mt-2 space-y-2">
                      <Meter value={tonnes} max={BATCH_LIMITS.maxTonnes} label="Tonnage" caption={`${fmt(tonnes, 1)} / ${BATCH_LIMITS.maxTonnes} t`} />
                      <Meter value={age} max={BATCH_LIMITS.maxMonths} label="Age" caption={`${fmt(age, 1)} / ${BATCH_LIMITS.maxMonths} mo`} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          </section>

          {ctx.can.canReview && (
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-ochre-tint text-ochre">
                    <CheckboxChecked16Regular className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-lg text-ink tnum">{pendingRes.count ?? 0}</p>
                    <p className="text-sm text-muted">Runs awaiting your review</p>
                  </div>
                </div>
                <Button asChild variant="secondary" className="w-full mt-4">
                  <Link href="/review">Open review queue</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent runs */}
      <div className="mt-5">
        <SectionHeader
          title="Recent kiln runs"
          action={<Link href="/runs" className="text-sm text-clay hover:underline">View all</Link>}
        />
        <Card>
          {runs.length === 0 ? (
            <EmptyState title="No kiln runs yet" description="Runs logged in the field will appear here." className="border-0" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Run</TH>
                  <TH>Site / Kiln</TH>
                  <TH>Date</TH>
                  <TH className="text-right">Dry biochar</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {runs.map((r) => {
                  const site = (r.sites as { name: string } | null)?.name;
                  const kiln = (r.kilns as { code: string } | null)?.code;
                  return (
                    <TR key={r.id}>
                      <TD>
                        <Link href={`/runs/${r.id}`} className="font-medium text-ink hover:text-clay">
                          {r.code ?? r.id.slice(0, 8)}
                        </Link>
                      </TD>
                      <TD className="text-muted">{[site, kiln].filter(Boolean).join(" · ") || "—"}</TD>
                      <TD className="text-muted">{fmtDate(r.started_at)}</TD>
                      <TD className="text-right tnum">{r.biochar_dry_kg ? `${fmt(Number(r.biochar_dry_kg), 0)} kg` : "—"}</TD>
                      <TD><StatusBadge kind="run" value={r.status} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

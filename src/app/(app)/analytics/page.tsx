import type { Metadata } from "next";
import {
  DataBarVertical16Regular,
  BoxMultipleRegular,
  Scales16Regular,
  Ribbon16Regular,
  Wallet16Regular,
} from "@/components/common/icons";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat, PageHeader, EmptyState } from "@/components/ui/misc";
import { AreaTrend, BarSeries, Donut, CHART_COLORS } from "@/components/charts/charts";
import { ExportCsvButton } from "@/components/common/export-button";
import { fmt, fmtDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

/** Warm colours per credit status for the donut. */
const STATUS_COLOR: Record<string, string> = {
  issued: "#1668b3",
  verified: "#57a773",
  transferred: "#06805a",
  retired: "#2e7d32",
  buffer: "#b26b00",
  cancelled: "#b3261e",
};

export default async function AnalyticsPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [runsRes, sitesRes, creditsRes, ghgRes, bufferRes] = await Promise.all([
    supabase
      .from("kiln_runs")
      .select("started_at, biochar_dry_kg, site_id")
      .eq("project_id", pid)
      .eq("status", "approved"),
    supabase.from("sites").select("id, name, code").eq("project_id", pid),
    supabase.from("rcc_credits").select("status").eq("project_id", pid),
    supabase
      .from("ghg_quantifications")
      .select("net_co2_removed_tco2e, production_batches!inner(code, project_id)")
      .eq("production_batches.project_id", pid),
    supabase.from("buffer_pool_ledger").select("contribution_tco2e").eq("project_id", pid),
  ]);

  const runs = (runsRes.data ?? []) as {
    started_at: string | null;
    biochar_dry_kg: number | null;
    site_id: string | null;
  }[];
  const sites = (sitesRes.data ?? []) as { id: string; name: string; code: string }[];
  const credits = (creditsRes.data ?? []) as { status: string }[];
  const ghg = (ghgRes.data ?? []) as {
    net_co2_removed_tco2e: number;
    production_batches: { code: string } | { code: string }[] | null;
  }[];
  const buffer = (bufferRes.data ?? []) as { contribution_tco2e: number }[];

  // --- Monthly biochar dry mass (tonnes) --------------------------------
  const monthMap = new Map<string, number>();
  for (const r of runs) {
    if (!r.started_at || r.biochar_dry_kg == null) continue;
    const d = new Date(r.started_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + Number(r.biochar_dry_kg));
  }
  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, kg]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      });
      return { month: label, tonnes: Number((kg / 1000).toFixed(2)) };
    });

  // --- Production by site (tonnes) --------------------------------------
  const siteName = new Map(sites.map((s) => [s.id, s.name]));
  const siteMap = new Map<string, number>();
  for (const r of runs) {
    if (r.biochar_dry_kg == null) continue;
    const name = r.site_id ? siteName.get(r.site_id) ?? "Unknown" : "Unassigned";
    siteMap.set(name, (siteMap.get(name) ?? 0) + Number(r.biochar_dry_kg));
  }
  const bySite = Array.from(siteMap.entries())
    .map(([site, kg]) => ({ site, tonnes: Number((kg / 1000).toFixed(2)) }))
    .sort((a, b) => b.tonnes - a.tonnes);

  // --- Credits by status ------------------------------------------------
  const statusMap = new Map<string, number>();
  for (const c of credits) statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1);
  const creditsByStatus = Array.from(statusMap.entries()).map(([status, value], i) => ({
    name: humanize(status),
    value,
    color: STATUS_COLOR[status] ?? CHART_COLORS[i % CHART_COLORS.length],
  }));

  // --- Net tCO₂e per batch ----------------------------------------------
  const batchMap = new Map<string, number>();
  for (const g of ghg) {
    const pb = Array.isArray(g.production_batches)
      ? g.production_batches[0]
      : g.production_batches;
    const code = pb?.code ?? "—";
    batchMap.set(code, (batchMap.get(code) ?? 0) + Number(g.net_co2_removed_tco2e || 0));
  }
  const netPerBatch = Array.from(batchMap.entries())
    .map(([batch, net]) => ({ batch, net: Number(net.toFixed(1)) }))
    .sort((a, b) => b.net - a.net);

  // --- Totals -----------------------------------------------------------
  const totalDryT = runs.reduce((s, r) => s + Number(r.biochar_dry_kg || 0), 0) / 1000;
  const totalNet = ghg.reduce((s, g) => s + Number(g.net_co2_removed_tco2e || 0), 0);
  const totalCredits = credits.length;
  const bufferBal = buffer.reduce((s, b) => s + Number(b.contribution_tco2e || 0), 0);

  const exportRows = monthly.map((m) => ({ month: m.month, dry_tonnes: m.tonnes }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={`Production, carbon, and registry trends for ${project.name}.`}
      >
        <ExportCsvButton
          rows={exportRows}
          filename={`acres-dmrv-analytics-${new Date().toISOString().slice(0, 10)}`}
          label="Export monthly"
        />
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat
          label="Biochar produced"
          value={fmt(totalDryT, 1)}
          unit="t dry"
          icon={<BoxMultipleRegular />}
          tone="ochre"
          hint={`${runs.length} kiln runs`}
        />
        <Stat
          label="Net CO₂ removed"
          value={fmt(totalNet, 1)}
          unit="tCO₂e"
          icon={<Scales16Regular />}
          tone="sage"
          hint={`${netPerBatch.length} quantified batches`}
        />
        <Stat
          label="Credits"
          value={fmt(totalCredits, 0)}
          unit="RCCs"
          icon={<Ribbon16Regular />}
          tone="clay"
          hint={`${creditsByStatus.length} status types`}
        />
        <Stat
          label="Buffer pool"
          value={fmt(bufferBal, 0)}
          unit="tCO₂e"
          icon={<Wallet16Regular />}
          tone="info"
          hint="Reversal insurance"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Monthly production trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <DataBarVertical16Regular className="h-4 w-4 text-clay" />
              <CardTitle>Monthly biochar production</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <EmptyState
                title="No production yet"
                description="Dry biochar mass appears here once kiln runs are logged with a start date."
                className="border-0"
              />
            ) : (
              <AreaTrend data={monthly} xKey="month" dataKey="tonnes" unit=" t" height={280} />
            )}
          </CardContent>
        </Card>

        {/* Credits by status */}
        <Card>
          <CardHeader>
            <CardTitle>Credits by status</CardTitle>
          </CardHeader>
          <CardContent>
            {creditsByStatus.length === 0 ? (
              <EmptyState
                title="No credits issued"
                description="Issued credits will break down here by lifecycle status."
                className="border-0"
              />
            ) : (
              <>
                <Donut data={creditsByStatus} height={220} />
                <ul className="mt-4 space-y-2">
                  {creditsByStatus.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: c.color }}
                        />
                        <span className="text-ink-soft truncate">{c.name}</span>
                      </span>
                      <span className="tnum text-ink">{fmt(c.value, 0)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* Production by site */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Production by site</CardTitle>
          </CardHeader>
          <CardContent>
            {bySite.length === 0 ? (
              <EmptyState
                title="No site production yet"
                description="Dry biochar mass per site appears here as runs are recorded."
                className="border-0"
              />
            ) : (
              <BarSeries data={bySite} xKey="site" dataKey="tonnes" unit=" t" height={280} />
            )}
          </CardContent>
        </Card>

        {/* Net CO₂ per batch */}
        <Card>
          <CardHeader>
            <CardTitle>Net tCO₂e per batch</CardTitle>
          </CardHeader>
          <CardContent>
            {netPerBatch.length === 0 ? (
              <EmptyState
                title="No quantified batches"
                description="Net removals per batch appear here once GHG results are computed."
                className="border-0"
              />
            ) : (
              <BarSeries
                data={netPerBatch}
                xKey="batch"
                dataKey="net"
                color="#2e7d32"
                unit=" tCO₂e"
                height={280}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

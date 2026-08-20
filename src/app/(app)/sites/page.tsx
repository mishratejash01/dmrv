import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowUpRight16Regular,
  Fire16Regular,
  Location16Regular,
} from "@/components/common/icons";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Map as GeoMap } from "@/components/map/map";
import { humanize, timeAgo } from "@/lib/utils";
import { SiteForms } from "./site-forms";
import { DeviceManager, type DeviceRow } from "./device-manager";

export const metadata: Metadata = { title: "Sites" };

export default async function SitesPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [sitesRes, kilnsRes, runsRes, devicesRes] = await Promise.all([
    supabase.from("sites").select("*").eq("project_id", pid).order("name"),
    supabase.from("kilns").select("id, site_id, name").eq("project_id", pid).order("name"),
    supabase.from("kiln_runs").select("id, site_id").eq("project_id", pid),
    // key_hash is deliberately never selected — only the prefix is shown.
    supabase
      .from("ingest_devices")
      .select("id, label, kiln_id, active, key_prefix, last_seen_at")
      .eq("project_id", pid)
      .order("created_at", { ascending: false }),
  ]);

  const sites = sitesRes.data ?? [];
  const kilns = kilnsRes.data ?? [];
  const runs = runsRes.data ?? [];

  const kilnNames = new Map(kilns.map((k) => [k.id, k.name]));
  const devices: DeviceRow[] = (devicesRes.data ?? []).map((d) => ({
    id: d.id,
    label: d.label,
    kilnName: d.kiln_id ? (kilnNames.get(d.kiln_id) ?? null) : null,
    active: d.active,
    keyPrefix: d.key_prefix,
    // Formatted here so the list is identical on server and client.
    lastSeenLabel: d.last_seen_at ? `last reported ${timeAgo(d.last_seen_at)}` : "never reported",
  }));

  const kilnCount = new Map<string, number>();
  for (const k of kilns) kilnCount.set(k.site_id, (kilnCount.get(k.site_id) ?? 0) + 1);
  const runCount = new Map<string, number>();
  for (const r of runs) runCount.set(r.site_id, (runCount.get(r.site_id) ?? 0) + 1);

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
        title="Sites & kilns"
        description="Where biochar is made — each site hosts open kilns, a composite pile, and its own feedstock supply envelope."
      >
        {ctx.can.canManageProject && (
          <SiteForms
            projectId={pid}
            sites={sites.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
          />
        )}
      </PageHeader>

      <Card className="mb-8 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Location16Regular className="h-4 w-4 text-clay" />
            <CardTitle>Site map</CardTitle>
          </div>
          <span className="text-sm text-muted tnum">
            {sites.length} site{sites.length === 1 ? "" : "s"} · {kilns.length} kiln{kilns.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent>
          <GeoMap points={mapPoints} height={360} />
        </CardContent>
      </Card>

      <SectionHeader title="All sites" />
      {sites.length === 0 ? (
        <EmptyState
          icon={<Location16Regular />}
          title="No sites yet"
          description="Add your first production site to start placing kilns and logging runs."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((s) => (
            <Card key={s.id} className="group">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/sites/${s.id}`}
                      className="font-display text-lg text-ink group-hover:text-clay transition-colors"
                    >
                      {s.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted flex items-center gap-1.5">
                      <Location16Regular className="h-3.5 w-3.5 shrink-0" />
                      {s.region ?? "Region not set"}
                    </p>
                  </div>
                  <Badge tone={s.status === "active" ? "ok" : "neutral"} dot>
                    {humanize(s.status)}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-surface/60 px-3 py-2.5">
                    <p className="font-display text-xl text-ink tnum">{kilnCount.get(s.id) ?? 0}</p>
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Fire16Regular className="h-3 w-3" /> Kilns
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface/60 px-3 py-2.5">
                    <p className="font-display text-xl text-ink tnum">{runCount.get(s.id) ?? 0}</p>
                    <p className="text-xs text-muted">Kiln runs</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Badge tone="clay">{s.code}</Badge>
                  <Link
                    href={`/sites/${s.id}`}
                    className="text-sm text-clay hover:underline flex items-center gap-1"
                  >
                    Open site <ArrowUpRight16Regular className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeviceManager
        projectId={pid}
        kilns={kilns.map((k) => ({ id: k.id, name: k.name, site_id: k.site_id }))}
        devices={devices}
        canManage={ctx.can.canReview}
      />
    </div>
  );
}

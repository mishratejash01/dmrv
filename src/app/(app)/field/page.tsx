import type { Metadata } from "next";
import Link from "next/link";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FieldCapture } from "@/components/field/field-capture";

export const metadata: Metadata = { title: "Field log" };

export default async function FieldPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;

  if (!ctx.can.canOperate) {
    return (
      <div>
        <PageHeader title="Field log" description="Record kiln runs from the field." />
        <EmptyState
          title="Operator access required"
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [assignedRes, sitesRes, batchesRes, feedstockRes] = await Promise.all([
    supabase.from("site_assignments").select("site_id").eq("user_id", ctx.profile.id),
    supabase
      .from("sites")
      .select(
        "id, name, code, latitude, longitude, kilns(id, name, code, site_id, status, char_yield_pct, default_moisture_pct)",
      )
      .eq("project_id", pid)
      .eq("status", "active"),
    supabase
      .from("production_batches")
      .select("id, code, status")
      .eq("project_id", pid)
      .eq("status", "open"),
    supabase
      .from("feedstock_batches")
      .select("id, source, category, weight_kg, moisture_pct")
      .eq("project_id", pid)
      .order("received_at", { ascending: false })
      .limit(24),
  ]);

  const assigned = new Set((assignedRes.data ?? []).map((r) =>r.site_id));
  const allSites = sitesRes.data ?? [];
  const sites = ctx.can.canReview ? allSites : allSites.filter((s) =>assigned.has(s.id));

  return (
    <div>
      <PageHeader title="Field log" />
              {/* Offline capture is the thing operators most often do not know they
          have, and the kiln sites have no reliable signal. */}
      <Banner
        className="mb-5"
        eyebrow="Works offline"
        title="Log a run with no signal at the kiln"
        body="Runs, temperatures and photos are held on the device and sync on their own once you are back in range. Nothing to switch on."
        action={
          <Button asChild variant="secondary">
            <Link href="/runs">View logged runs</Link>
          </Button>
        }
      />

      <FieldCapture
        projectId={pid}
        operatorId={ctx.profile.id}
        sites={sites.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          latitude: s.latitude ? Number(s.latitude) : null,
          longitude: s.longitude ? Number(s.longitude) : null,
          kilns: (s.kilns ?? []).map((k) => ({
            id: k.id,
            name: k.name,
            code: k.code,
            charYieldPct: k.char_yield_pct != null ? Number(k.char_yield_pct) : 20,
            defaultMoisturePct: k.default_moisture_pct != null ? Number(k.default_moisture_pct) : 12,
          })),
        }))}
        batches={batchesRes.data ?? []}
        feedstock={(feedstockRes.data ?? []).map((f) => ({
          id: f.id,
          source: f.source,
          category: f.category,
          weight_kg: Number(f.weight_kg),
          moisture_pct: Number(f.moisture_pct),
        }))}
      />
    </div>
  );
}

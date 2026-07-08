import type { Metadata } from "next";
import { Leaf, Truck, ShieldCheck, Sprout } from "lucide-react";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader, SectionHeader, EmptyState, Stat } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fmt, fmtDate, humanize } from "@/lib/utils";
import { FEEDSTOCK_CATEGORIES, FEEDSTOCK_POSITIVE_LIST } from "@/lib/methodology";
import { FeedstockForms } from "./feedstock-forms";

export const metadata: Metadata = { title: "Feedstock" };

function categoryLabel(key: string) {
  return FEEDSTOCK_CATEGORIES.find((c) => c.key === key)?.label ?? humanize(key);
}

export default async function FeedstockPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [approvedRes, deliveriesRes, sitesRes, allWeightsRes] = await Promise.all([
    supabase
      .from("approved_feedstocks")
      .select("*")
      .eq("project_id", pid)
      .order("created_at", { ascending: false }),
    supabase
      .from("feedstock_batches")
      .select("*, sites(name)")
      .eq("project_id", pid)
      .order("received_at", { ascending: false })
      .limit(50),
    supabase.from("sites").select("id, name, code").eq("project_id", pid).order("name"),
    // Lightweight full pull → accurate project totals, independent of the table's 50-row cap.
    supabase.from("feedstock_batches").select("weight_kg, dry_weight_kg").eq("project_id", pid),
  ]);

  const approved = approvedRes.data ?? [];
  const deliveries = deliveriesRes.data ?? [];
  const sites = sitesRes.data ?? [];
  const allWeights = allWeightsRes.data ?? [];

  const activeApproved = approved.filter((f) => f.active);
  const deliveryCount = allWeights.length;
  const totalDryKg = allWeights.reduce((s, d) => s + Number(d.dry_weight_kg || 0), 0);
  const totalWetKg = allWeights.reduce((s, d) => s + Number(d.weight_kg || 0), 0);

  const canManageApproved = ctx.can.canReview;
  const canAddDelivery = ctx.can.canOperate;

  return (
    <div>
      <PageHeader
        title="Feedstock"
        description="Only pre-approved feedstock from the methodology positive list is eligible. Deliveries record wet mass and moisture — dry mass is derived automatically."
      >
        {(canManageApproved || canAddDelivery) && (
          <FeedstockForms
            projectId={pid}
            sites={sites}
            approved={activeApproved.map((f) => ({ id: f.id, name: f.name, category: f.category }))}
            canManageApproved={canManageApproved}
            canAddDelivery={canAddDelivery}
          />
        )}
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Approved types" value={fmt(activeApproved.length, 0)} icon={<ShieldCheck />} tone="sage" hint="Active on the project positive list" />
        <Stat label="Deliveries" value={fmt(deliveryCount, 0)} icon={<Truck />} tone="clay" hint={deliveryCount > 50 ? "Most recent 50 shown below" : "All shown below"} />
        <Stat label="Received (wet)" value={fmt(totalWetKg / 1000, 1)} unit="t" icon={<Leaf />} tone="ochre" hint="As-delivered mass" />
        <Stat label="Received (dry)" value={fmt(totalDryKg / 1000, 1)} unit="t" icon={<Sprout />} tone="info" hint="Moisture-corrected" />
      </div>

      {/* Methodology positive list */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sage" /> Methodology positive list
          </CardTitle>
          <CardDescription>
            Waste and residue biomass eligible under the biomass feedstock module. A project&apos;s
            approved feedstock must come from this list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FEEDSTOCK_POSITIVE_LIST.map((item) => (
              <Badge key={item} tone="sage">{item}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approved feedstock */}
      <div className="mb-8">
        <SectionHeader title="Approved feedstock" />
        <Card>
          {approved.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck />}
              title="No approved feedstock yet"
              description="Add feedstock types from the positive list so deliveries and kiln runs can reference them."
              className="border-0"
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Category</TH>
                  <TH className="text-right">Carbon fraction</TH>
                  <TH>Forestry cert.</TH>
                  <TH>Proof method</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {approved.map((f) => (
                  <TR key={f.id}>
                    <TD className="font-medium">{f.name}</TD>
                    <TD className="text-muted">{categoryLabel(f.category)}</TD>
                    <TD className="text-right tnum">{fmt(Number(f.carbon_fraction), 2)} tC/t</TD>
                    <TD>{f.forestry_certification ? <Badge tone="info">{f.forestry_certification}</Badge> : <span className="text-muted">—</span>}</TD>
                    <TD className="text-muted">{f.proof_method ? humanize(f.proof_method) : "—"}</TD>
                    <TD>
                      {f.active ? <Badge tone="ok" dot>Active</Badge> : <Badge tone="neutral" dot>Inactive</Badge>}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Deliveries */}
      <div>
        <SectionHeader title="Deliveries" />
        <Card>
          {deliveries.length === 0 ? (
            <EmptyState
              icon={<Truck />}
              title="No deliveries recorded"
              description="Record incoming feedstock with its wet weight and moisture — dry mass is computed for traceability."
              className="border-0"
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Source</TH>
                  <TH>Category</TH>
                  <TH>Site</TH>
                  <TH className="text-right">Wet (kg)</TH>
                  <TH className="text-right">Moisture</TH>
                  <TH className="text-right">Dry (kg)</TH>
                  <TH>Received</TH>
                </TR>
              </THead>
              <TBody>
                {deliveries.map((d) => {
                  const site = (d.sites as { name: string } | null)?.name;
                  return (
                    <TR key={d.id}>
                      <TD className="font-medium">{d.source}</TD>
                      <TD className="text-muted">{categoryLabel(d.category)}</TD>
                      <TD className="text-muted">{site ?? "—"}</TD>
                      <TD className="text-right tnum">{fmt(Number(d.weight_kg), 0)}</TD>
                      <TD className="text-right tnum">{fmt(Number(d.moisture_pct), 1)}%</TD>
                      <TD className="text-right tnum">{d.dry_weight_kg != null ? fmt(Number(d.dry_weight_kg), 0) : "—"}</TD>
                      <TD className="text-muted">{fmtDate(d.received_at)}</TD>
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

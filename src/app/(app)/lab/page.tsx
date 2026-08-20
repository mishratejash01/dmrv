import type { Metadata } from "next";
import {
  Beaker20Regular,
} from "@/components/common/icons";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { fmt, fmtDate } from "@/lib/utils";
import { HC_ORG } from "@/lib/methodology";
import { LabForm } from "./lab-form";

export const metadata: Metadata = { title: "Lab tests" };

export default async function LabPage() {
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const [testsRes, batchesRes] = await Promise.all([
    supabase
      .from("lab_tests")
      .select("*, production_batches!inner(code, project_id)")
      .eq("production_batches.project_id", pid)
      .order("created_at", { ascending: false }),
    supabase
      .from("production_batches")
      .select("id, code, status")
      .eq("project_id", pid)
      .order("opened_at", { ascending: false }),
  ]);

  const tests = testsRes.data ?? [];
  const batches = batchesRes.data ?? [];

  return (
    <div>
      <PageHeader
        title="Lab tests"
        description={`Accredited-laboratory results per production-batch composite sample. Biochar qualifies as durable carbon only when molar H/C_org is below ${HC_ORG.maxEligible}.`}
      >
        {ctx.can.canReview && batches.length > 0 && <LabForm batches={batches} />}
      </PageHeader>

      {tests.length === 0 ? (
        <EmptyState
          icon={<Beaker20Regular />}
          title="No lab tests yet"
          description="When a batch composite sample comes back from the accredited lab, record the results here to unlock GHG quantification."
          action={
            ctx.can.canReview && batches.length > 0 ? <LabForm batches={batches} /> : undefined
          }
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Batch</TH>
                <TH>Laboratory</TH>
                <TH>Sample</TH>
                <TH className="text-right">C_org</TH>
                <TH className="text-right">H/C_org</TH>
                <TH className="text-right">Ash</TH>
                <TH className="text-right">Moisture</TH>
                <TH className="text-right">pH</TH>
                <TH>Tested</TH>
              </TR>
            </THead>
            <TBody>
              {tests.map((t) => {
                const batchCode = (t.production_batches as { code: string } | null)?.code ?? "—";
                const hc = Number(t.hydrogen_carbon_molar_ratio);
                const eligible = hc < HC_ORG.maxEligible;
                return (
                  <TR key={t.id}>
                    <TD className="font-medium">{batchCode}</TD>
                    <TD>
                      <p className="text-ink">{t.lab_name}</p>
                      {t.accreditation && <p className="text-xs text-muted">{t.accreditation}</p>}
                    </TD>
                    <TD className="text-muted">{t.sample_id ?? "—"}</TD>
                    <TD className="text-right tnum">{fmt(Number(t.organic_carbon_pct), 1)}%</TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        <span className="tnum">{fmt(hc, 3)}</span>
                        <Badge tone={eligible ? "ok" : "err"}>
                          {eligible ? "Eligible" : `≥ ${HC_ORG.maxEligible}`}
                        </Badge>
                      </div>
                    </TD>
                    <TD className="text-right tnum text-muted">
                      {t.ash_content_pct != null ? `${fmt(Number(t.ash_content_pct), 1)}%` : "—"}
                    </TD>
                    <TD className="text-right tnum text-muted">
                      {t.moisture_pct != null ? `${fmt(Number(t.moisture_pct), 1)}%` : "—"}
                    </TD>
                    <TD className="text-right tnum text-muted">
                      {t.ph != null ? fmt(Number(t.ph), 1) : "—"}
                    </TD>
                    <TD className="text-muted">{fmtDate(t.tested_at)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

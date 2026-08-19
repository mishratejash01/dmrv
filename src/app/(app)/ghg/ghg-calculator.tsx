"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect, Field } from "@/components/ui/input";
import { GhgBreakdown } from "@/components/ghg/ghg-breakdown";
import { quantify, type DurabilityPathway, type UncertaintyTier } from "@/lib/ghg";
import { computeGhg } from "@/lib/actions/science";
import { UNCERTAINTY_DISCOUNTS, METHODOLOGY, HC_ORG } from "@/lib/methodology";
import { fmtCo2, fmt } from "@/lib/utils";

export interface GhgCalcBatch {
  id: string;
  code: string;
  /** Fresh (as-produced) biochar mass for the batch, tonnes (derived from dry + moisture). */
  freshTonnes: number;
  soilTempC: number;
  durabilityYears: DurabilityPathway;
  labTestId: string | null;
  organicCarbonPct: number | null;
  hcOrgRatio: number | null;
  moisturePct: number | null;
  reflectancePct: number | null;
  /** Emissions auto-aggregated from the emissions ledger (tCO₂e). */
  captureTco2e: number;
  processingTco2e: number;
  transportTco2e: number;
}

interface Props {
  batches: GhgCalcBatch[];
  canCompute: boolean;
}

export function GhgCalculator({ batches, canCompute }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const first = batches[0];
  const [batchId, setBatchId] = React.useState(first?.id ?? "");
  const batch = batches.find((b) => b.id === batchId) ?? first ?? null;

  const [freshTonnes, setFreshTonnes] = React.useState(str(first?.freshTonnes));
  const [moisture, setMoisture] = React.useState(str(first?.moisturePct ?? 15));
  const [organicCarbon, setOrganicCarbon] = React.useState(str(first?.organicCarbonPct));
  const [hcRatio, setHcRatio] = React.useState(str(first?.hcOrgRatio));
  const [soilTemp, setSoilTemp] = React.useState(str(first?.soilTempC ?? 18));
  const [durability, setDurability] = React.useState<DurabilityPathway>(first?.durabilityYears ?? 100);
  const [capture, setCapture] = React.useState(str(first?.captureTco2e ?? 0));
  const [processing, setProcessing] = React.useState(str(first?.processingTco2e ?? 0));
  const [transport, setTransport] = React.useState(str(first?.transportTco2e ?? 0));
  const [tier, setTier] = React.useState<UncertaintyTier>("low");
  // Baseline (optional): feedstock carbon assumed stored anyway (0.5% rule).
  const [feedstockDryT, setFeedstockDryT] = React.useState("");
  const [feedstockCarbon, setFeedstockCarbon] = React.useState("");
  const [applyDiscount, setApplyDiscount] = React.useState(true);
  // 1000-yr pathway lab inputs (fraction of sample with R_o > 2%, residual C fraction).
  const [reflectPct, setReflectPct] = React.useState(str(first?.reflectancePct));
  const [residualPct, setResidualPct] = React.useState("");

  function pickBatch(id: string) {
    setBatchId(id);
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    setFreshTonnes(str(b.freshTonnes));
    if (b.moisturePct != null) setMoisture(str(b.moisturePct));
    if (b.organicCarbonPct != null) setOrganicCarbon(str(b.organicCarbonPct));
    if (b.hcOrgRatio != null) setHcRatio(str(b.hcOrgRatio));
    setSoilTemp(str(b.soilTempC));
    setDurability(b.durabilityYears);
    // Auto-fill emissions from the batch's logged emissions ledger.
    setCapture(str(b.captureTco2e ?? 0));
    setProcessing(str(b.processingTco2e ?? 0));
    setTransport(str(b.transportTco2e ?? 0));
  }

  const result = React.useMemo(
    () =>
      quantify({
        biocharFreshTonnes: num(freshTonnes),
        moistureFraction: num(moisture) / 100,
        organicCarbonFraction: num(organicCarbon) / 100,
        hcOrgRatio: num(hcRatio),
        soilTempC: num(soilTemp),
        durabilityYears: durability,
        reflectanceFraction: durability === 1000 ? num(reflectPct) / 100 : undefined,
        residualCarbonFraction: durability === 1000 && num(residualPct) > 0 ? num(residualPct) / 100 : undefined,
        captureEmissions: num(capture),
        transformationEmissions: num(processing),
        transportEmissions: num(transport),
        feedstockDryTonnes: num(feedstockDryT) > 0 ? num(feedstockDryT) : undefined,
        feedstockCarbonFraction: num(feedstockCarbon) > 0 ? num(feedstockCarbon) / 100 : undefined,
        applyBaselineDiscount: applyDiscount,
        uncertaintyTier: tier,
      }),
    [freshTonnes, moisture, organicCarbon, hcRatio, soilTemp, durability, capture, processing, transport, tier, reflectPct, residualPct, feedstockDryT, feedstockCarbon, applyDiscount],
  );

  async function handleSave() {
    if (!batchId) return toast.error("Select a production batch to quantify.");
    if (num(freshTonnes) <= 0) return toast.error("Enter the fresh biochar mass in tonnes.");
    if (num(organicCarbon) <= 0) return toast.error("Enter the organic carbon percentage from the lab.");
    if (num(hcRatio) <= 0) return toast.error("Enter the H/C_org ratio from the lab.");

    setBusy(true);
    const res = await computeGhg({
      production_batch_id: batchId,
      lab_test_id: batch?.labTestId ?? null,
      credit_type: "removal",
      durability_years: durability,
      biocharFreshTonnes: num(freshTonnes),
      moistureFraction: num(moisture) / 100,
      organicCarbonFraction: num(organicCarbon) / 100,
      hcOrgRatio: num(hcRatio),
      soilTempC: num(soilTemp),
      captureEmissions: num(capture),
      transformationEmissions: num(processing),
      transportEmissions: num(transport),
      reflectanceFraction: durability === 1000 ? num(reflectPct) / 100 : undefined,
      residualCarbonFraction: durability === 1000 && num(residualPct) > 0 ? num(residualPct) / 100 : undefined,
      feedstockDryTonnes: num(feedstockDryT) > 0 ? num(feedstockDryT) : undefined,
      feedstockCarbonFraction: num(feedstockCarbon) > 0 ? num(feedstockCarbon) / 100 : undefined,
      applyBaselineDiscount: applyDiscount,
      uncertaintyTier: tier,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Quantification saved");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-clay" />
          <CardTitle>Live GHG calculator</CardTitle>
        </div>
        <CardDescription>
          A transparent comparative LCA per {METHODOLOGY.lcaStandard}. Every input feeds the same
          engine that persists the quantification — no black box. Adjust the inputs to see the net
          removal update in real time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <Field label="Production batch" required hint="Prefills the lab values and project settings">
              <NativeSelect value={batchId} onChange={(e) => pickBatch(e.target.value)}>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                    {b.labTestId ? "" : " — no lab test"}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Fresh biochar (t)" required>
                <Input type="number" step="0.1" min="0" inputMode="decimal" value={freshTonnes} onChange={(e) => setFreshTonnes(e.target.value)} />
              </Field>
              <Field label="Moisture (%)" required>
                <Input type="number" step="0.1" min="0" max="99" inputMode="decimal" value={moisture} onChange={(e) => setMoisture(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Organic carbon (%)" required hint="C_org from the lab">
                <Input type="number" step="0.1" min="0" max="100" inputMode="decimal" value={organicCarbon} onChange={(e) => setOrganicCarbon(e.target.value)} />
              </Field>
              <Field label="H/C_org ratio" required hint={`< ${HC_ORG.maxEligible} to qualify`}>
                <Input type="number" step="0.01" min="0" inputMode="decimal" value={hcRatio} onChange={(e) => setHcRatio(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Soil temperature (°C)" required hint="Selects permanence coefficients">
                <Input type="number" step="0.1" inputMode="decimal" value={soilTemp} onChange={(e) => setSoilTemp(e.target.value)} />
              </Field>
              <Field label="Durability pathway" required>
                <NativeSelect
                  value={String(durability)}
                  onChange={(e) => setDurability(Number(e.target.value) as DurabilityPathway)}
                >
                  <option value="100">100-year permanence</option>
                  <option value="1000">1000-year permanence</option>
                </NativeSelect>
              </Field>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted">
                Emissions auto-filled from the batch&apos;s logged emissions ledger — adjust only to
                override.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Capture (tCO₂e)" hint="From ledger">
                  <Input type="number" step="0.000001" min="0" inputMode="decimal" value={capture} onChange={(e) => setCapture(e.target.value)} />
                </Field>
                <Field label="Processing (tCO₂e)" hint="From ledger">
                  <Input type="number" step="0.000001" min="0" inputMode="decimal" value={processing} onChange={(e) => setProcessing(e.target.value)} />
                </Field>
                <Field label="Transport (tCO₂e)" hint="From ledger">
                  <Input type="number" step="0.000001" min="0" inputMode="decimal" value={transport} onChange={(e) => setTransport(e.target.value)} />
                </Field>
              </div>
            </div>

            <Field label="Uncertainty tier" required>
              <NativeSelect value={tier} onChange={(e) => setTier(e.target.value as UncertaintyTier)}>
                {UNCERTAINTY_DISCOUNTS.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.label} — −{Math.round(u.discount * 100)}%
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {durability === 1000 && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="R_o > 2% fraction (%)" hint="Reflectance sample fraction">
                  <Input type="number" step="0.1" min="0" max="100" inputMode="decimal" value={reflectPct} onChange={(e) => setReflectPct(e.target.value)} />
                </Field>
                <Field label="Residual carbon (%)" hint="Durable-C fraction">
                  <Input type="number" step="0.1" min="0" max="100" inputMode="decimal" value={residualPct} onChange={(e) => setResidualPct(e.target.value)} />
                </Field>
              </div>
            )}

            <details className="rounded-lg border border-border bg-surface/40 px-3 py-2">
              <summary className="cursor-pointer text-sm text-ink-soft">
                Baseline (optional) — carbon stored without the project
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Field label="Feedstock (t dry)" hint="For the 0.5% baseline">
                  <Input type="number" step="0.1" min="0" inputMode="decimal" value={feedstockDryT} onChange={(e) => setFeedstockDryT(e.target.value)} />
                </Field>
                <Field label="Feedstock carbon (%)">
                  <Input type="number" step="0.1" min="0" max="100" inputMode="decimal" value={feedstockCarbon} onChange={(e) => setFeedstockCarbon(e.target.value)} />
                </Field>
                <label className="col-span-2 flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} className="h-4 w-4 rounded border-border-strong accent-[#b08056]" />
                  Apply the 3% baseline-uncertainty discount
                </label>
              </div>
            </details>
          </div>

          {/* Live result */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface/40 px-4 py-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">Net CO₂ removed</p>
                  <p className="font-display text-3xl text-[#5c6a4c] tnum leading-tight">
                    {fmtCo2(result.netCo2Removed)}
                  </p>
                </div>
                <Badge tone={result.eligible ? "ok" : "err"} dot>
                  {result.eligible ? "Eligible" : "Ineligible"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="info">{durability}-yr durability</Badge>
                <Badge tone="neutral">Permanence {fmt(result.permanenceFraction, 3)}</Badge>
                <Badge tone="neutral">Dry {fmt(result.dryTonnes, 2)} t</Badge>
              </div>
            </div>

            <GhgBreakdown lines={result.lines} />

            {canCompute ? (
              <Button onClick={handleSave} disabled={busy} className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save quantification
              </Button>
            ) : (
              <p className="text-xs text-muted text-center">
                You have view access to the calculator; saving requires review permissions.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function num(s: string): number {
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

function str(n: number | null | undefined): string {
  return n == null ? "" : String(n);
}

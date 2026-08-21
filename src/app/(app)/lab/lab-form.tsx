"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SpinnerIos16Regular } from "@/components/common/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Textarea, NativeSelect, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { addLabTest } from "@/lib/actions/science";
import { HC_ORG } from "@/lib/methodology";
import { fmt } from "@/lib/utils";

interface Props {
  batches: { id: string; code: string; status: string }[];
}

export function LabForm({ batches }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [batchId, setBatchId] = React.useState(batches[0]?.id ?? "");
  const [labName, setLabName] = React.useState("");
  const [accreditation, setAccreditation] = React.useState("");
  const [sampleId, setSampleId] = React.useState("");
  const [organicCarbon, setOrganicCarbon] = React.useState("");
  const [hcRatio, setHcRatio] = React.useState("");
  const [ash, setAsh] = React.useState("");
  const [moisture, setMoisture] = React.useState("");
  const [ph, setPh] = React.useState("");
  const [inertinite, setInertinite] = React.useState("");
  const [reflectance, setReflectance] = React.useState("");
  const [pollutantsOk, setPollutantsOk] = React.useState(true);
  const [stabilityNotes, setStabilityNotes] = React.useState("");
  const [testedAt, setTestedAt] = React.useState("");

  const hc = Number(hcRatio);
  const hasHc = hcRatio.trim() !== "" && !Number.isNaN(hc);
  const eligible = hasHc && hc < HC_ORG.maxEligible;

  async function handleSubmit() {
    if (!batchId) return toast.error("Select the production batch this sample came from.");
    if (!labName.trim()) return toast.error("Name the accredited laboratory.");
    const oc = Number(organicCarbon);
    if (!oc || oc <= 0 || oc > 100) return toast.error("Organic carbon must be a percentage between 0 and 100.");
    if (!hasHc || hc <= 0) return toast.error("Enter the molar H/C_org ratio from the lab.");

    setBusy(true);
    const res = await addLabTest({
      production_batch_id: batchId,
      lab_name: labName.trim(),
      accreditation: accreditation.trim() || undefined,
      sample_id: sampleId.trim() || undefined,
      organic_carbon_pct: oc,
      hydrogen_carbon_molar_ratio: hc,
      ash_content_pct: ash.trim() !== "" ? Number(ash) : undefined,
      moisture_pct: moisture.trim() !== "" ? Number(moisture) : undefined,
      ph: ph.trim() !== "" ? Number(ph) : undefined,
      inertinite_pct: inertinite.trim() !== "" ? Number(inertinite) : undefined,
      random_reflectance_pct: reflectance.trim() !== "" ? Number(reflectance) : undefined,
      pollutants_ok: pollutantsOk,
      stability_notes: stabilityNotes.trim() || undefined,
      tested_at: testedAt || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Lab test recorded");
      setOpen(false);
      setSampleId("");
      setOrganicCarbon("");
      setHcRatio("");
      setAsh("");
      setMoisture("");
      setPh("");
      setInertinite("");
      setReflectance("");
      setStabilityNotes("");
      setTestedAt("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
           Record lab test
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record an accredited lab result</DialogTitle>
          <DialogDescription>
            Enter the results for a batch composite sample. Biochar qualifies as durable carbon only
            when the molar H/C_org ratio is below {HC_ORG.maxEligible}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Production batch" required hint="The batch this composite sample represents">
            <NativeSelect value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Laboratory" required hint="e.g. Eurofins — Bengaluru">
              <Input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Accredited lab name" />
            </Field>
            <Field label="Accreditation" hint="e.g. NABL / ISO 17025 ref.">
              <Input value={accreditation} onChange={(e) => setAccreditation(e.target.value)} placeholder="Accreditation ref." />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Sample ID">
              <Input value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="Lab sample reference" />
            </Field>
            <Field label="Tested on">
              <Input type="date" value={testedAt} onChange={(e) => setTestedAt(e.target.value)} />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Organic carbon (%)" required hint="C_org content of the sample">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                inputMode="decimal"
                value={organicCarbon}
                onChange={(e) => setOrganicCarbon(e.target.value)}
                placeholder="e.g. 82"
              />
            </Field>
            <Field label="H/C_org molar ratio" required hint={`Must be below ${HC_ORG.maxEligible} to qualify`}>
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={hcRatio}
                onChange={(e) => setHcRatio(e.target.value)}
                placeholder="e.g. 0.35"
              />
            </Field>
          </div>
              {hasHc && (
            <div
              className={[
                "rounded-lg border px-3 py-2.5 text-sm flex items-center gap-2.5",
                eligible
                  ? "bg-sage-tint/60 border-sage-soft text-ink"
                  : "bg-err-tint border-err/30 text-err",
              ].join(" ")}
            >
              <Badge tone={eligible ? "ok" : "err"} dot>
                {eligible ? "Eligible" : "Ineligible"}
              </Badge>
              <span>
                {eligible
                  ? `H/C_org of ${fmt(hc, 3)} is below the ${HC_ORG.maxEligible} durable-carbon threshold.`
                  : `H/C_org of ${fmt(hc, 3)} is at or above ${HC_ORG.maxEligible} — this sample does not qualify as durable carbon.`}
              </span>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Ash content (%)">
              <Input type="number" step="0.1" min="0" max="100" inputMode="decimal" value={ash} onChange={(e) => setAsh(e.target.value)} />
            </Field>
            <Field label="Moisture (%)">
              <Input type="number" step="0.1" min="0" max="100" inputMode="decimal" value={moisture} onChange={(e) => setMoisture(e.target.value)} />
            </Field>
            <Field label="pH">
              <Input type="number" step="0.1" min="0" max="14" inputMode="decimal" value={ph} onChange={(e) => setPh(e.target.value)} />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Inertinite (%)" hint="Optional — petrographic fraction">
              <Input type="number" step="0.1" min="0" max="100" inputMode="decimal" value={inertinite} onChange={(e) => setInertinite(e.target.value)} />
            </Field>
            <Field label="Random reflectance (%)" hint="For the 1000-yr pathway (R_o > 2%)">
              <Input type="number" step="0.01" min="0" max="100" inputMode="decimal" value={reflectance} onChange={(e) => setReflectance(e.target.value)} />
            </Field>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-surface/40 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={pollutantsOk}
              onChange={(e) => setPollutantsOk(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border-strong accent-[#2e7d32]"
            />
            <span className="text-sm text-ink-soft">
              Pollutants within limits
              <span className="block text-xs text-muted">
                Heavy metals and PAHs are below the methodology thresholds.
              </span>
            </span>
          </label>

          <Field label="Stability notes">
            <Textarea
              value={stabilityNotes}
              onChange={(e) => setStabilityNotes(e.target.value)}
              placeholder="Anything a verifier should know about permanence, morphology or sampling…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Record lab test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

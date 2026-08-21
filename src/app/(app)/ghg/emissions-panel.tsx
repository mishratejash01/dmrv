"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SpinnerIos16Regular } from "@/components/common/icons";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, NativeSelect, Field } from "@/components/ui/input";
import { SectionHeader, EmptyState } from "@/components/ui/misc";
import { addEmissionsEntry, deleteEmissionsEntry } from "@/lib/actions/emissions";
import { TRANSPORT_DISTANCE_EF, TRANSPORT_FUEL_EF } from "@/lib/methodology";
import { humanize, fmt } from "@/lib/utils";

export interface EmissionRow {
  id: string;
  kind: "transport" | "processing" | "capture";
  method: "distance" | "fuel";
  description: string | null;
  co2e_kg: number;
  production_batch_id: string | null;
  batchCode: string | null;
}

interface Props {
  projectId: string;
  batches: { id: string; code: string }[];
  entries: EmissionRow[];
  canManage: boolean;
}

const DISTANCE_EF = Object.entries(TRANSPORT_DISTANCE_EF).map(([key, value]) => ({ key, value }));
const FUEL_EF = Object.entries(TRANSPORT_FUEL_EF).map(([key, value]) => ({ key, value }));

const KIND_TONE: Record<EmissionRow["kind"], "info" | "clay" | "ochre"> = {
  transport: "info",
  processing: "clay",
  capture: "ochre",
};

export function EmissionsPanel({ projectId, batches, entries, canManage }: Props) {
  return (
    <div className="mt-10">
      <SectionHeader
        title="Project & transport emissions"
        action={canManage ? <AddEmissionDialog projectId={projectId} batches={batches} /> : undefined}
      />
      {entries.length === 0 ? (
        <EmptyState
          title="No emissions logged"
        />
      ) : (
        <Card>
          <CardContent className="pt-0 divide-y divide-border">
            {entries.map((e) => (
              <EmissionItem key={e.id} entry={e} canManage={canManage} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmissionItem({ entry, canManage }: { entry: EmissionRow; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function remove() {
    setBusy(true);
    const res = await deleteEmissionsEntry(entry.id);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Emission entry removed");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge tone={KIND_TONE[entry.kind]}>{humanize(entry.kind)}</Badge>
          <span className="text-sm text-ink truncate">
            {entry.description || humanize(entry.method)}
          </span>
          {entry.batchCode && <span className="text-xs text-muted">· {entry.batchCode}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm tnum text-ink">{fmt(entry.co2e_kg / 1000, 3)} tCO₂e</span>
        {canManage && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-muted hover:text-err transition-colors"
            aria-label="Remove"
          >
            {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : null}
          </button>
        )}
      </div>
    </div>
  );
}

function AddEmissionDialog({
  projectId,
  batches,
}: {
  projectId: string;
  batches: { id: string; code: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [batchId, setBatchId] = React.useState(batches[0]?.id ?? "");
  const [kind, setKind] = React.useState<"transport" | "processing" | "capture">("transport");
  const [method, setMethod] = React.useState<"distance" | "fuel">("distance");
  const [description, setDescription] = React.useState("");
  const [distance, setDistance] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [fuelType, setFuelType] = React.useState(FUEL_EF[0]?.key ?? "diesel");
  const [fuelQty, setFuelQty] = React.useState("");
  const [efPreset, setEfPreset] = React.useState(DISTANCE_EF[0]?.key ?? "");
  const [ef, setEf] = React.useState(String(DISTANCE_EF[0]?.value ?? ""));

  const co2eKg =
    method === "distance"
      ? (Number(distance) || 0) * (Number(weight) || 0) * (Number(ef) || 0)
      : (Number(fuelQty) || 0) * (Number(ef) || 0);

  function pickDistanceEf(key: string) {
    setEfPreset(key);
    const found = DISTANCE_EF.find((d) =>d.key === key);
    if (found) setEf(String(found.value));
  }
  function pickFuel(key: string) {
    setFuelType(key);
    const found = FUEL_EF.find((f) =>f.key === key);
    if (found) setEf(String(found.value));
  }
  function switchMethod(m: "distance" | "fuel") {
    setMethod(m);
    if (m === "distance") setEf(String(DISTANCE_EF[0]?.value ?? ""));
    else setEf(String(FUEL_EF.find((f) =>f.key === fuelType)?.value ?? ""));
  }

  async function handleSubmit() {
    if (Number(ef) <= 0) return toast.error("Enter an emission factor.");
    if (method === "distance" && (Number(distance) <= 0 || Number(weight) <= 0)) {
      return toast.error("Enter distance and weight.");
    }
    if (method === "fuel" && Number(fuelQty) <= 0) return toast.error("Enter the fuel quantity.");
    setBusy(true);
    const res = await addEmissionsEntry({
      project_id: projectId,
      production_batch_id: batchId || null,
      kind,
      method,
      description: description.trim() || null,
      distance_km: method === "distance" ? Number(distance) : null,
      weight_t: method === "distance" ? Number(weight) : null,
      fuel_type: method === "fuel" ? fuelType : null,
      fuel_qty: method === "fuel" ? Number(fuelQty) : null,
      emission_factor: Number(ef),
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Emission logged — ${fmt(co2eKg / 1000, 3)} tCO₂e`);
      setOpen(false);
      setDescription("");
      setDistance("");
      setWeight("");
      setFuelQty("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
           Log emission
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an emission</DialogTitle>
          <DialogDescription>
            Recorded with the exact emission factor applied; the GHG calculator subtracts it per
            batch. Factors default to the methodology transport module.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Production batch">
              <NativeSelect value={batchId} onChange={(e) =>setBatchId(e.target.value)}>
                <option value="">— project-wide —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Type" required>
              <NativeSelect value={kind} onChange={(e) =>setKind(e.target.value as typeof kind)}>
                <option value="transport">Transport</option>
                <option value="processing">Processing</option>
                <option value="capture">Capture</option>
              </NativeSelect>
            </Field>
          </div>

          <Field label="Method" required>
            <NativeSelect value={method} onChange={(e) =>switchMethod(e.target.value as typeof method)}>
              <option value="distance">Distance-based (distance × weight × EF)</option>
              <option value="fuel">Fuel-based (fuel × EF)</option>
            </NativeSelect>
          </Field>
              {method === "distance" ? (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Distance (km)" required>
                <Input type="number" min="0" inputMode="decimal" value={distance} onChange={(e) =>setDistance(e.target.value)} />
              </Field>
              <Field label="Weight (t)" required>
                <Input type="number" min="0" inputMode="decimal" value={weight} onChange={(e) =>setWeight(e.target.value)} />
              </Field>
              <Field label="Mode / EF" hint="kg/t·km">
                <NativeSelect value={efPreset} onChange={(e) =>pickDistanceEf(e.target.value)}>
                  {DISTANCE_EF.map((d) => (
                    <option key={d.key} value={d.key}>
                      {humanize(d.key)} ({d.value})
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Fuel" required>
                <NativeSelect value={fuelType} onChange={(e) =>pickFuel(e.target.value)}>
                  {FUEL_EF.map((f) => (
                    <option key={f.key} value={f.key}>{humanize(f.key)}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Quantity (kg)" required>
                <Input type="number" min="0" inputMode="decimal" value={fuelQty} onChange={(e) =>setFuelQty(e.target.value)} />
              </Field>
              <Field label="EF" hint="kg/kg fuel">
                <Input type="number" min="0" step="0.0001" inputMode="decimal" value={ef} onChange={(e) =>setEf(e.target.value)} />
              </Field>
            </div>
          )}

          <Field label="Description" hint="e.g. Feedstock haul, sawmill → site">
            <Input value={description} onChange={(e) =>setDescription(e.target.value)} placeholder="Optional note" />
          </Field>

          <div className="rounded-lg bg-surface/60 border border-border px-3 py-2.5 text-sm text-ink-soft">
            ≈ <span className="font-medium tnum">{fmt(co2eKg, 1)} kg</span> (
            <span className="tnum">{fmt(co2eKg / 1000, 3)}</span>tCO₂e)
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() =>setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Log emission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

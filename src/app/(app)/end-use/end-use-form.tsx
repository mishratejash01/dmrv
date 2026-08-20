"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  SpinnerIos16Regular,
  PlantGrassRegular,
} from "@/components/common/icons";
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
import { addEndUse } from "@/lib/actions/science";

interface Props {
  projectId: string;
  batches: { id: string; code: string }[];
}

const APPLICATION_METHODS = [
  { key: "soil_incorporation", label: "Soil incorporation" },
  { key: "compost", label: "Compost blend" },
  { key: "potting_mix", label: "Potting / nursery mix" },
  { key: "animal_feed", label: "Animal feed additive" },
  { key: "manure_management", label: "Manure management" },
  { key: "construction_material", label: "Construction material" },
  { key: "other", label: "Other durable use" },
] as const;

export function EndUseForm({ projectId, batches }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [batchId, setBatchId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [method, setMethod] = React.useState<string>(APPLICATION_METHODS[0].key);
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientContact, setRecipientContact] = React.useState("");
  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");
  const [appliedAt, setAppliedAt] = React.useState("");
  const [notes, setNotes] = React.useState("");

  async function handleSubmit() {
    const qty = Number(quantity);
    if (!qty || qty <= 0) return toast.error("Enter the applied quantity in kg.");
    const lat = latitude.trim() ? Number(latitude) : null;
    const lng = longitude.trim() ? Number(longitude) : null;
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90))
      return toast.error("Latitude must be between −90 and 90.");
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180))
      return toast.error("Longitude must be between −180 and 180.");

    setBusy(true);
    const res = await addEndUse({
      project_id: projectId,
      production_batch_id: batchId || null,
      quantity_kg: qty,
      application_method: method,
      recipient_name: recipientName.trim() || undefined,
      recipient_contact: recipientContact.trim() || undefined,
      latitude: lat,
      longitude: lng,
      applied_at: appliedAt ? new Date(appliedAt).toISOString() : undefined,
      notes: notes.trim() || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("End-use application recorded");
      setOpen(false);
      setQuantity("");
      setRecipientName("");
      setRecipientContact("");
      setLatitude("");
      setLongitude("");
      setAppliedAt("");
      setNotes("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlantGrassRegular className="h-4 w-4" /> Record application
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record an end-use application</DialogTitle>
          <DialogDescription>
            Where the biochar was applied locks the carbon in place — capture the quantity, method,
            recipient and, where possible, the GPS of the application site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Production batch" hint={batches.length === 0 ? "No batches yet" : "Traceability back to the batch"}>
              <NativeSelect value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">— unassigned —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.code}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Quantity (kg)" required>
              <Input
                type="number"
                min="0"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 850"
              />
            </Field>
          </div>
          <Field label="Application method" required>
            <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)}>
              {APPLICATION_METHODS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Recipient" hint="Farmer, cooperative or off-taker">
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Karwar farmer collective"
              />
            </Field>
            <Field label="Recipient contact">
              <Input
                value={recipientContact}
                onChange={(e) => setRecipientContact(e.target.value)}
                placeholder="Phone or email"
              />
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Latitude">
              <Input
                type="number"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 14.8138"
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 74.1297"
              />
            </Field>
            <Field label="Applied at">
              <Input
                type="datetime-local"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Field conditions, application rate, anything a verifier should know…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Record application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

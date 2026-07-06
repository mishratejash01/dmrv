"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Truck } from "lucide-react";
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
import { addApprovedFeedstock, addFeedstockDelivery } from "@/lib/actions/production";
import { FEEDSTOCK_CATEGORIES, FORESTRY_CERTIFICATIONS } from "@/lib/methodology";
import { fmt } from "@/lib/utils";
import type { FeedstockCategory } from "@/lib/types/db";

interface Props {
  projectId: string;
  sites: { id: string; name: string; code: string }[];
  approved: { id: string; name: string; category: string }[];
  canManageApproved: boolean;
  canAddDelivery: boolean;
}

const PROOF_METHODS = [
  { key: "positive_list", label: "Positive list" },
  { key: "price", label: "Price-based proof" },
  { key: "contextual", label: "Contextual proof" },
] as const;

export function FeedstockForms({ projectId, sites, approved, canManageApproved, canAddDelivery }: Props) {
  return (
    <>
      {canManageApproved && <ApprovedFeedstockDialog projectId={projectId} />}
      {canAddDelivery && <DeliveryDialog projectId={projectId} sites={sites} approved={approved} />}
    </>
  );
}

function ApprovedFeedstockDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<string>(FEEDSTOCK_CATEGORIES[0].key);
  const [carbonFraction, setCarbonFraction] = React.useState("0.45");
  const [certification, setCertification] = React.useState("");
  const [proofMethod, setProofMethod] = React.useState("positive_list");
  const [notes, setNotes] = React.useState("");

  const isForestOrigin = category.startsWith("forest") || category === "tree_removal";

  async function handleSubmit() {
    if (!name.trim()) return toast.error("Give the feedstock a name.");
    const cf = Number(carbonFraction);
    if (!cf || cf <= 0 || cf >= 1) return toast.error("Carbon fraction must be between 0 and 1.");
    setBusy(true);
    const res = await addApprovedFeedstock({
      project_id: projectId,
      name: name.trim(),
      category: category as FeedstockCategory,
      carbon_fraction: cf,
      forestry_certification: certification || undefined,
      proof_method: proofMethod || undefined,
      notes: notes.trim() || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`${name.trim()} added to the approved list`);
      setOpen(false);
      setName("");
      setNotes("");
      setCertification("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <ShieldCheck className="h-4 w-4" /> Approve feedstock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve a feedstock type</DialogTitle>
          <DialogDescription>
            Only waste and residue biomass from the methodology positive list may be approved for
            this project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Name" required hint="e.g. Sawmill residues — Karwar cooperative">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Feedstock name" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Category" required>
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
                {FEEDSTOCK_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Carbon fraction" required hint="t C per t dry matter">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                inputMode="decimal"
                value={carbonFraction}
                onChange={(e) => setCarbonFraction(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Forestry certification"
              hint={isForestOrigin ? "Required for forest-origin biomass" : "Only for forest-origin biomass"}
            >
              <NativeSelect value={certification} onChange={(e) => setCertification(e.target.value)}>
                <option value="">— none —</option>
                {FORESTRY_CERTIFICATIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Proof method">
              <NativeSelect value={proofMethod} onChange={(e) => setProofMethod(e.target.value)}>
                {PROOF_METHODS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Source arrangements, seasonality, anything a verifier should know…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add to approved list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryDialog({
  projectId,
  sites,
  approved,
}: {
  projectId: string;
  sites: { id: string; name: string; code: string }[];
  approved: { id: string; name: string; category: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [approvedId, setApprovedId] = React.useState(approved[0]?.id ?? "");
  const [category, setCategory] = React.useState<string>(
    approved[0]?.category ?? FEEDSTOCK_CATEGORIES[0].key,
  );
  const [source, setSource] = React.useState("");
  const [siteId, setSiteId] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [moisture, setMoisture] = React.useState("15");
  const [sourceArea, setSourceArea] = React.useState("");

  const wetKg = Number(weight) || 0;
  const moistPct = Number(moisture) || 0;
  const dryKg = wetKg > 0 ? wetKg * (1 - moistPct / 100) : 0;

  function pickApproved(id: string) {
    setApprovedId(id);
    const f = approved.find((a) => a.id === id);
    if (f) setCategory(f.category);
  }

  async function handleSubmit() {
    if (!source.trim()) return toast.error("Name the feedstock source.");
    if (!wetKg || wetKg <= 0) return toast.error("Enter the delivered weight in kg.");
    if (moistPct < 0 || moistPct >= 100) return toast.error("Moisture must be between 0 and 100%.");
    setBusy(true);
    const res = await addFeedstockDelivery({
      project_id: projectId,
      site_id: siteId || null,
      approved_feedstock_id: approvedId || null,
      source: source.trim(),
      category: category as FeedstockCategory,
      weight_kg: wetKg,
      moisture_pct: moistPct,
      source_area_description: sourceArea.trim() || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Delivery recorded — ${fmt(dryKg, 0)} kg dry`);
      setOpen(false);
      setSource("");
      setWeight("");
      setSourceArea("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Truck className="h-4 w-4" /> Record delivery
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a feedstock delivery</DialogTitle>
          <DialogDescription>
            Weigh the delivery as received; dry mass is derived from moisture for the carbon
            accounting chain.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Approved feedstock" hint={approved.length === 0 ? "No approved types yet" : "Sets the category"}>
              <NativeSelect value={approvedId} onChange={(e) => pickApproved(e.target.value)}>
                <option value="">— unlisted —</option>
                {approved.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Category" required>
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
                {FEEDSTOCK_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Source" required hint="Supplier, farm or plot">
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Hebbal sawmill" />
            </Field>
            <Field label="Delivered to site">
              <NativeSelect value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="">— none —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Weight (kg, wet)" required>
              <Input
                type="number"
                min="0"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 2400"
              />
            </Field>
            <Field label="Moisture (%)" required>
              <Input
                type="number"
                min="0"
                max="99"
                inputMode="decimal"
                value={moisture}
                onChange={(e) => setMoisture(e.target.value)}
              />
            </Field>
          </div>
          {wetKg > 0 && (
            <div className="rounded-lg bg-sage-tint/60 border border-sage-soft px-3 py-2.5 text-sm text-[#5c6a4c]">
              ≈ <span className="font-medium tnum">{fmt(dryKg, 0)} kg</span> dry matter after
              moisture correction
            </div>
          )}
          <Field label="Source area description" hint="Supply envelope / plot the biomass came from">
            <Textarea
              value={sourceArea}
              onChange={(e) => setSourceArea(e.target.value)}
              placeholder="e.g. Managed plantation blocks A–C within 20 km of the site"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Record delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

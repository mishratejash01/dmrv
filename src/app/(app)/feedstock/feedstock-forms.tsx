"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  SpinnerIos16Regular,
  ShieldCheckmark16Regular,
  VehicleTruck16Regular,
  Camera16Regular,
  Location16Regular,
  Dismiss16Regular,
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
import { addApprovedFeedstock, addFeedstockDelivery } from "@/lib/actions/production";
import { FEEDSTOCK_CATEGORIES, FORESTRY_CERTIFICATIONS } from "@/lib/methodology";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS } from "@/lib/storage";
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
          <ShieldCheckmark16Regular className="h-4 w-4" /> Approve feedstock
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
            {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Add to approved list
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
  const supabase = React.useMemo(() => createClient(), []);
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
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [gps, setGps] = React.useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const wetKg = Number(weight) || 0;
  const moistPct = Number(moisture) || 0;
  const dryKg = wetKg > 0 ? wetKg * (1 - moistPct / 100) : 0;

  // Capture GPS when the dialog opens, so photos can be geo-tagged.
  React.useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  }, [open]);

  // Revoke preview object URLs on unmount to avoid leaking blob URLs.
  React.useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setPhotos((prev) => [...prev, ...list]);
    setPreviews((prev) => [...prev, ...list.map((f) => URL.createObjectURL(f))]);
  }
  function removePhoto(i: number) {
    setPreviews((prev) => {
      if (prev[i]) URL.revokeObjectURL(prev[i]);
      return prev.filter((_, idx) => idx !== i);
    });
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

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
    if (res?.error || !res?.id) {
      setBusy(false);
      return toast.error(res?.error ?? "Could not record the delivery.");
    }

    // Upload geo-tagged photos to storage + record the evidence rows.
    const now = new Date();
    let uploaded = 0;
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const path = `${projectId}/${res.id}/${now.getTime()}-${i}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKETS.feedstockPhotos)
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (!upErr) {
        const { error: rowErr } = await supabase.from("feedstock_photos").insert({
          feedstock_batch_id: res.id,
          project_id: projectId,
          storage_path: path,
          latitude: gps.lat,
          longitude: gps.lng,
          taken_at: now.toISOString(),
        });
        if (!rowErr) uploaded += 1;
      }
    }
    setBusy(false);

    const photoNote = photos.length
      ? ` · ${uploaded}/${photos.length} photo${photos.length > 1 ? "s" : ""}`
      : "";
    toast.success(`Delivery recorded — ${fmt(dryKg, 0)} kg dry${photoNote}`);
    setOpen(false);
    setSource("");
    setWeight("");
    setSourceArea("");
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPhotos([]);
    setPreviews([]);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <VehicleTruck16Regular className="h-4 w-4" /> Record delivery
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
            <div className="rounded-lg bg-sage-tint/60 border border-sage-soft px-3 py-2.5 text-sm text-[#2e7d32]">
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

          {/* Geo-tagged delivery photos */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Delivery photos</span>
              <span className="flex items-center gap-1 text-xs text-muted">
                <Location16Regular className="h-3.5 w-3.5" />
                {gps.lat != null ? `${gps.lat.toFixed(3)}, ${gps.lng?.toFixed(3)}` : "locating…"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Delivery photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-elevated"
                  >
                    <Dismiss16Regular className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-strong bg-surface/40 text-muted hover:border-clay">
                <Camera16Regular className="h-5 w-5" />
                <span className="text-[10px]">Add</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Tagged with your current GPS location for verification evidence.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Record delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { addSite, addKiln } from "@/lib/actions/production";
import { KILN_TYPES } from "@/lib/methodology";
import type { KilnType } from "@/lib/types/db";

interface Props {
  projectId: string;
  sites: { id: string; name: string; code: string }[];
  defaultSiteId?: string;
  showAddSite?: boolean;
  showAddKiln?: boolean;
}

export function SiteForms({
  projectId,
  sites,
  defaultSiteId,
  showAddSite = true,
  showAddKiln = true,
}: Props) {
  return (
    <>
      {showAddKiln && sites.length > 0 && (
        <AddKilnDialog projectId={projectId} sites={sites} defaultSiteId={defaultSiteId} />
      )}
      {showAddSite && <AddSiteDialog projectId={projectId} />}
    </>
  );
}

function AddSiteDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");
  const [supplyEnvelope, setSupplyEnvelope] = React.useState("");

  async function handleSubmit() {
    if (!name.trim()) return toast.error("Give the site a name.");
    if (!code.trim()) return toast.error("Give the site a short code (e.g. S03).");
    const latN = lat ? Number(lat) : null;
    const lngN = lng ? Number(lng) : null;
    if (lat && (Number.isNaN(latN!) || latN! < -90 || latN! > 90))
      return toast.error("Latitude must be between -90 and 90.");
    if (lng && (Number.isNaN(lngN!) || lngN! < -180 || lngN! > 180))
      return toast.error("Longitude must be between -180 and 180.");
    setBusy(true);
    const res = await addSite({
      project_id: projectId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      latitude: latN,
      longitude: lngN,
      region: region.trim() || undefined,
      address: address.trim() || undefined,
      supply_envelope: supplyEnvelope.trim() || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Site ${name.trim()} added`);
      setOpen(false);
      setName("");
      setCode("");
      setRegion("");
      setAddress("");
      setLat("");
      setLng("");
      setSupplyEnvelope("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
           Add site
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a production site</DialogTitle>
          <DialogDescription>
            A site is a physical location where kilns operate and biochar piles are kept.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-[1fr_8rem] gap-4">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kodagu North" />
            </Field>
            <Field label="Code" required hint="Unique per project">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="S03" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Region">
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Karnataka" />
            </Field>
            <Field label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Village / landmark" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Latitude" hint="Decimal degrees">
              <Input type="number" step="any" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="12.4210" />
            </Field>
            <Field label="Longitude" hint="Decimal degrees">
              <Input type="number" step="any" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="75.7397" />
            </Field>
          </div>
          <Field label="Supply envelope" hint="Feedstock source area this site draws from">
            <Textarea
              value={supplyEnvelope}
              onChange={(e) => setSupplyEnvelope(e.target.value)}
              placeholder="e.g. Coffee-estate pruning residues within a 15 km radius"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Add site
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddKilnDialog({
  projectId,
  sites,
  defaultSiteId,
}: {
  projectId: string;
  sites: { id: string; name: string; code: string }[];
  defaultSiteId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [siteId, setSiteId] = React.useState(defaultSiteId ?? sites[0]?.id ?? "");
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [kilnType, setKilnType] = React.useState<string>(KILN_TYPES[0].key);
  const [capacity, setCapacity] = React.useState("");
  const [sopReference, setSopReference] = React.useState("");

  async function handleSubmit() {
    if (!siteId) return toast.error("Choose a site.");
    if (!name.trim()) return toast.error("Give the kiln a name.");
    if (!code.trim()) return toast.error("Give the kiln a short code (e.g. K2).");
    const cap = capacity ? Number(capacity) : null;
    if (capacity && (Number.isNaN(cap!) || cap! <= 0))
      return toast.error("Capacity must be a positive number of kg.");
    setBusy(true);
    const res = await addKiln({
      project_id: projectId,
      site_id: siteId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      kiln_type: kilnType as KilnType,
      capacity_kg: cap,
      sop_reference: sopReference.trim() || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Kiln ${name.trim()} added`);
      setOpen(false);
      setName("");
      setCode("");
      setCapacity("");
      setSopReference("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
           Add kiln
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a kiln</DialogTitle>
          <DialogDescription>
            Open-kiln methodology accepts cone and flame-curtain designs operated to an approved
            SOP.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Site" required>
            <NativeSelect value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid sm:grid-cols-[1fr_8rem] gap-4">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kon-Tiki 2" />
            </Field>
            <Field label="Code" required hint="Unique per site">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="K2" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Kiln type" required>
              <NativeSelect value={kilnType} onChange={(e) => setKilnType(e.target.value)}>
                {KILN_TYPES.map((k) => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Capacity (kg)" hint="Biochar per run">
              <Input
                type="number"
                min="0"
                inputMode="decimal"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 900"
              />
            </Field>
          </div>
          <Field label="SOP reference" hint="Standard operating procedure document">
            <Input value={sopReference} onChange={(e) => setSopReference(e.target.value)} placeholder="e.g. SOP-DOB-04 rev B" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Add kiln
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

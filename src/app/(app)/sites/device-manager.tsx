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
import { CopyButton } from "@/components/common/copy-button";
import {
  createIngestDevice,
  deleteIngestDevice,
  setIngestDeviceActive,
} from "@/lib/actions/devices";

export interface DeviceRow {
  id: string;
  label: string;
  kilnName: string | null;
  active: boolean;
  keyPrefix: string;
  /** Preformatted on the server so the list is stable across hydration. */
  lastSeenLabel: string;
}

interface Props {
  projectId: string;
  kilns: { id: string; name: string; site_id: string }[];
  devices: DeviceRow[];
  canManage: boolean;
}

/**
 * Sensor device registration. A field logger must hold a secret key before it
 * can post telemetry; this issues that key (shown once) and lists which devices
 * are reporting, so a kiln whose sensor has gone quiet is obvious.
 */
export function DeviceManager({ projectId, kilns, devices, canManage }: Props) {
  return (
    <div className="mt-10">
      <SectionHeader
        title="Sensor devices"
        action={canManage ? <AddDeviceDialog projectId={projectId} kilns={kilns} /> : undefined}
      />
      {devices.length === 0 ? (
        <EmptyState
          title="No sensor devices registered"
        />
      ) : (
        <Card>
          <CardContent className="pt-0 divide-y divide-border">
            {devices.map((d) => (
              <DeviceItem key={d.id} device={d} canManage={canManage} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DeviceItem({ device, canManage }: { device: DeviceRow; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function toggle() {
    setBusy(true);
    const res = await setIngestDeviceActive(device.id, !device.active);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(device.active ? "Device deactivated" : "Device reactivated");
      router.refresh();
    }
  }

  async function remove() {
    setBusy(true);
    const res = await deleteIngestDevice(device.id);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Device removed");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink truncate">{device.label}</span>
          <Badge tone={device.active ? "ok" : "neutral"} dot>
            {device.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {device.kilnName ?? "No kiln assigned"} · key{" "}
          <span className="font-mono">{device.keyPrefix}…</span> · {device.lastSeenLabel}
        </p>
      </div>
      {canManage && (
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="text-muted hover:text-ink transition-colors"
            aria-label={device.active ? "Deactivate" : "Reactivate"}
            title={device.active ? "Deactivate" : "Reactivate"}
          >
            </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-muted hover:text-err transition-colors"
            aria-label="Remove device"
          >
            {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : null}
          </button>
        </div>
      )}
    </div>
  );
}

function AddDeviceDialog({
  projectId,
  kilns,
}: {
  projectId: string;
  kilns: { id: string; name: string; site_id: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [kilnId, setKilnId] = React.useState(kilns[0]?.id ?? "");
  const [issuedKey, setIssuedKey] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (!label.trim()) return toast.error("Give the device a name.");
    setBusy(true);
    const kiln = kilns.find((k) =>k.id === kilnId);
    const res = await createIngestDevice({
      project_id: projectId,
      kiln_id: kilnId || null,
      site_id: kiln?.site_id ?? null,
      label: label.trim(),
    });
    setBusy(false);
    if (res?.error || !res?.key) {
      toast.error(res?.error ?? "Could not register the device.");
      return;
    }
    setIssuedKey(res.key);
    router.refresh();
  }

  function close() {
    setOpen(false);
    // Clear the key from memory once the dialog is dismissed.
    setIssuedKey(null);
    setLabel("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
           Add device
        </Button>
      </DialogTrigger>
      <DialogContent>
        {issuedKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Device key — copy it now</DialogTitle>
              <DialogDescription>
                Paste this into the logger&apos;s configuration. We store only a hash, so it cannot
                be shown again — if it is lost, remove the device and register a new one.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-ochre-soft bg-warn-tint px-3 py-2.5">
                <p className="text-sm text-[#8a5200] flex items-start gap-1.5">
              This is the only time this key is shown.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface/60 p-3">
                <p className="font-mono text-xs text-ink break-all">{issuedKey}</p>
                <div className="mt-2">
                  <CopyButton value={issuedKey} label="Copy key" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-soft mb-1">Point the device at</p>
                <div className="rounded-lg border border-border bg-surface/60 px-3 py-2 font-mono text-xs text-ink-soft">
                  POST /api/sensors/ingest
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Send the key as <span className="font-mono">Authorization: Bearer …</span>with
                  readings of <span className="font-mono">
                    {"{ reading_type, value, unit, recorded_at }"}
                  </span>.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Register a sensor device</DialogTitle>
              <DialogDescription>
                Issues a secret key the field logger uses to post readings. Readings from this
                device are attributed to the kiln you choose.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label="Device name" required hint="e.g. Kon-Tiki 1 thermocouple">
                <Input
                  value={label}
                  onChange={(e) =>setLabel(e.target.value)}
                  placeholder="Device name"
                />
              </Field>
              <Field label="Kiln" hint="Readings without an explicit kiln default to this one">
                <NativeSelect value={kilnId} onChange={(e) =>setKilnId(e.target.value)}>
                  <option value="">— unassigned —</option>
                  {kilns.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={busy}>
                {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Issue key
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

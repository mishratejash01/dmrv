"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Camera,
  MapPin,
  Loader2,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, NativeSelect, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { REQUIRED_RUN_PHOTOS } from "@/lib/methodology";
import { humanize } from "@/lib/utils";
import {
  queueRun,
  flushQueue,
  pendingCount,
  submitPendingRun,
  type PendingPhoto,
  type PendingRun,
} from "@/lib/offline/queue";

interface SiteOpt {
  id: string;
  name: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
  kilns: { id: string; name: string; code: string }[];
}
interface Props {
  projectId: string;
  operatorId: string;
  sites: SiteOpt[];
  batches: { id: string; code: string; status: string }[];
  feedstock: { id: string; source: string; category: string; weight_kg: number; moisture_pct: number }[];
}

type PhotoKey = "pyrolysis" | "flame_curtain" | "quench";

export function FieldCapture({ projectId, operatorId, sites, batches, feedstock }: Props) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [siteId, setSiteId] = React.useState(sites[0]?.id ?? "");
  const site = sites.find((s) => s.id === siteId);
  const [kilnId, setKilnId] = React.useState(sites[0]?.kilns[0]?.id ?? "");
  const [feedstockId, setFeedstockId] = React.useState(feedstock[0]?.id ?? "");
  const [batchId, setBatchId] = React.useState(batches[0]?.id ?? "");
  const [peakTemp, setPeakTemp] = React.useState("560");
  const [wetMass, setWetMass] = React.useState("");
  const [moisture, setMoisture] = React.useState("12");
  const [composite, setComposite] = React.useState("0.8");
  const [quench, setQuench] = React.useState("Water quench (rapid)");
  const [notes, setNotes] = React.useState("");
  const [anomaly, setAnomaly] = React.useState(false);
  const [photos, setPhotos] = React.useState<Partial<Record<PhotoKey, File>>>({});
  const [gps, setGps] = React.useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [busy, setBusy] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const [queued, setQueued] = React.useState(0);

  const refreshQueue = React.useCallback(() => pendingCount().then(setQueued), []);

  React.useEffect(() => {
    setOnline(navigator.onLine);
    refreshQueue();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
    const goOnline = () => {
      setOnline(true);
      flushQueue(supabase).then(({ synced }) => {
        if (synced > 0) toast.success(`Synced ${synced} queued run${synced > 1 ? "s" : ""}`);
        refreshQueue();
        router.refresh();
      });
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [supabase, refreshQueue, router]);

  // reset kiln when site changes
  React.useEffect(() => {
    if (site && !site.kilns.find((k) => k.id === kilnId)) {
      setKilnId(site.kilns[0]?.id ?? "");
    }
  }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  function setPhoto(key: PhotoKey, file: File | null) {
    setPhotos((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }

  const photoCount = Object.keys(photos).length;
  const missingPhotos = REQUIRED_RUN_PHOTOS.filter((p) => !photos[p.key as PhotoKey]);
  const canComplete = kilnId && wetMass && missingPhotos.length === 0;

  function buildCurve(peak: number) {
    const pts: { t: number; temp: number }[] = [];
    for (let t = 0; t <= 120; t += 15) {
      const frac = t <= 45 ? t / 45 : t <= 90 ? 1 : 1 - (t - 90) / 60;
      pts.push({ t, temp: Math.round(120 + frac * (peak - 120)) });
    }
    return pts;
  }

  async function handleSubmit(status: "draft" | "submitted") {
    if (!kilnId) return toast.error("Choose a kiln.");
    if (status === "submitted" && !canComplete) {
      return toast.error(
        `To submit, add biochar mass and all required photos (${missingPhotos.map((p) => p.label).join(", ")}).`,
      );
    }
    setBusy(true);
    const now = new Date();
    const start = new Date(now.getTime() - 3 * 3600 * 1000);
    const lat = gps.lat ?? site?.latitude ?? null;
    const lng = gps.lng ?? site?.longitude ?? null;
    const peak = Number(peakTemp) || 0;

    const pendingPhotos: PendingPhoto[] = (Object.keys(photos) as PhotoKey[]).map((k) => ({
      type: k,
      blob: photos[k] as File,
      latitude: lat,
      longitude: lng,
    }));

    const entry: PendingRun = {
      clientRef: crypto.randomUUID(),
      createdAt: Date.now(),
      payload: {
        project_id: projectId,
        site_id: siteId,
        kiln_id: kilnId,
        operator_id: operatorId,
        feedstock_batch_id: feedstockId || null,
        production_batch_id: batchId || null,
        started_at: start.toISOString(),
        ended_at: now.toISOString(),
        peak_temp_c: peak || null,
        temperature_curve: buildCurve(peak),
        latitude: lat,
        longitude: lng,
        biochar_wet_kg: wetMass ? Number(wetMass) : null,
        biochar_moisture_pct: moisture ? Number(moisture) : null,
        composite_sample_kg: composite ? Number(composite) : null,
        quench_method: quench || null,
        quenched_at: now.toISOString(),
        notes: notes || null,
        anomaly_flag: anomaly,
        status,
      },
      photos: pendingPhotos,
    };

    try {
      if (navigator.onLine) {
        await submitPendingRun(supabase, entry);
        toast.success(status === "submitted" ? "Run submitted for review" : "Draft saved");
        router.push("/runs");
        router.refresh();
      } else {
        await queueRun(entry);
        await refreshQueue();
        toast.message("Saved offline — will sync when you reconnect.", { icon: <CloudOff /> });
        resetForm();
      }
    } catch (e) {
      // Network hiccup while "online": fall back to the offline queue.
      await queueRun(entry);
      await refreshQueue();
      toast.message("Couldn't reach the server — queued for sync.", {
        description: e instanceof Error ? e.message : undefined,
        icon: <CloudOff />,
      });
      resetForm();
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setWetMass("");
    setNotes("");
    setAnomaly(false);
    setPhotos({});
  }

  async function syncNow() {
    setBusy(true);
    const { synced, failed } = await flushQueue(supabase);
    await refreshQueue();
    setBusy(false);
    if (synced) toast.success(`Synced ${synced} run${synced > 1 ? "s" : ""}`);
    if (failed) toast.error(`${failed} still queued — check your connection.`);
    router.refresh();
  }

  if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted">
          You aren&apos;t assigned to any active site yet. Ask your project developer to add you.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 max-w-5xl">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-clay" /> Kiln run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Site" required>
                <NativeSelect value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Kiln" required>
                <NativeSelect value={kilnId} onChange={(e) => setKilnId(e.target.value)}>
                  {site?.kilns.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                  {(!site || site.kilns.length === 0) && <option value="">No kilns</option>}
                </NativeSelect>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Feedstock delivery">
                <NativeSelect value={feedstockId} onChange={(e) => setFeedstockId(e.target.value)}>
                  <option value="">— none —</option>
                  {feedstock.map((f) => (
                    <option key={f.id} value={f.id}>
                      {humanize(f.category)} · {f.source} ({f.weight_kg} kg)
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Production batch" hint="Open batches only">
                <NativeSelect value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                  <option value="">— unassigned —</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.code}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="grid sm:grid-cols-4 gap-4">
              <Field label="Peak temp (°C)">
                <Input type="number" value={peakTemp} onChange={(e) => setPeakTemp(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="Biochar mass (kg)" required>
                <Input type="number" value={wetMass} onChange={(e) => setWetMass(e.target.value)} placeholder="e.g. 850" inputMode="decimal" />
              </Field>
              <Field label="Moisture (%)">
                <Input type="number" value={moisture} onChange={(e) => setMoisture(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="Sample (kg)" hint="Site pile">
                <Input type="number" value={composite} onChange={(e) => setComposite(e.target.value)} inputMode="decimal" />
              </Field>
            </div>

            <Field label="Quench method">
              <Input value={quench} onChange={(e) => setQuench(e.target.value)} />
            </Field>

            <Field label="Notes / anomalies">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything unusual about this burn?" />
            </Field>

            <label className="flex items-center gap-2.5 text-sm text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={anomaly}
                onChange={(e) => setAnomaly(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong accent-[#b08056]"
              />
              <AlertTriangle className="h-4 w-4 text-ochre" /> Flag an anomaly for supervisor attention
            </label>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-clay" /> Required evidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              {REQUIRED_RUN_PHOTOS.map((p) => {
                const key = p.key as PhotoKey;
                const file = photos[key];
                return (
                  <div key={key}>
                    <p className="text-xs font-medium text-ink-soft mb-1.5">{p.label}</p>
                    <label
                      className={`relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
                        file ? "border-sage bg-sage-tint/40" : "border-border-strong bg-surface/40 hover:border-clay"
                      }`}
                    >
                      {file ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(file)} alt={p.label} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setPhoto(key, null);
                            }}
                            className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-elevated"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-muted">
                          <Camera className="h-5 w-5" />
                          <span className="text-xs">Add photo</span>
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => setPhoto(key, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">
              Open-kiln runs require photos of the clean pyrolysis process, flame curtain and quench
              before they can be submitted.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: status + actions */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Connection</span>
              {online ? (
                <Badge tone="ok" dot>Online</Badge>
              ) : (
                <Badge tone="warn" dot>Offline</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> GPS
              </span>
              <span className="text-sm text-ink tnum">
                {gps.lat != null ? `${gps.lat.toFixed(3)}, ${gps.lng?.toFixed(3)}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Photos</span>
              <span className="text-sm text-ink">{photoCount} / 3</span>
            </div>
            {queued > 0 && (
              <div className="rounded-lg border border-ochre-soft bg-warn-tint px-3 py-2.5">
                <p className="text-sm text-[#8a6f22] flex items-center gap-1.5">
                  <CloudOff className="h-4 w-4" /> {queued} run{queued > 1 ? "s" : ""} queued offline
                </p>
                <Button variant="secondary" size="sm" className="w-full mt-2" onClick={syncNow} disabled={busy}>
                  <RefreshCw className="h-3.5 w-3.5" /> Sync now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2 sticky top-20">
          <Button className="w-full" size="lg" disabled={busy || !canComplete} onClick={() => handleSubmit("submitted")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Submit for review
          </Button>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => handleSubmit("draft")}>
            Save as draft
          </Button>
          {!canComplete && (
            <p className="text-xs text-muted text-center px-2">
              Add biochar mass and all three photos to submit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

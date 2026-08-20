"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Fire16Regular,
  Camera16Regular,
  Location16Regular,
  SpinnerIos16Regular,
  CheckmarkCircle16Regular,
  CloudOff16Regular,
  ArrowSync16Regular,
  Warning16Regular,
  Sparkle16Regular,
  Temperature16Regular,
  Dismiss16Regular,
} from "@/components/common/icons";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, NativeSelect, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { REQUIRED_RUN_PHOTOS, OPTIONAL_RUN_PHOTOS } from "@/lib/methodology";
import { humanize, fmt } from "@/lib/utils";
import type { Database } from "@/lib/types/database";
import {
  queueRun,
  flushQueue,
  pendingCount,
  submitPendingRun,
  type PendingPhoto,
  type PendingRun,
} from "@/lib/offline/queue";

type MeasurementSource = Database["public"]["Enums"]["measurement_source"];

interface KilnOpt {
  id: string;
  name: string;
  code: string;
  charYieldPct: number;
  defaultMoisturePct: number;
}
interface SiteOpt {
  id: string;
  name: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
  kilns: KilnOpt[];
}
interface Props {
  projectId: string;
  operatorId: string;
  sites: SiteOpt[];
  batches: { id: string; code: string; status: string }[];
  feedstock: { id: string; source: string; category: string; weight_kg: number; moisture_pct: number }[];
}

type PhotoKey = "pyrolysis" | "flame_curtain" | "quench";
type OptKey = (typeof OPTIONAL_RUN_PHOTOS)[number]["key"];

export function FieldCapture({ projectId, operatorId, sites, batches, feedstock }: Props) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [siteId, setSiteId] = React.useState(sites[0]?.id ?? "");
  const site = sites.find((s) => s.id === siteId);
  const [kilnId, setKilnId] = React.useState(sites[0]?.kilns[0]?.id ?? "");
  const [feedstockId, setFeedstockId] = React.useState(feedstock[0]?.id ?? "");
  const [batchId, setBatchId] = React.useState(batches[0]?.id ?? "");
  const [peakTemp, setPeakTemp] = React.useState("560");
  const [composite, setComposite] = React.useState("0.8");
  const [quench, setQuench] = React.useState("Water quench (rapid)");
  const [notes, setNotes] = React.useState("");
  const [anomaly, setAnomaly] = React.useState(false);
  const [photos, setPhotos] = React.useState<Partial<Record<PhotoKey, File>>>({});
  const [optPhotos, setOptPhotos] = React.useState<Partial<Record<OptKey, File>>>({});
  const [gps, setGps] = React.useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [busy, setBusy] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const [queued, setQueued] = React.useState(0);

  // Biochar measurement: derived by reverse-calculation from the feedstock by
  // default; a computer-vision estimate or a manual override can supersede it.
  const [manualBiochar, setManualBiochar] = React.useState(false);
  const [manualWet, setManualWet] = React.useState("");
  const [manualMoisture, setManualMoisture] = React.useState("12");
  const [cvResult, setCvResult] = React.useState<{ wetKg: number; moisturePct: number } | null>(null);
  const [cvBusy, setCvBusy] = React.useState(false);

  const kiln = site?.kilns.find((k) => k.id === kilnId);
  const selectedFeedstock = feedstock.find((f) => f.id === feedstockId);
  const feedstockDryKg = selectedFeedstock
    ? selectedFeedstock.weight_kg * (1 - selectedFeedstock.moisture_pct / 100)
    : 0;
  const yieldPct = kiln?.charYieldPct ?? 20;
  const kilnMoisture = kiln?.defaultMoisturePct ?? 12;
  const estDryKg = (feedstockDryKg * yieldPct) / 100;
  const estWetKg = kilnMoisture > 0 && kilnMoisture < 100 ? estDryKg / (1 - kilnMoisture / 100) : estDryKg;
  const canReverseCalc = feedstockDryKg > 0 && yieldPct > 0;

  // Resolve the effective biochar figures + where they came from.
  let effWetKg = 0;
  let effMoisture = kilnMoisture;
  let biocharSource: MeasurementSource = "manual";
  if (manualBiochar) {
    effWetKg = Number(manualWet) || 0;
    effMoisture = Number(manualMoisture) || 0;
    biocharSource = "manual";
  } else if (cvResult) {
    effWetKg = cvResult.wetKg;
    effMoisture = cvResult.moisturePct;
    biocharSource = "computer_vision";
  } else if (canReverseCalc) {
    effWetKg = estWetKg;
    effMoisture = kilnMoisture;
    biocharSource = "reverse_calc";
  }

  const refreshQueue = React.useCallback(() => pendingCount().then(setQueued), []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync to browser online state on mount
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset kiln when the site changes
      setKilnId(site.kilns[0]?.id ?? "");
    }
  }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // A change of feedstock or kiln invalidates any prior computer-vision estimate.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale CV estimate on input change
    setCvResult(null);
  }, [feedstockId, kilnId]);

  // Object URLs for previews are created once per file and revoked when
  // replaced or on unmount, to avoid leaking blob URLs.
  const [previews, setPreviews] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    return () => {
      Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setPhotoFile(key: string, file: File | null) {
    setPreviews((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]);
      const next = { ...prev };
      if (file) next[key] = URL.createObjectURL(file);
      else delete next[key];
      return next;
    });
  }
  function setRequiredPhoto(key: PhotoKey, file: File | null) {
    setPhotoFile(`req:${key}`, file);
    setPhotos((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }
  function setOptionalPhoto(key: OptKey, file: File | null) {
    setPhotoFile(`opt:${key}`, file);
    setOptPhotos((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }

  const photoCount = Object.keys(photos).length;
  const missingPhotos = REQUIRED_RUN_PHOTOS.filter((p) => !photos[p.key as PhotoKey]);
  const canComplete = kilnId && effWetKg > 0 && missingPhotos.length === 0;

  function buildCurve(peak: number) {
    const pts: { t: number; temp: number }[] = [];
    for (let t = 0; t <= 120; t += 15) {
      const frac = t <= 45 ? t / 45 : t <= 90 ? 1 : 1 - (t - 90) / 60;
      pts.push({ t, temp: Math.round(120 + frac * (peak - 120)) });
    }
    return pts;
  }

  async function estimateFromPhoto() {
    const photo = optPhotos["biochar_weight"] ?? optPhotos["biochar_sample"];
    if (!photo) return toast.error("Add a 'biochar on the scale' photo first.");
    setCvBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", photo);
      if (kilnId) fd.append("kiln_id", kilnId);
      const res = await fetch("/api/vision/estimate", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.available) {
        toast.message(
          json?.message ?? "The computer-vision model isn't connected yet — using reverse-calculation.",
        );
      } else {
        setCvResult({ wetKg: Number(json.wet_kg), moisturePct: Number(json.moisture_pct ?? kilnMoisture) });
        setManualBiochar(false);
        toast.success(`Estimated ${Math.round(Number(json.wet_kg))} kg from the photo`);
      }
    } catch {
      toast.error("Couldn't reach the estimator.");
    } finally {
      setCvBusy(false);
    }
  }

  async function handleSubmit(status: "draft" | "submitted") {
    if (!kilnId) return toast.error("Choose a kiln.");
    if (status === "submitted" && !canComplete) {
      const need = [
        effWetKg > 0 ? null : "biochar mass (select a feedstock or enter it manually)",
        ...missingPhotos.map((p) => p.label),
      ].filter(Boolean);
      return toast.error(`To submit, add: ${need.join(", ")}.`);
    }
    setBusy(true);
    const now = new Date();
    const start = new Date(now.getTime() - 3 * 3600 * 1000);
    const lat = gps.lat ?? site?.latitude ?? null;
    const lng = gps.lng ?? site?.longitude ?? null;

    // Temperature: prefer sensor readings for this kiln over the run window;
    // fall back to the manually entered peak when there are none.
    let peak = Number(peakTemp) || 0;
    let curve = buildCurve(peak);
    let tempSource: MeasurementSource = "manual";
    if (navigator.onLine && kilnId) {
      try {
        const { data } = await supabase.rpc("fn_run_temperature", {
          p_kiln: kilnId,
          p_start: start.toISOString(),
          p_end: now.toISOString(),
        });
        const row = Array.isArray(data) ? data[0] : data;
        if (row && Number(row.sample_count) > 0 && row.peak_temp_c != null) {
          peak = Number(row.peak_temp_c);
          curve = (row.curve as { t: number; temp: number }[]) ?? curve;
          tempSource = "sensor";
        }
      } catch {
        /* sensor read failed — keep the manual fallback */
      }
    }

    const allPhotos: { key: string; type: PendingPhoto["type"]; file: File }[] = [
      ...(Object.keys(photos) as PhotoKey[]).map((k) => ({ key: k, type: k as PendingPhoto["type"], file: photos[k] as File })),
      ...(Object.keys(optPhotos) as OptKey[]).map((k) => ({ key: k, type: k as PendingPhoto["type"], file: optPhotos[k] as File })),
    ];
    const pendingPhotos: PendingPhoto[] = allPhotos.map((p) => ({
      type: p.type,
      blob: p.file,
      latitude: lat,
      longitude: lng,
    }));

    const entry: PendingRun = {
      clientRef: crypto.randomUUID(),
      createdAt: now.getTime(),
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
        temperature_curve: curve,
        temp_source: tempSource,
        biochar_source: biocharSource,
        latitude: lat,
        longitude: lng,
        biochar_wet_kg: effWetKg > 0 ? Math.round(effWetKg * 100) / 100 : null,
        biochar_moisture_pct: effMoisture,
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
        toast.message("Saved offline — will sync when you reconnect.", { icon: <CloudOff16Regular /> });
        resetForm();
      }
    } catch (e) {
      await queueRun(entry);
      await refreshQueue();
      toast.message("Couldn't reach the server — queued for sync.", {
        description: e instanceof Error ? e.message : undefined,
        icon: <CloudOff16Regular />,
      });
      resetForm();
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setManualWet("");
    setNotes("");
    setAnomaly(false);
    setCvResult(null);
    setManualBiochar(false);
    setPreviews((prev) => {
      Object.values(prev).forEach((u) => u && URL.revokeObjectURL(u));
      return {};
    });
    setPhotos({});
    setOptPhotos({});
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

  // Shared photo-tile renderer (plain function, not a component).
  function photoTile(opts: {
    label: string;
    previewKey: string;
    file: File | undefined;
    onPick: (f: File | null) => void;
  }) {
    const { label, previewKey, file, onPick } = opts;
    return (
      <div>
        <p className="text-xs font-medium text-ink-soft mb-1.5">{label}</p>
        <label
          className={`relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
            file ? "border-sage bg-sage-tint/40" : "border-border-strong bg-surface/40 hover:border-clay"
          }`}
        >
          {file ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[previewKey]} alt={label} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPick(null);
                }}
                className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-elevated"
              >
                <Dismiss16Regular className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1 text-muted">
              <Camera16Regular className="h-5 w-5" />
              <span className="text-xs">Add photo</span>
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    );
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
    <div className="grid lg:grid-cols-3 gap-4 max-w-5xl">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fire16Regular className="h-4 w-4 text-clay" /> Kiln run
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
              <Field label="Feedstock delivery" hint="Drives the biochar reverse-calculation">
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

            {/* Temperature — sensor-sourced, manual fallback */}
            <Field
              label="Peak temp (°C)"
              hint="Auto-filled from the kiln sensor at submit when readings exist; otherwise this value is used"
            >
              <div className="relative">
                <Temperature16Regular className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  className="pl-9"
                  type="number"
                  value={peakTemp}
                  onChange={(e) => setPeakTemp(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            </Field>

            {/* Biochar mass — reverse-calc / CV / manual */}
            <div className="rounded-lg border border-border bg-surface/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink flex items-center gap-1.5">
                  Biochar mass
                  {!manualBiochar && biocharSource === "reverse_calc" && (
                    <Badge tone="info">Reverse-calc</Badge>
                  )}
                  {!manualBiochar && biocharSource === "computer_vision" && (
                    <Badge tone="clay">Computer vision</Badge>
                  )}
                  {manualBiochar && <Badge tone="neutral">Manual</Badge>}
                </span>
                {!manualBiochar ? (
                  <button
                    type="button"
                    className="text-xs text-clay hover:underline"
                    onClick={() => {
                      setManualBiochar(true);
                      if (effWetKg > 0 && !manualWet) setManualWet(String(Math.round(effWetKg)));
                      setManualMoisture(String(effMoisture));
                    }}
                  >
                    Enter manually
                  </button>
                ) : (
                  canReverseCalc && (
                    <button
                      type="button"
                      className="text-xs text-clay hover:underline"
                      onClick={() => setManualBiochar(false)}
                    >
                      Use reverse-calc
                    </button>
                  )
                )}
              </div>

              {!manualBiochar ? (
                effWetKg > 0 ? (
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-display text-2xl text-ink tnum">{fmt(effWetKg, 0)} kg</span>
                    <span className="text-xs text-muted">
                      {biocharSource === "reverse_calc"
                        ? `${fmt(feedstockDryKg, 0)} kg dry feedstock × ${fmt(yieldPct, 0)}% yield, ${fmt(effMoisture, 0)}% moisture`
                        : `from photo · ${fmt(effMoisture, 0)}% moisture`}
                    </span>
                    <span className="text-xs text-muted">
                      ≈ {fmt(effWetKg * (1 - effMoisture / 100), 0)} kg dry
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Select a feedstock delivery to reverse-calculate the biochar mass, or enter it
                    manually.
                  </p>
                )
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Biochar mass (kg, wet)" required>
                    <Input
                      type="number"
                      value={manualWet}
                      onChange={(e) => setManualWet(e.target.value)}
                      placeholder="e.g. 850"
                      inputMode="decimal"
                    />
                  </Field>
                  <Field label="Moisture (%)">
                    <Input
                      type="number"
                      value={manualMoisture}
                      onChange={(e) => setManualMoisture(e.target.value)}
                      inputMode="decimal"
                    />
                  </Field>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={estimateFromPhoto}
                  disabled={cvBusy}
                >
                  {cvBusy ? <SpinnerIos16Regular className="h-3.5 w-3.5 animate-spin" /> : <Sparkle16Regular className="h-3.5 w-3.5" />}
                  Estimate from photo
                </Button>
                <span className="text-xs text-muted">Uses the biochar-scale photo below</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Sample (kg)" hint="Site pile">
                <Input type="number" value={composite} onChange={(e) => setComposite(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="Quench method">
                <Input value={quench} onChange={(e) => setQuench(e.target.value)} />
              </Field>
            </div>

            <Field label="Notes / anomalies">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything unusual about this burn?" />
            </Field>

            <label className="flex items-center gap-2.5 text-sm text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={anomaly}
                onChange={(e) => setAnomaly(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong accent-[#06805a]"
              />
              <Warning16Regular className="h-4 w-4 text-ochre" /> Flag an anomaly for supervisor attention
            </label>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera16Regular className="h-4 w-4 text-clay" /> Required evidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              {REQUIRED_RUN_PHOTOS.map((p) =>
                photoTile({
                  label: p.label,
                  previewKey: `req:${p.key}`,
                  file: photos[p.key as PhotoKey],
                  onPick: (f) => setRequiredPhoto(p.key as PhotoKey, f),
                }),
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              Open-kiln runs require photos of the clean pyrolysis process, flame curtain and quench
              before they can be submitted.
            </p>

            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-medium text-ink-soft mb-2.5">
                Measurement evidence <span className="text-muted font-normal">· optional — feeds the biochar/moisture estimate</span>
              </p>
              <div className="grid sm:grid-cols-4 gap-3">
                {OPTIONAL_RUN_PHOTOS.map((p) =>
                  photoTile({
                    label: p.label,
                    previewKey: `opt:${p.key}`,
                    file: optPhotos[p.key as OptKey],
                    onPick: (f) => setOptionalPhoto(p.key as OptKey, f),
                  }),
                )}
              </div>
            </div>
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
                <Location16Regular className="h-3.5 w-3.5" /> GPS
              </span>
              <span className="text-sm text-ink tnum">
                {gps.lat != null ? `${gps.lat.toFixed(3)}, ${gps.lng?.toFixed(3)}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Required photos</span>
              <span className="text-sm text-ink">{photoCount} / 3</span>
            </div>
            {queued > 0 && (
              <div className="rounded-lg border border-ochre-soft bg-warn-tint px-3 py-2.5">
                <p className="text-sm text-[#8a5200] flex items-center gap-1.5">
                  <CloudOff16Regular className="h-4 w-4" /> {queued} run{queued > 1 ? "s" : ""} queued offline
                </p>
                <Button variant="secondary" size="sm" className="w-full mt-2" onClick={syncNow} disabled={busy}>
                  <ArrowSync16Regular className="h-3.5 w-3.5" /> Sync now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2 sticky top-20">
          <Button className="w-full" size="lg" disabled={busy || !canComplete} onClick={() => handleSubmit("submitted")}>
            {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : <CheckmarkCircle16Regular className="h-4 w-4" />}
            Submit for review
          </Button>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => handleSubmit("draft")}>
            Save16Regular as draft
          </Button>
          {!canComplete && (
            <p className="text-xs text-muted text-center px-2">
              Add biochar mass (feedstock or manual) and all three required photos to submit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

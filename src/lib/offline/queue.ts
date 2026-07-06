"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { BUCKETS } from "@/lib/storage";

export interface PendingPhoto {
  type: "pyrolysis" | "flame_curtain" | "quench" | "other";
  blob: Blob;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PendingRun {
  clientRef: string;
  createdAt: number;
  payload: {
    project_id: string;
    site_id: string;
    kiln_id: string;
    operator_id: string;
    feedstock_batch_id?: string | null;
    production_batch_id?: string | null;
    code?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
    peak_temp_c?: number | null;
    temperature_curve?: { t: number; temp: number }[];
    latitude?: number | null;
    longitude?: number | null;
    biochar_wet_kg?: number | null;
    biochar_moisture_pct?: number | null;
    composite_sample_kg?: number | null;
    quench_method?: string | null;
    quenched_at?: string | null;
    notes?: string | null;
    anomaly_flag?: boolean;
    status: "draft" | "submitted";
  };
  photos: PendingPhoto[];
}

const DB_NAME = "rainbow-dmrv";
const STORE = "pending_runs";

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "clientRef" });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueRun(entry: PendingRun) {
  const database = await db();
  await database.put(STORE, entry);
}

export async function getPendingRuns(): Promise<PendingRun[]> {
  const database = await db();
  return (await database.getAll(STORE)) as PendingRun[];
}

export async function removePending(clientRef: string) {
  const database = await db();
  await database.delete(STORE, clientRef);
}

export async function pendingCount(): Promise<number> {
  const database = await db();
  return database.count(STORE);
}

type Client = SupabaseClient<Database>;

/**
 * Submit one run to Supabase: idempotent insert (by operator + client_ref),
 * then upload photos and insert photo + composite-sample rows.
 */
export async function submitPendingRun(supabase: Client, entry: PendingRun): Promise<void> {
  const p = entry.payload;

  // Idempotency: reuse an existing run for this client_ref if present.
  const { data: existing } = await supabase
    .from("kiln_runs")
    .select("id")
    .eq("operator_id", p.operator_id)
    .eq("client_ref", entry.clientRef)
    .maybeSingle();

  let runId = existing?.id;
  if (!runId) {
    const { data, error } = await supabase
      .from("kiln_runs")
      .insert({ ...p, client_ref: entry.clientRef, submitted_at: p.status === "submitted" ? new Date().toISOString() : null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    runId = data.id;

    // photos
    for (const photo of entry.photos) {
      const path = `${p.project_id}/${runId}/${photo.type}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKETS.runPhotos)
        .upload(path, photo.blob, { upsert: true, contentType: photo.blob.type || "image/jpeg" });
      if (!upErr) {
        await supabase.from("run_photos").insert({
          kiln_run_id: runId,
          photo_type: photo.type,
          storage_path: path,
          latitude: photo.latitude ?? p.latitude ?? null,
          longitude: photo.longitude ?? p.longitude ?? null,
          taken_at: new Date().toISOString(),
        });
      }
    }

    // composite-sample contribution
    if (p.composite_sample_kg && p.production_batch_id) {
      await supabase.from("composite_samples").insert({
        production_batch_id: p.production_batch_id,
        site_id: p.site_id,
        kiln_run_id: runId,
        mass_kg: p.composite_sample_kg,
        stage: "site_pile",
      });
    }
  }
}

/** Flush all queued runs; returns how many synced. */
export async function flushQueue(supabase: Client): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingRuns();
  let synced = 0;
  let failed = 0;
  for (const entry of pending) {
    try {
      await submitPendingRun(supabase, entry);
      await removePending(entry.clientRef);
      synced += 1;
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}

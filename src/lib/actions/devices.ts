"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { friendlyError } from "@/lib/actions/errors";

/**
 * Register a sensor ingestion device and issue its secret key.
 *
 * The key is generated here (server-side, cryptographically random) and
 * returned to the caller EXACTLY ONCE so it can be pasted into the field
 * logger. Only its SHA-256 hash is persisted — the same hash the ingestion
 * route compares against — so a leaked database never yields a working key.
 */
export async function createIngestDevice(input: {
  project_id: string;
  kiln_id?: string | null;
  site_id?: string | null;
  label: string;
}) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  // 32 random bytes → 64 hex chars, prefixed so a stray key is recognisable.
  const key = `acres_sk_${randomBytes(32).toString("hex")}`;
  const keyHash = createHash("sha256").update(key).digest("hex");

  const { error } = await supabase.from("ingest_devices").insert({
    project_id: input.project_id,
    kiln_id: input.kiln_id || null,
    site_id: input.site_id || null,
    label: input.label,
    key_hash: keyHash,
    key_prefix: key.slice(0, 17),
    created_by: user.id,
  });
  if (error) return { error: friendlyError(error) };

  revalidatePath("/sites");
  // The only time this value ever leaves the server.
  return { ok: true as const, key };
}

/** Deactivate a device without deleting its telemetry history. */
export async function setIngestDeviceActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("ingest_devices").update({ active }).eq("id", id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/sites");
  return { ok: true };
}

/** Remove a device. Its readings are retained (device_id is set null). */
export async function deleteIngestDevice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ingest_devices").delete().eq("id", id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/sites");
  return { ok: true };
}

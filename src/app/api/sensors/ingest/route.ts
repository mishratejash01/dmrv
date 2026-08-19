import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sensor telemetry ingestion — the connection point for real field devices
 * (temperature loggers, IoT gateways). A device authenticates with its secret
 * key (sent as a Bearer token or x-device-key header); we compare only its
 * SHA-256 hash, resolve the device inside fn_ingest_sensor_reading, and insert
 * the reading atomically. No device connected yet simply means no readings —
 * the app never fabricates telemetry.
 *
 * POST body (either shape):
 *   { reading_type, value, unit?, recorded_at?, kiln_id?, metadata? }
 *   { readings: [ { ...as above } ] }
 */

export const runtime = "nodejs";

const READING_TYPES = new Set(["temperature", "moisture", "mass", "other"]);

type ReadingInput = {
  reading_type?: string;
  value?: number | string;
  unit?: string | null;
  recorded_at?: string | null;
  kiln_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function extractKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const header = req.headers.get("x-device-key");
  return header?.trim() || null;
}

export async function POST(req: Request) {
  const key = extractKey(req);
  if (!key) {
    return NextResponse.json({ error: "Missing device key" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const list: ReadingInput[] = Array.isArray((body as { readings?: unknown })?.readings)
    ? ((body as { readings: ReadingInput[] }).readings)
    : [body as ReadingInput];

  if (list.length === 0) {
    return NextResponse.json({ error: "No readings provided" }, { status: 400 });
  }
  if (list.length > 500) {
    return NextResponse.json({ error: "Too many readings in one request (max 500)" }, { status: 413 });
  }

  const keyHash = createHash("sha256").update(key).digest("hex");
  const admin = createAdminClient();

  const ids: string[] = [];
  let authFailed = false;
  const errors: string[] = [];

  for (const r of list) {
    const type = String(r.reading_type ?? "");
    const value = typeof r.value === "string" ? Number(r.value) : r.value;
    if (!READING_TYPES.has(type)) {
      errors.push(`unknown reading_type '${type}'`);
      continue;
    }
    if (value == null || Number.isNaN(value)) {
      errors.push("missing or non-numeric value");
      continue;
    }
    const { data, error } = await admin.rpc("fn_ingest_sensor_reading", {
      p_key_hash: keyHash,
      p_reading_type: type as "temperature" | "moisture" | "mass" | "other",
      p_value: value,
      p_unit: r.unit ?? null,
      p_recorded_at: r.recorded_at ?? new Date().toISOString(),
      p_kiln_id: r.kiln_id ?? undefined,
      p_metadata: (r.metadata ?? {}) as never,
    });
    if (error) {
      // 28000 = our "unknown or inactive device key" — reject the whole request.
      if (error.code === "28000" || /device key/i.test(error.message)) {
        authFailed = true;
        break;
      }
      errors.push(error.message);
      continue;
    }
    if (typeof data === "string") ids.push(data);
  }

  if (authFailed) {
    return NextResponse.json({ error: "Unknown or inactive device key" }, { status: 401 });
  }

  return NextResponse.json({ ingested: ids.length, ids, errors: errors.length ? errors : undefined });
}

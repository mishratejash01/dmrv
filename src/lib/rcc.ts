/**
 * Rainbow Carbon Credit (RCC) serial-number helpers.
 *
 * Format:  RCC-BIO-{CC}-{PROJECT}-{VINTAGE}-{RMV|AVD}-{NNNNNN}
 *   RCC      registry / asset marker (Rainbow Carbon Credit)
 *   BIO      asset class — biochar
 *   CC       ISO country code (geography)         e.g. IN
 *   PROJECT  short project code                   e.g. P001
 *   VINTAGE  crediting year                       e.g. 2026
 *   RMV/AVD  mechanism — removal / avoidance
 *   NNNNNN   zero-padded sequence, unique per (project, mechanism, vintage)
 *
 * Example:  RCC-BIO-IN-P001-2026-RMV-000001
 *
 * Serials are generated deterministically by a Postgres function on issuance
 * (see supabase/migrations) so uniqueness is guaranteed at the database.
 */

import { BUFFER_POOL } from "./methodology";

export interface ParsedSerial {
  valid: boolean;
  registry?: string;
  asset?: string;
  country?: string;
  project?: string;
  vintage?: string;
  mechanism?: "RMV" | "AVD";
  mechanismLabel?: string;
  sequence?: string;
}

const SERIAL_RE = /^RCC-BIO-([A-Z]{2})-([A-Z0-9]+)-(\d{4})-(RMV|AVD)-(\d{6})$/;

export function parseSerial(serial: string): ParsedSerial {
  const m = SERIAL_RE.exec(serial.trim().toUpperCase());
  if (!m) return { valid: false };
  return {
    valid: true,
    registry: "RCC",
    asset: "BIO",
    country: m[1],
    project: m[2],
    vintage: m[3],
    mechanism: m[4] as "RMV" | "AVD",
    mechanismLabel: m[4] === "RMV" ? "Removal" : "Avoidance",
    sequence: m[5],
  };
}

export function formatSerial(params: {
  country: string;
  projectCode: string;
  vintage: number | string;
  mechanism: "removal" | "avoidance" | "RMV" | "AVD";
  sequence: number;
}): string {
  const mech =
    params.mechanism === "removal" || params.mechanism === "RMV" ? "RMV" : "AVD";
  const seq = String(params.sequence).padStart(6, "0");
  return `RCC-BIO-${params.country.toUpperCase()}-${params.projectCode.toUpperCase()}-${params.vintage}-${mech}-${seq}`;
}

/** Buffer contribution: 2% of verified removal credits, rounded UP to whole credits. */
export function bufferContribution(removalCredits: number): number {
  return Math.ceil(removalCredits * BUFFER_POOL.minFraction);
}

/** Net credits available to the developer after the buffer is set aside. */
export function netAfterBuffer(removalCredits: number): number {
  return removalCredits - bufferContribution(removalCredits);
}

export const CREDIT_STATUS_META: Record<
  string,
  { label: string; tone: "ok" | "warn" | "err" | "info" | "neutral"; description: string }
> = {
  issued: { label: "Issued", tone: "info", description: "Verified & issued ex-post; available." },
  verified: { label: "Verified", tone: "ok", description: "Confirmed by the VVB audit." },
  retired: { label: "Retired", tone: "ok", description: "Locked to a beneficiary; cannot be reused." },
  cancelled: { label: "Cancelled", tone: "err", description: "Invalidated — reversal or error." },
  buffer: { label: "Buffer", tone: "warn", description: "Allocated to the Rainbow Buffer Pool." },
  transferred: { label: "Transferred", tone: "info", description: "Ownership moved to a new holder." },
};

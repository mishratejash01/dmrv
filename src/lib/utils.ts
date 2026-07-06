import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with thousands separators and fixed decimals. */
export function fmt(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** Compact tonnes / credits formatting. */
export function fmtTonnes(n: number | null | undefined, dp = 1): string {
  if (n === null || n === undefined) return "—";
  return `${fmt(n, dp)} t`;
}

export function fmtCo2(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined) return "—";
  return `${fmt(n, dp)} tCO₂e`;
}

export function fmtPct(n: number | null | undefined, dp = 1): string {
  if (n === null || n === undefined) return "—";
  return `${fmt(n, dp)}%`;
}

/** Human date, e.g. "6 Jul 2026". */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative "time ago". */
export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  const table: [number, string][] = [
    [60, "s"],
    [3600, "m"],
    [86400, "h"],
    [604800, "d"],
    [2629800, "w"],
    [31557600, "mo"],
  ];
  if (secs < 60) return "just now";
  for (let i = table.length - 1; i >= 0; i--) {
    const [div, unit] = table[i];
    if (secs >= div) return `${Math.floor(secs / div)}${unit} ago`;
  }
  return `${secs}s ago`;
}

/** Months between two dates (fractional). */
export function monthsBetween(start: string | Date, end: string | Date = new Date()): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

/** Title-case a snake_case / kebab-case key. */
export function humanize(key: string | null | undefined): string {
  if (!key) return "—";
  return key
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Initials for an avatar. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Clamp helper. */
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Deterministic hue-free class picker used for muted category chips. */
export function truncate(s: string | null | undefined, len = 40): string {
  if (!s) return "";
  return s.length > len ? `${s.slice(0, len - 1)}…` : s;
}

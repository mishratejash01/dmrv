import { cn, humanize } from "@/lib/utils";

const TEXT: Record<string, string> = {
  neutral: "text-muted",
  clay: "text-clay",
  sage: "text-sage",
  ochre: "text-ochre",
  ok: "text-ok",
  warn: "text-warn",
  err: "text-err",
  info: "text-info",
};

type Tone = "neutral" | "clay" | "sage" | "ochre" | "ok" | "warn" | "err" | "info";

const RUN: Record<string, Tone> = {
  draft: "neutral",
  submitted: "info",
  approved: "ok",
  rejected: "err",
  changes_requested: "warn",
};
const BATCH: Record<string, Tone> = {
  open: "info",
  closed: "neutral",
  testing: "warn",
  verified: "ok",
};
const CREDIT: Record<string, Tone> = {
  issued: "info",
  verified: "ok",
  retired: "sage",
  cancelled: "err",
  buffer: "warn",
  transferred: "clay",
};
const VERIFICATION: Record<string, Tone> = {
  assigned: "neutral",
  in_review: "info",
  approved: "ok",
  rejected: "err",
};
const SEVERITY: Record<string, Tone> = {
  low: "sage",
  medium: "warn",
  high: "err",
  critical: "err",
};
const ISSUANCE: Record<string, Tone> = {
  draft: "neutral",
  initiated: "info",
  approved: "warn",
  issued: "ok",
};

const MAPS = {
  run: RUN,
  batch: BATCH,
  credit: CREDIT,
  verification: VERIFICATION,
  severity: SEVERITY,
  issuance: ISSUANCE,
} as const;

export function StatusBadge({
  kind,
  value,
  className,
}: {
  kind: keyof typeof MAPS;
  value: string | null | undefined;
  className?: string;
}) {
  const v = value ?? "";
  const tone = MAPS[kind][v] ?? "neutral";
  return (
    <span className={cn("whitespace-nowrap text-sm font-semibold", TEXT[tone], className)}>
      {humanize(v)}
    </span>
  );
}

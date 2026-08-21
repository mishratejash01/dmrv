import { cn, humanize } from "@/lib/utils";

const DOT: Record<string, string> = {
  neutral: "bg-faint",
  clay: "bg-clay",
  sage: "bg-sage",
  ochre: "bg-ochre",
  ok: "bg-ok",
  warn: "bg-warn",
  err: "bg-err",
  info: "bg-info",
};

const TEXT: Record<string, string> = {
  neutral: "text-muted",
  clay: "text-ink",
  sage: "text-ink",
  ochre: "text-ink",
  ok: "text-ink",
  warn: "text-ink",
  err: "text-err",
  info: "text-ink",
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
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} />
      <span className={TEXT[tone]}>{humanize(v)}</span>
    </span>
  );
}

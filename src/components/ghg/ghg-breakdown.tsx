import { fmt } from "@/lib/utils";

export interface GhgLine {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

/**
 * Transparent GHG calculation display — every input → intermediate → net line,
 * so the removal figure is never a black box.
 */
export function GhgBreakdown({ lines }: { lines: GhgLine[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 overflow-hidden">
      {lines.map((l) => {
        const isTotal = l.key === "net";
        const isSubtotal = l.key === "net_before" || l.key === "gross_removal";
        const negative = l.value < 0;
        return (
          <div
            key={l.key}
            className={[
              "flex items-start justify-between gap-4 px-4 py-3 border-b border-border last:border-0",
              isTotal ? "bg-sage-tint" : isSubtotal ? "bg-surface" : "",
            ].join(" ")}
          >
            <div className="min-w-0">
              <p className={`text-sm ${isTotal ? "font-semibold text-ink" : "text-ink-soft"}`}>
                {l.label}
              </p>
              {l.detail && <p className="text-xs text-muted mt-0.5 text-pretty">{l.detail}</p>}
            </div>
            <p
              className={[
                "tnum shrink-0 text-right",
                isTotal ? "font-display text-lg text-[#2e7d32]" : "text-sm",
                negative && !isTotal ? "text-err" : "text-ink",
              ].join(" ")}
            >
              {negative ? "−" : ""}
              {fmt(Math.abs(l.value), l.key === "permanence" ? 3 : 2)}
              {l.key !== "permanence" && <span className="text-muted text-xs ml-1">tCO₂e</span>}
            </p>
          </div>
        );
      })}
    </div>
  );
}

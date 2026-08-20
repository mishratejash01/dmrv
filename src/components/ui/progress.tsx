import * as React from "react";
import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

/**
 * Warm progress meter. Turns amber near the limit and brick when over it —
 * used for the 6-month / 200-tonne production-batch caps.
 */
export function Meter({
  value,
  max = 100,
  label,
  caption,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  caption?: string;
  className?: string;
}) {
  const pct = clamp((value / max) * 100, 0, 100);
  const tone =
    pct >= 100 ? "bg-err" : pct >= 80 ? "bg-ochre" : "bg-sage";
  return (
    <div className={cn("w-full", className)}>
      {(label || caption) && (
        <div className="flex items-baseline justify-between mb-1.5">
          {label && <span className="text-sm text-ink-soft">{label}</span>}
          {caption && <span className="text-xs text-muted tnum">{caption}</span>}
        </div>
      )}
      <div className="h-1.5 w-full rounded-[2px] bg-surface-2 overflow-hidden">
        <div
          className={cn("h-full rounded-[2px] transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

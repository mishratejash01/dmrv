"use client";

import * as React from "react";
import {
  Copy16Regular,
  Checkmark16Regular,
} from "@/components/common/icons";
import { cn } from "@/lib/utils";

export function CopyButton({ value, className, label }: { value: string; className?: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 text-muted hover:text-ink transition-colors",
        className,
      )}
      aria-label="Copy"
    >
      {copied ? <Checkmark16Regular className="h-3.5 w-3.5 [stroke-width:1.5] text-ok" /> : <Copy16Regular className="h-3.5 w-3.5 [stroke-width:1.5]" />}
      {label && <span className="text-xs">{copied ? "Copied" : label}</span>}
    </button>
  );
}

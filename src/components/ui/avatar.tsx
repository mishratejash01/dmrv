"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";

/**
 * A member's photo, or their initials on a deterministic tint when there is
 * none — the same person always lands on the same tint, so the list stays
 * recognisable between visits.
 *
 * `rounded` lets a row use a squared frame, which sits better beside a block of
 * text than a circle does.
 */
export function Avatar({
  name,
  src,
  size = 36,
  rounded = "full",
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  rounded?: "full" | "md";
  className?: string;
}) {
  const tones = [
    "bg-clay-tint text-clay",
    "bg-info-tint text-info",
    "bg-ochre-tint text-warn",
    "bg-sage-tint text-sage",
  ];
  const idx = (name ?? "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-semibold overflow-hidden shrink-0 border border-border",
        rounded === "full" ? "rounded-full" : "rounded-lg",
        tones[idx],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

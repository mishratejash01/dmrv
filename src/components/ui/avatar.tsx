"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";

/** Simple deterministic warm-toned avatar with initials. */
export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const tones = [
    "bg-clay-tint text-[#8a5f38]",
    "bg-sage-tint text-[#5c6a4c]",
    "bg-ochre-tint text-[#8a6f22]",
    "bg-info-tint text-[#4c5c5f]",
  ];
  const idx = (name ?? "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium overflow-hidden shrink-0 border border-border",
        tones[idx],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
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

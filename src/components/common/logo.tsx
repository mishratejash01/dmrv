import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Acres Climate Tech wordmark, served from `public/brand/`.
 *
 * Two cuts exist and they are not interchangeable:
 *   - `black`  the default, for white and light surfaces
 *   - `white`  for the deep-green rail and any dark surface
 *
 * Never recolour it, never set it on a busy background, and never pair it with
 * a stand-in leaf glyph — the spiral is the mark.
 */
export function Logo({
  variant = "black",
  height = 20,
  className,
}: {
  variant?: "black" | "white";
  height?: number;
  className?: string;
}) {
  // Intrinsic ratio of the supplied asset is ~3.7:1.
  const width = Math.round(height * 3.7);
  return (
    <Image
      src={`/brand/acres-${variant}.webp`}
      alt="Acres"
      width={width}
      height={height}
      priority
      className={cn("block w-auto", className)}
      style={{ height, width: "auto" }}
    />
  );
}

/**
 * Wordmark + product lockup: the mark, a hairline divider, then `dMRV`.
 * Used wherever the product needs to name itself — the rail, auth, the
 * public registry.
 */
export function LogoLockup({
  variant = "black",
  height = 20,
  className,
}: {
  variant?: "black" | "white";
  height?: number;
  className?: string;
}) {
  const onDark = variant === "white";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo variant={variant} height={height} />
      <span
        aria-hidden
        className="block w-px h-4"
        style={{ background: onDark ? "rgba(255,255,255,0.18)" : "var(--color-border-strong)" }}
      />
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: onDark ? "rgba(255,255,255,0.72)" : "var(--color-muted)" }}
      >
        dMRV
      </span>
    </span>
  );
}

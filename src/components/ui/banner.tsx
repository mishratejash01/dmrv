import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A full-width feature banner on a deep teal ground: an eyebrow, a headline,
 * a line of copy, optional figures, and one action.
 *
 * It is the one place in the product where promotional voice is allowed, so it
 * has to earn its space. Use it to surface a capability the reader has not
 * switched on yet — never to restate what the page below already shows.
 *
 * The ground is a deep teal rather than the brand green: green is the product's
 * action colour, and a banner is not an action. Teal reads as water and earth
 * and keeps the environmental register without competing with a button. White
 * text sits on it at 11.7:1, and the sand eyebrow at 6.1:1.
 */
export function Banner({
  eyebrow,
  title,
  body,
  stats,
  action,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  /** Up to three figures. More than that and it stops reading as a headline. */
  stats?: { value: string; label: string }[];
  action?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl bg-[#0b3d4d] px-6 py-7 md:px-8 md:py-8",
        className,
      )}
    >
      {/* Light falling from the top-left, so the ground reads as a surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(95,212,196,0.18),transparent_55%)]"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[12px] font-medium uppercase tracking-wider text-[#e8b25f]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1.5 font-display text-[22px] md:text-[26px] font-semibold leading-tight text-white text-balance">
            {title}
          </h2>
          {body && (
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/70 text-pretty">
              {body}
            </p>
          )}

          {stats && stats.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {stats.slice(0, 3).map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-white/15 bg-white/[0.07] px-3.5 py-2.5"
                >
                  <p className="font-display text-[19px] font-semibold leading-none text-white tnum">
                    {s.value}
                  </p>
                  <p className="mt-1 text-[12px] leading-tight text-white/60">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {action && <div className="mt-5 flex flex-wrap items-center gap-2.5">{action}</div>}
        </div>

        {aside && <div className="shrink-0 lg:w-[22rem] lg:self-center">{aside}</div>}
      </div>
    </section>
  );
}

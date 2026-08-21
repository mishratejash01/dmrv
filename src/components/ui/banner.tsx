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
 * The ground is a near-black ink with a faint cool cast — not a saturated hue.
 * A brand colour here competes with the buttons, and a bright one dates fast;
 * ink stays quiet and lets the type carry the block. The only warmth is the
 * eyebrow, in a muted sand.
 *
 * Its artistry is deliberately slight: a hairline rule grid at 3% and one soft
 * fall of light, both barely visible, so the surface has depth without pattern.
 * White text sits on the ground at 17.7:1 and the sand eyebrow at 10.8:1.
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
        "relative overflow-hidden rounded-xl bg-[#101922] px-6 py-7 md:px-8 md:py-9",
        className,
      )}
    >
      {/* A ruled grid and one fall of light, both barely there — enough to give
          the ground depth without becoming a pattern. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_100%_0%,rgba(255,255,255,0.07),transparent_60%)]"
      />
      {/* A single hairline along the top edge, catching the light. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#d8c9a8]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1.5 font-display text-[22px] md:text-[26px] font-semibold leading-tight text-white text-balance">
            {title}
          </h2>
          {body && (
            <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-white/65 text-pretty">
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

        {aside && <div className="shrink-0 lg:w-[24rem] lg:self-center lg:pl-4">{aside}</div>}
      </div>
    </section>
  );
}

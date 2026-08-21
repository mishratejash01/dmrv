import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * A state, written as a word. No fill, no border, no dot — the tone's colour on
 * the text is the whole signal, which keeps a column of states reading as a
 * column of words rather than a stack of blocks.
 *
 * Tones stay in the product's semantic set, so `err` is the red the rest of the
 * app uses for failure, not a decorative choice per call site.
 */
const badgeVariants = cva("inline-flex items-center whitespace-nowrap text-sm font-semibold", {
  variants: {
    tone: {
      neutral: "text-muted",
      clay: "text-clay",
      sage: "text-sage",
      ochre: "text-ochre",
      ok: "text-ok",
      warn: "text-warn",
      err: "text-err",
      info: "text-info",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Accepted and ignored: the colour on the word carries the state. */
  dot?: boolean;
}

export function Badge({ className, tone, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}

export { badgeVariants };

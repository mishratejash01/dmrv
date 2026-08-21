import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium border whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface text-ink-soft border-border",
        clay: "bg-clay-tint text-clay border-clay-soft",
        sage: "bg-sage-tint text-ink border-sage-soft",
        ochre: "bg-ochre-tint text-warn border-ochre-soft",
        ok: "bg-ok-tint text-ink border-ok/30",
        warn: "bg-warn-tint text-warn border-ochre-soft",
        err: "bg-err-tint text-err border-err/30",
        info: "bg-info-tint text-info border-info/30",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export { badgeVariants };

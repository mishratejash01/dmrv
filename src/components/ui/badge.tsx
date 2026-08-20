import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium border whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface text-ink-soft border-border",
        clay: "bg-clay-tint text-[#05543a] border-clay-soft",
        sage: "bg-sage-tint text-[#2e7d32] border-sage-soft",
        ochre: "bg-ochre-tint text-[#8a5200] border-ochre-soft",
        ok: "bg-ok-tint text-[#2e7d32] border-[#b7dcb9]",
        warn: "bg-warn-tint text-[#8a5200] border-ochre-soft",
        err: "bg-err-tint text-[#b3261e] border-[#f4c7c3]",
        info: "bg-info-tint text-[#1668b3] border-[#c3ddf5]",
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

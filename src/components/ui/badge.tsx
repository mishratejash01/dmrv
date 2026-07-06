import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface text-ink-soft border-border",
        clay: "bg-clay-tint text-[#8a5f38] border-clay-soft",
        sage: "bg-sage-tint text-[#5c6a4c] border-sage-soft",
        ochre: "bg-ochre-tint text-[#8a6f22] border-ochre-soft",
        ok: "bg-ok-tint text-[#5a6746] border-[#c3ceae]",
        warn: "bg-warn-tint text-[#8a6f22] border-ochre-soft",
        err: "bg-err-tint text-[#8f4a36] border-[#e0bfb2]",
        info: "bg-info-tint text-[#4c5c5f] border-[#c2d0cf]",
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

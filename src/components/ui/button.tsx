import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.5rem] font-medium tracking-[-0.01em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay [&_svg]:shrink-0 [&_svg]:[stroke-width:1.5]",
  {
    variants: {
      variant: {
        primary:
          "bg-clay text-elevated hover:bg-[#056b4b] active:bg-[#045840]",
        secondary:
          "bg-surface text-ink border border-border hover:border-border-strong hover:bg-surface-2",
        outline:
          "border border-border-strong text-ink bg-transparent hover:bg-surface",
        ghost: "text-ink-soft hover:bg-surface hover:text-ink",
        sage: "bg-sage text-elevated hover:bg-[#276b2a] active:bg-[#1f5622]",
        danger: "bg-err text-elevated hover:bg-[#99201a] active:bg-[#7f1b16]",
        link: "text-clay underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

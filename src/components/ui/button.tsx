import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-clay text-elevated shadow-sm hover:bg-[#9d6f47] active:translate-y-px",
        secondary:
          "bg-surface text-ink border border-border hover:bg-surface-2",
        outline:
          "border border-border-strong text-ink bg-transparent hover:bg-surface",
        ghost: "text-ink-soft hover:bg-surface hover:text-ink",
        sage: "bg-sage text-elevated shadow-sm hover:bg-[#78876a]",
        danger: "bg-err text-elevated shadow-sm hover:bg-[#9e5b46]",
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

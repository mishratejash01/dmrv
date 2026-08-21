import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A white panel on the grey workspace ground. The ground is what separates one
 * card from the next, so the border stays a hairline and no shadow is needed.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-elevated", className)}
      {...props}
    />
  );
}

/**
 * Title block. `divided` draws the rule under it that the reference layouts use
 * to separate a card's heading from its figures.
 */
export function CardHeader({
  className,
  divided,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { divided?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-5 pt-4 pb-3",
        divided && "border-b border-border mb-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-[15px] font-semibold text-ink leading-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 px-5 py-3.5 border-t border-border", className)}
      {...props}
    />
  );
}

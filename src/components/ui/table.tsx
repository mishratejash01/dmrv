import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Rows are blocks, not lines between hairlines: the table separates its rows
 * with space and gives each one its own surface, so a row reads as a single
 * record you could click rather than a strip in a grid.
 *
 * That needs `border-separate`, since `border-collapse` merges cell edges and
 * would drop both the spacing and the rounded ends.
 */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full text-sm border-separate border-spacing-y-1.5", className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("", className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "group bg-surface/70 transition-colors hover:bg-surface-2",
        // The row's ends are rounded on its first and last cell, since a <tr>
        // cannot carry a radius of its own.
        "[&>td:first-child]:rounded-l-lg [&>td:last-child]:rounded-r-lg",
        className,
      )}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-left text-[12px] font-medium text-muted px-3 pb-1 whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-3 text-ink align-middle", className)} {...props} />;
}

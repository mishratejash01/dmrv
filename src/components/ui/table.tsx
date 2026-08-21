import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Rows are blocks, not lines between hairlines: the table separates its rows
 * with space and gives each one its own surface, so a row reads as one record
 * rather than a strip in a grid.
 *
 * That needs `border-separate`, since `border-collapse` merges cell edges and
 * would drop both the spacing and the rounded ends.
 *
 * Rows are white, so the table wants a grey ground under it — use
 * `<TableSection>`, which supplies that plus the inset the blocks need so they
 * do not run into the section's corners.
 */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full text-sm border-separate border-spacing-y-2", className)}
        {...props}
      />
    </div>
  );
}

/**
 * The container a table lives in: a grey panel carrying the title, whatever
 * filters belong to the table, and the rows themselves — all one block, so
 * filters never float outside the thing they filter.
 */
export function TableSection({
  title,
  action,
  filters,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-elevated p-4 md:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      {filters && <div className="mb-3 flex flex-wrap items-center gap-2">{filters}</div>}
      {children}
    </section>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      // The heading row is not a record, so it takes neither the row surface
      // nor its hover. TR's borders and radii already miss it, since those are
      // drawn on <td> and the heading row holds <th>.
      className={cn("[&_tr]:bg-transparent [&_tr:hover]:bg-transparent", className)}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "bg-elevated border border-border transition-colors hover:bg-surface/60",
        // The outline is drawn on the cells, since a <tr> takes no border.
        "[&>td]:border-y [&>td]:border-border [&>td:first-child]:border-l [&>td:last-child]:border-r",
        // A <tr> cannot carry a radius, so the row's ends take it.
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
        // Same size and alignment as the cells beneath, so a heading sits over
        // its column rather than beside it.
        "text-left text-[14px] font-medium text-muted align-middle px-4 pb-1 whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3.5 text-ink align-middle", className)} {...props} />;
}

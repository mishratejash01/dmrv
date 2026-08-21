import * as React from "react";
import { cn } from "@/lib/utils";

/** Page header: the title and whatever actions belong to the page. */
export function PageHeader({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  /** Accepted and ignored: the title carries the page. */
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 mb-5", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-semibold text-ink leading-tight">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

/** Section heading inside a page. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-2", className)}>
      <h2 className="font-display text-base font-semibold text-brand-deep">{title}</h2>
      {action}
    </div>
  );
}

/** Empty state with icon, message, and optional action. */
export function EmptyState({
  title,
  action,
  className,
}: {
  /** Accepted and ignored: an empty state says what is missing, plainly. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-lg bg-surface/50",
        className,
      )}
    >
      <p className="text-[15px] text-muted">{title}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Loading skeleton block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 rounded-full border-2 border-border-strong border-t-clay animate-spin",
        className,
      )}
    />
  );
}

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return (
    <div
      role="separator"
      className={cn(
        vertical ? "w-px h-full" : "h-px w-full",
        "bg-border",
        className,
      )}
    />
  );
}

/** A labelled statistic tile. */
export function Stat({
  label,
  value,
  unit,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  /** Accepted and ignored: tiles read as figures, not as badges. */
  icon?: React.ReactNode;
  tone?: "clay" | "sage" | "ochre" | "info" | "neutral";
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-elevated px-5 py-4", className)}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-2 font-display text-[28px] font-semibold text-ink tnum leading-none">
        {value}
        {unit && <span className="ml-1.5 font-sans text-[15px] font-normal text-muted">{unit}</span>}
      </p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Key/value description list row. */
export function DataRow({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0", className)}>
      <dt className="text-sm text-muted shrink-0">{label}</dt>
      <dd className="text-sm text-ink text-right min-w-0">{children}</dd>
    </div>
  );
}

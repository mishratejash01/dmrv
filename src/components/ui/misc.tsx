import * as React from "react";
import { cn } from "@/lib/utils";

/** Page header with title, description, and optional actions. */
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl md:text-3xl text-ink leading-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-muted text-sm md:text-base max-w-2xl text-pretty">
            {description}
          </p>
        )}
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
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {action}
    </div>
  );
}

/** Empty state with icon, message, and optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-14 px-6 rounded-xl border border-dashed border-border-strong bg-surface/40",
        className,
      )}
    >
      {icon && <div className="mb-3 text-faint [&_svg]:h-8 [&_svg]:w-8">{icon}</div>}
      <p className="font-display text-lg text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-muted max-w-sm text-pretty">{description}</p>}
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
  icon,
  tone = "clay",
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "clay" | "sage" | "ochre" | "info" | "neutral";
  className?: string;
}) {
  const toneMap: Record<string, string> = {
    clay: "text-clay bg-clay-tint",
    sage: "text-sage bg-sage-tint",
    ochre: "text-ochre bg-ochre-tint",
    info: "text-info bg-info-tint",
    neutral: "text-ink-soft bg-surface-2",
  };
  return (
    <div className={cn("rounded-xl border border-border bg-elevated p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 font-display text-2xl text-ink tnum leading-tight">
            {value}
            {unit && <span className="text-base text-muted ml-1 font-sans">{unit}</span>}
          </p>
        </div>
        {icon && (
          <div className={cn("rounded-lg p-2 [&_svg]:h-5 [&_svg]:w-5 shrink-0", toneMap[tone])}>
            {icon}
          </div>
        )}
      </div>
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

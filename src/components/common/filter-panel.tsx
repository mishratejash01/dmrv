"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown16Regular, Dismiss16Regular } from "@/components/common/icons";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  /** Shown after the label, e.g. a row count for that option. */
  count?: number;
}

export interface FilterGroup {
  /** Query-string key this group writes to. */
  key: string;
  label: string;
  options: FilterOption[];
}

export interface SearchField {
  /** Query-string key this field writes to. */
  key: string;
  label: string;
  placeholder?: string;
}

/**
 * One control holding every filter a page has: a free-text search over a chosen
 * field, then collapsible groups of checkboxes.
 *
 * Selections are staged locally and only written to the URL on Apply, so a
 * multi-part filter costs one navigation rather than one per checkbox. Groups
 * write comma-separated values, which the page reads with `.in()`.
 */
export function FilterPanel({
  searchFields,
  groups,
  basePath,
  className,
}: {
  searchFields?: SearchField[];
  groups: FilterGroup[];
  basePath: string;
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const readSelected = React.useCallback(() => {
    const next: Record<string, string[]> = {};
    for (const g of groups) {
      const raw = params.get(g.key);
      next[g.key] = raw ? raw.split(",").filter(Boolean) : [];
    }
    return next;
  }, [groups, params]);

  const [selected, setSelected] = React.useState<Record<string, string[]>>(readSelected);
  const [searchKey, setSearchKey] = React.useState(searchFields?.[0]?.key ?? "");
  const [searchValue, setSearchValue] = React.useState("");
  const [expanded, setExpanded] = React.useState<string | null>(groups[0]?.key ?? null);

  // Staging happens on open rather than in an effect, so a cancelled edit is
  // never carried into the next one and no render is wasted syncing.
  const openPanel = () => {
    setSelected(readSelected());
    const field = searchFields?.find((f) => params.get(f.key));
    setSearchKey(field?.key ?? searchFields?.[0]?.key ?? "");
    setSearchValue(field ? (params.get(field.key) ?? "") : "");
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeCount =
    groups.reduce((n, g) => n + (params.get(g.key)?.split(",").filter(Boolean).length ?? 0), 0) +
    (searchFields?.some((f) => params.get(f.key)) ? 1 : 0);

  const toggle = (groupKey: string, value: string) => {
    setSelected((prev) => {
      const current = prev[groupKey] ?? [];
      return {
        ...prev,
        [groupKey]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const apply = () => {
    const next = new URLSearchParams(params.toString());
    for (const g of groups) {
      const values = selected[g.key] ?? [];
      if (values.length) next.set(g.key, values.join(","));
      else next.delete(g.key);
    }
    for (const f of searchFields ?? []) next.delete(f.key);
    if (searchKey && searchValue.trim()) next.set(searchKey, searchValue.trim());
    const qs = next.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
    setOpen(false);
  };

  const clearAll = () => {
    setSelected(Object.fromEntries(groups.map((g) => [g.key, []])));
    setSearchValue("");
  };

  const dirty =
    JSON.stringify(selected) !== JSON.stringify(readSelected()) ||
    searchValue.trim() !== (params.get(searchKey) ?? "");

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
          activeCount > 0
            ? "border-clay-soft bg-clay-tint text-ink"
            : "border-border bg-elevated text-ink hover:bg-surface",
        )}
      >
        Search &amp; filter
        {activeCount > 0 && (
          <span className="rounded bg-clay px-1.5 text-[11px] font-medium text-white tnum">
            {activeCount}
          </span>
        )}
        <ChevronDown16Regular
          className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-border bg-elevated shadow-lg">
          <div className="flex items-center justify-end gap-2 border-b border-border px-4 py-2.5">
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!dirty}
              className="rounded-md bg-clay px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#007a55] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="ml-1 text-muted hover:text-ink transition-colors"
            >
              <Dismiss16Regular className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto px-4 py-3">
            {searchFields && searchFields.length > 0 && (
              <div className="mb-4">
                <p className="mb-1.5 text-[13px] font-semibold text-ink">Search</p>
                <div className="flex">
                  <select
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    aria-label="Search field"
                    className="h-9 rounded-l-md border border-border bg-surface px-2.5 text-sm text-ink outline-none"
                  >
                    {searchFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && apply()}
                    placeholder={
                      searchFields.find((f) => f.key === searchKey)?.placeholder ?? "Search"
                    }
                    className="h-9 min-w-0 flex-1 rounded-r-md border border-l-0 border-border bg-elevated px-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-border-strong"
                  />
                </div>
              </div>
            )}

            <p className="mb-1 text-[13px] font-semibold text-ink">Filters</p>
            {groups.map((g) => {
              const isOpen = expanded === g.key;
              const chosen = selected[g.key] ?? [];
              return (
                <div key={g.key} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : g.key)}
                    aria-expanded={isOpen}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2.5 py-2.5 text-left text-sm transition-colors",
                      isOpen ? "bg-clay-tint text-ink" : "text-ink hover:bg-surface",
                    )}
                  >
                    <span>
                      {g.label}
                      {chosen.length > 0 && (
                        <span className="ml-1.5 text-muted tnum">({chosen.length})</span>
                      )}
                    </span>
                    <ChevronDown16Regular
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-2.5 pb-3 pt-1 sm:grid-cols-3">
                      {g.options.length === 0 && (
                        <p className="col-span-full text-sm text-muted">Nothing to filter by</p>
                      )}
                      {g.options.map((o) => (
                        <label
                          key={o.value}
                          className="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink-soft hover:text-ink"
                        >
                          <input
                            type="checkbox"
                            checked={chosen.includes(o.value)}
                            onChange={() => toggle(g.key, o.value)}
                            className="h-4 w-4 shrink-0 rounded border-border-strong accent-clay"
                          />
                          <span className="truncate">
                            {o.label}
                            {typeof o.count === "number" && (
                              <span className="ml-1 text-faint tnum">{o.count}</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

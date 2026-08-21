"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/input";

export interface FilterSite {
  id: string;
  name: string;
  kilns?: { id: string; name: string | null; code: string | null }[] | null;
}

/**
 * Site, kiln and status as dropdowns rather than rows of selectable chips.
 * Chips cost a line of layout per option and grow with the data — a project
 * with twenty kilns wrapped to three rows above the table it filtered.
 *
 * Each control writes to the query string, so the filtered view stays
 * linkable and the server keeps doing the filtering.
 */
export function RunsFilters({
  sites,
  siteCounts,
  kilnCounts,
  activeSite,
  activeKiln,
  statuses,
  activeStatus,
}: {
  sites: FilterSite[];
  siteCounts?: Record<string, number>;
  kilnCounts?: Record<string, number>;
  activeSite?: string;
  activeKiln?: string;
  statuses?: { key: string; label: string }[];
  activeStatus?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Choosing a different site invalidates whichever kiln was picked under it.
    if (key === "site") next.delete("kiln");
    const qs = next.toString();
    router.push(qs ? `/runs?${qs}` : "/runs");
  };

  const kilns = sites.find((s) => s.id === activeSite)?.kilns ?? [];
  const count = (n?: number) => (typeof n === "number" ? ` (${n})` : "");

  return (
    <>
      <NativeSelect
        aria-label="Filter by site"
        className="h-9 w-auto min-w-40 text-sm"
        value={activeSite ?? ""}
        onChange={(e) => setParam("site", e.target.value)}
      >
        <option value="">All sites</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {count(siteCounts?.[s.id])}
          </option>
        ))}
      </NativeSelect>

      {activeSite && kilns.length > 0 && (
        <NativeSelect
          aria-label="Filter by kiln"
          className="h-9 w-auto min-w-36 text-sm"
          value={activeKiln ?? ""}
          onChange={(e) => setParam("kiln", e.target.value)}
        >
          <option value="">All kilns</option>
          {kilns.map((k) => (
            <option key={k.id} value={k.id}>
              {k.code ?? k.name ?? "Kiln"}
              {count(kilnCounts?.[k.id])}
            </option>
          ))}
        </NativeSelect>
      )}

      {statuses && statuses.length > 0 && (
        <NativeSelect
          aria-label="Filter by status"
          className="h-9 w-auto min-w-36 text-sm"
          value={activeStatus ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
        >
          {statuses.map((f) => (
            <option key={f.label} value={f.key}>
              {f.label}
            </option>
          ))}
        </NativeSelect>
      )}
    </>
  );
}

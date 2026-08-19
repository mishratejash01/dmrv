"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/input";

export interface RunsFilterSite {
  id: string;
  name: string;
  code: string;
  kilns: { id: string; name: string; code: string }[];
}

interface Props {
  sites: RunsFilterSite[];
  /** run counts keyed by site id and kiln id (real DB counts) */
  siteCounts: Record<string, number>;
  kilnCounts: Record<string, number>;
  activeSite: string;
  activeKiln: string;
}

/**
 * Site → kiln dependent dropdowns for the runs list (client slide 5). Selecting
 * a site narrows the kiln list to that site; both push URL params so the server
 * component re-queries with real WHERE clauses. Counts come straight from the
 * database, so "runs for this site/kiln" is always accurate.
 */
export function RunsFilters({ sites, siteCounts, kilnCounts, activeSite, activeKiln }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const kilns = React.useMemo(() => {
    if (!activeSite) return sites.flatMap((s) => s.kilns);
    return sites.find((s) => s.id === activeSite)?.kilns ?? [];
  }, [sites, activeSite]);

  function navigate(next: { site?: string; kiln?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if ("site" in next) {
      if (next.site) params.set("site", next.site);
      else params.delete("site");
      // Changing site invalidates the kiln selection.
      params.delete("kiln");
    }
    if ("kiln" in next) {
      if (next.kiln) params.set("kiln", next.kiln);
      else params.delete("kiln");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const totalRuns = Object.values(siteCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-soft">Site</span>
        <NativeSelect
          className="min-w-[13rem]"
          value={activeSite}
          onChange={(e) => navigate({ site: e.target.value })}
        >
          <option value="">All sites ({totalRuns})</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({siteCounts[s.id] ?? 0})
            </option>
          ))}
        </NativeSelect>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-soft">Kiln</span>
        <NativeSelect
          className="min-w-[12rem]"
          value={activeKiln}
          onChange={(e) => navigate({ kiln: e.target.value })}
        >
          <option value="">{activeSite ? "All kilns on site" : "All kilns"}</option>
          {kilns.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name} ({kilnCounts[k.id] ?? 0})
            </option>
          ))}
        </NativeSelect>
      </label>
    </div>
  );
}

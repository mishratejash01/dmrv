"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A thin top progress bar that appears the instant a navigation starts and
 * clears when the new route finishes rendering. App Router server navigations
 * can take a moment (data is fetched on the server), and without this the old
 * screen just sits there looking frozen — this gives immediate "working…"
 * feedback on every click.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = React.useState(false);
  const safety = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const begin = React.useCallback(() => {
    setActive(true);
    if (safety.current) clearTimeout(safety.current);
    // Never get stuck on: auto-clear after a generous window.
    safety.current = setTimeout(() => setActive(false), 12000);
  }, []);

  // Start the bar when an internal link (or a same-tab anchor) is clicked.
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || target === "_blank" || anchor.hasAttribute("download")) return;
      // Only internal navigations to a different path.
      if (!href.startsWith("/") || href.startsWith("//")) return;
      const dest = href.split("#")[0];
      const current = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
      if (dest === pathname || dest === current) return;
      begin();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, searchParams, begin]);

  // Expose a manual trigger for programmatic navigations (router.push after
  // form submits, etc.) via a window event.
  React.useEffect(() => {
    const start = () => begin();
    window.addEventListener("acres:nav-start", start);
    return () => window.removeEventListener("acres:nav-start", start);
  }, [begin]);

  // Finish whenever the resolved route changes — this synchronises the bar with
  // the router's resolved location (an external system), which is exactly what
  // an effect is for. setActive(false) is a no-op render when already idle.
  React.useEffect(() => {
    if (safety.current) clearTimeout(safety.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync to route change
    setActive(false);
  }, [pathname, searchParams]);

  return (
    <div aria-hidden className="wt-navprogress" data-active={active ? "true" : "false"}>
      <span className="wt-navprogress-bar" />
    </div>
  );
}

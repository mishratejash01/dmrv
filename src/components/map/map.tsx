"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./leaflet-map";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-lg bg-surface-2 animate-pulse grid place-items-center text-sm text-muted"
      style={{ height: 320 }}
    >
      Loading map…
    </div>
  ),
});

export function Map({ points, height }: { points: MapPoint[]; height?: number }) {
  if (points.length === 0) {
    return (
      <div
        className="w-full rounded-lg border border-dashed border-border-strong bg-surface/40 grid place-items-center text-sm text-muted"
        style={{ height: height ?? 320 }}
      >
        No geolocated records yet
      </div>
    );
  }
  return <LeafletMap points={points} height={height} />;
}

export type { MapPoint };

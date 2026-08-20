"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  tone?: "clay" | "sage" | "ochre" | "info";
}

const TONE_HEX: Record<string, string> = {
  clay: "#06805a",
  sage: "#2e7d32",
  ochre: "#b26b00",
  info: "#1668b3",
};

function pinIcon(tone: string) {
  const color = TONE_HEX[tone] ?? TONE_HEX.clay;
  return L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 2px 6px rgba(15,23,42,.32);border:2px solid #ffffff"><span style="width:7px;height:7px;border-radius:50%;background:#ffffff;transform:rotate(45deg)"></span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, points]);
  return null;
}

export default function LeafletMap({
  points,
  height = 320,
}: {
  points: MapPoint[];
  height?: number;
}) {
  const center: [number, number] =
    points.length > 0 ? [points[0].lat, points[0].lng] : [18.1, 74.6];

  return (
    <MapContainer
      center={center}
      zoom={9}
      scrollWheelZoom={false}
      style={{ height, width: "100%", borderRadius: "0.875rem" }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.tone ?? "clay")}>
          <Popup>
            <div className="text-sm">
              <p className="font-medium text-ink">{p.label}</p>
              {p.sublabel && <p className="text-muted text-xs mt-0.5">{p.sublabel}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

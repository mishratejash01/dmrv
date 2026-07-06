"use client";

import * as React from "react";
import { MapPin, Camera, ImageOff } from "lucide-react";
import { storageUrl } from "@/lib/storage";
import { humanize, fmtDateTime } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export interface EvidencePhoto {
  id?: string;
  photo_type?: string | null;
  storage_path: string;
  latitude?: number | null;
  longitude?: number | null;
  taken_at?: string | null;
}

export function PhotoGallery({
  photos,
  bucket = "run-photos",
  columns = 3,
}: {
  photos: EvidencePhoto[];
  bucket?: string;
  columns?: number;
}) {
  if (!photos || photos.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted rounded-lg border border-dashed border-border-strong bg-surface/40 px-4 py-6 justify-center">
        <ImageOff className="h-4 w-4" /> No photos attached
      </div>
    );
  }
  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {photos.map((p, i) => {
        const url = storageUrl(bucket, p.storage_path);
        return (
          <Dialog key={p.id ?? i}>
            <DialogTrigger asChild>
              <button className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-2 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={humanize(p.photo_type) || "Evidence"}
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                />
                {p.photo_type && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-elevated backdrop-blur">
                    {humanize(p.photo_type)}
                  </span>
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={humanize(p.photo_type)} className="w-full rounded-lg" />
              <div className="mt-3 flex flex-wrap items-center gap-3 px-1 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> {humanize(p.photo_type) || "Photo"}
                </span>
                {p.latitude != null && p.longitude != null && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                  </span>
                )}
                {p.taken_at && <span>{fmtDateTime(p.taken_at)}</span>}
              </div>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}

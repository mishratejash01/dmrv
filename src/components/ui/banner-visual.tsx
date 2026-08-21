import * as React from "react";

/**
 * The visual in the field-log banner: the capture form as it actually appears,
 * built from the real labels on that form — Site, Kiln, Peak temp, Biochar
 * mass, Required photos — with the offline state showing.
 *
 * Built in HTML rather than as an image or abstract SVG, so it uses the
 * product's own type and tokens and stays legible at any size. Field values are
 * illustrative; every label and control is the real one.
 */
export function FieldCaptureVisual() {
  return (
    <div className="relative select-none" aria-hidden>
      <div className="rounded-xl border border-white/10 bg-white p-3.5 shadow-lg">
        {/* Connection state — the row this banner exists to point at. */}
        <div className="mb-3 flex items-center justify-between rounded-md bg-[#fdf4e3] px-2.5 py-1.5">
          <span className="text-[11px] font-medium text-[#8a5200]">Connection</span>
          <span className="text-[11px] font-semibold text-[#8a5200]">Offline</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Site" value="Baramati" />
          <Field label="Kiln" value="KLN-03" />
          <Field label="Peak temp (°C)" value="642" />
          <Field label="Moisture (%)" value="11.4" />
        </div>

        <div className="mt-2">
          <Field label="Biochar mass (kg, wet)" value="418" />
        </div>

        <p className="mt-3 mb-1.5 text-[11px] font-medium text-[#475569]">Required photos</p>
        <div className="flex gap-1.5">
          <div className="h-11 flex-1 rounded-md bg-[#cfe3dc]" />
          <div className="h-11 flex-1 rounded-md border border-dashed border-[#dbe2ea] bg-[#f8fafc]" />
          <div className="grid h-11 flex-1 place-items-center rounded-md border border-dashed border-[#dbe2ea] bg-[#f8fafc]">
            <span className="text-[9px] text-[#94a3b8]">Add photo</span>
          </div>
        </div>

        <div className="mt-3 rounded-md bg-[#009467] py-2 text-center text-[12px] font-medium text-white">
          Save run
        </div>
      </div>

      {/* The queue, sitting off the card's corner. */}
      <div className="absolute -bottom-3 -left-3 rounded-lg bg-white px-3 py-2 shadow-lg">
        <p className="text-[11px] font-semibold text-[#1e293b]">2 runs queued</p>
        <p className="text-[10px] text-[#64748b]">Syncs when back in range</p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] text-[#64748b]">{label}</p>
      <div className="rounded-md border border-[#e2e8f0] bg-white px-2 py-1.5 text-[11px] text-[#1e293b]">
        {value}
      </div>
    </div>
  );
}

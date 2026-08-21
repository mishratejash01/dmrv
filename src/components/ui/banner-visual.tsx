import * as React from "react";

/**
 * The visual in the field-log banner: the product on a desktop, in a browser
 * frame — the green top bar, the section rail, and the capture form with its
 * connection row reading Offline.
 *
 * Built in HTML rather than as an image, so it renders in the product's own
 * type and tokens at full sharpness, scales without blurring, and cannot go
 * stale the way a screenshot would. Every label is the real one; the field
 * values are illustrative.
 */
export function FieldCaptureVisual() {
  return (
    <div
      aria-hidden
      className="select-none overflow-hidden rounded-lg border border-white/12 bg-white shadow-xl"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 bg-[#e4e9f0] px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#c0453c]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#009467]" />
        <div className="ml-1.5 flex-1 rounded bg-white/80 px-2 py-0.5 text-[7px] text-[#94a3b8]">
          acres-dmrv.app/field
        </div>
      </div>

      {/* App top bar */}
      <div className="flex items-center gap-2 bg-[#0b2e1f] px-2.5 py-1.5">
        <span className="text-[8px] font-semibold tracking-wide text-white">acres</span>
        <div className="ml-1 flex gap-1.5">
          {["Overview", "Field ops", "Production"].map((t, i) => (
            <span
              key={t}
              className={i === 1 ? "text-[7px] text-white" : "text-[7px] text-white/50"}
            >
              {t}
            </span>
          ))}
        </div>
        <span className="ml-auto h-3 w-3 rounded-full bg-white/20" />
      </div>

      <div className="flex bg-[#eef1f6] p-1.5">
        {/* Rail */}
        <div className="w-[26%] shrink-0 rounded bg-white p-1.5">
          {["Field log", "Kiln runs", "Review queue"].map((t, i) => (
            <div
              key={t}
              className={
                i === 0
                  ? "mb-0.5 rounded bg-[#e4e9f0] px-1.5 py-1 text-[7px] font-medium text-[#1e293b]"
                  : "mb-0.5 px-1.5 py-1 text-[7px] text-[#64748b]"
              }
            >
              {t}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="ml-1.5 min-w-0 flex-1 rounded bg-white p-2">
          <div className="mb-1.5 flex items-center justify-between rounded bg-[#fdf4e3] px-1.5 py-1">
            <span className="text-[7px] font-medium text-[#8a5200]">Connection</span>
            <span className="text-[7px] font-semibold text-[#8a5200]">Offline</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Site" value="Baramati" />
            <Field label="Kiln" value="KLN-03" />
            <Field label="Peak temp (°C)" value="642" />
            <Field label="Moisture (%)" value="11.4" />
          </div>

          <p className="mb-1 mt-2 text-[7px] font-medium text-[#475569]">Required photos</p>
          <div className="flex gap-1">
            <div className="h-6 flex-1 rounded-sm bg-[#cfe3dc]" />
            <div className="h-6 flex-1 rounded-sm border border-dashed border-[#dbe2ea] bg-[#f8fafc]" />
            <div className="h-6 flex-1 rounded-sm border border-dashed border-[#dbe2ea] bg-[#f8fafc]" />
          </div>

          <div className="mt-2 rounded-sm bg-[#009467] py-1 text-center text-[7px] font-medium text-white">
            Save run
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[6px] text-[#64748b]">{label}</p>
      <div className="truncate rounded-sm border border-[#e2e8f0] px-1.5 py-1 text-[7px] text-[#1e293b]">
        {value}
      </div>
    </div>
  );
}

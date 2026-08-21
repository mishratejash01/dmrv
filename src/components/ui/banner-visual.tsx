import * as React from "react";

/**
 * The visual that sits in the field-log banner: an abstract rendering of the
 * capture form on a handset, with the offline state showing.
 *
 * Drawn as inline SVG rather than a screenshot, so it scales cleanly, needs no
 * asset, and cannot go stale when the real form changes. It is deliberately
 * abstract — bars where text would be — so it reads as an illustration of the
 * flow rather than a claim about exact UI.
 */
export function FieldCaptureVisual() {
  return (
    <svg
      viewBox="0 0 320 220"
      role="img"
      aria-label="Illustration of a kiln run being captured on a handset while offline"
      className="h-auto w-full max-w-sm"
    >
      {/* Ground glow, so the device sits on the teal rather than floating. */}
      <ellipse cx="160" cy="200" rx="120" ry="14" fill="rgba(0,0,0,0.18)" />

      {/* Handset */}
      <g transform="translate(96 14)">
        <rect x="0" y="0" width="128" height="182" rx="14" fill="#0f2f3a" />
        <rect x="4" y="4" width="120" height="174" rx="11" fill="#ffffff" />

        {/* Status strip */}
        <rect x="4" y="4" width="120" height="20" rx="11" fill="#f4f6f9" />
        <rect x="14" y="11" width="26" height="5" rx="2.5" fill="#94a3b8" />
        <circle cx="108" cy="14" r="3.5" fill="#e8b25f" />

        {/* Title + fields */}
        <rect x="14" y="34" width="54" height="7" rx="3.5" fill="#1e293b" />
        <rect x="14" y="50" width="100" height="14" rx="4" fill="#eef1f6" />
        <rect x="14" y="70" width="100" height="14" rx="4" fill="#eef1f6" />
        <rect x="14" y="90" width="46" height="14" rx="4" fill="#eef1f6" />
        <rect x="68" y="90" width="46" height="14" rx="4" fill="#eef1f6" />

        {/* Photo tiles, one already captured */}
        <rect x="14" y="112" width="30" height="26" rx="4" fill="#cfe3dc" />
        <path d="M20 132l7-8 6 6 4-4 5 6z" fill="#5f8a6a" />
        <rect x="48" y="112" width="30" height="26" rx="4" fill="#f4f6f9" stroke="#dbe2ea" strokeDasharray="3 3" />
        <rect x="82" y="112" width="32" height="26" rx="4" fill="#f4f6f9" stroke="#dbe2ea" strokeDasharray="3 3" />

        {/* Primary action */}
        <rect x="14" y="148" width="100" height="18" rx="5" fill="#009467" />
        <rect x="46" y="155" width="36" height="5" rx="2.5" fill="#ffffff" opacity="0.9" />
      </g>

      {/* Offline chip, overlapping the device so the two read as one scene. */}
      <g transform="translate(14 118)">
        <rect x="0" y="0" width="118" height="34" rx="8" fill="#ffffff" />
        <circle cx="17" cy="17" r="6" fill="#e8b25f" />
        <rect x="30" y="10" width="52" height="5" rx="2.5" fill="#1e293b" />
        <rect x="30" y="20" width="72" height="4" rx="2" fill="#94a3b8" />
      </g>

      {/* Sync chip, above and behind — the queue clearing once back in range. */}
      <g transform="translate(196 46)">
        <rect x="0" y="0" width="104" height="30" rx="8" fill="rgba(255,255,255,0.12)" />
        <circle cx="16" cy="15" r="5.5" fill="#5fd4c4" />
        <rect x="28" y="9" width="46" height="4.5" rx="2.25" fill="rgba(255,255,255,0.85)" />
        <rect x="28" y="18" width="62" height="4" rx="2" fill="rgba(255,255,255,0.45)" />
      </g>
    </svg>
  );
}

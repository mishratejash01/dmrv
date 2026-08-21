import * as React from "react";

/**
 * The mark for the provider an address belongs to, drawn beside it.
 *
 * Gmail, Outlook and Yahoo get their own glyph; anything else — a company
 * domain, which is most of this product's users — gets a neutral envelope
 * rather than a wrong logo.
 *
 * Drawn inline so no request leaves the page for a third-party favicon, which
 * would tell that provider who is looking at this list.
 */
export function MailMark({ email, className }: { email?: string | null; className?: string }) {
  const domain = (email ?? "").split("@")[1]?.toLowerCase() ?? "";
  const size = { className: `h-3.5 w-3.5 shrink-0 ${className ?? ""}`, viewBox: "0 0 24 24" };

  if (domain === "gmail.com" || domain === "googlemail.com") {
    return (
      <svg {...size} role="img" aria-label="Gmail">
        <path d="M2 6.5A1.5 1.5 0 0 1 3.5 5h.7L12 11.2 19.8 5h.7A1.5 1.5 0 0 1 22 6.5v11a1.5 1.5 0 0 1-1.5 1.5H19V9.6l-7 5.5-7-5.5V19H3.5A1.5 1.5 0 0 1 2 17.5z" fill="#e5e7eb" />
        <path d="M2 6.5A1.5 1.5 0 0 1 3.5 5h.7L12 11.2V15L5 9.6V19H3.5A1.5 1.5 0 0 1 2 17.5z" fill="#4285f4" />
        <path d="M22 6.5A1.5 1.5 0 0 0 20.5 5h-.7L12 11.2V15l7-5.4V19h1.5a1.5 1.5 0 0 0 1.5-1.5z" fill="#34a853" />
        <path d="M2 6.5A1.5 1.5 0 0 1 3.5 5h.7L12 11.2 19.8 5h.7A1.5 1.5 0 0 1 22 6.5v.8L12 15 2 7.3z" fill="#ea4335" />
      </svg>
    );
  }

  if (domain.includes("outlook.") || domain.includes("hotmail.") || domain.includes("live.")) {
    return (
      <svg {...size} role="img" aria-label="Outlook">
        <path d="M13 5h8.2c.44 0 .8.36.8.8v12.4c0 .44-.36.8-.8.8H13z" fill="#0f6cbd" />
        <path d="M2 4.6 12 3v18L2 19.4z" fill="#0f6cbd" />
        <path d="M7 8.6c1.7 0 2.8 1.4 2.8 3.4S8.7 15.4 7 15.4 4.2 14 4.2 12 5.3 8.6 7 8.6m0 1.5c-.8 0-1.3.8-1.3 1.9S6.2 13.9 7 13.9s1.3-.8 1.3-1.9S7.8 10.1 7 10.1" fill="#ffffff" />
      </svg>
    );
  }

  if (domain.includes("yahoo.")) {
    return (
      <svg {...size} role="img" aria-label="Yahoo Mail">
        <path d="M4 6h3.4l2.8 5.1L13 6h3.3l-5 9.1V19h-3v-3.9z" fill="#6001d2" />
        <circle cx="19" cy="16.5" r="1.6" fill="#6001d2" />
      </svg>
    );
  }

  // Company domains and everything else.
  return (
    <svg {...size} role="img" aria-label="Email" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

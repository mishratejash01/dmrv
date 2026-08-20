import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { BRAND } from "@/lib/brand";
import { NavProgress } from "@/components/layout/nav-progress";
import "./globals.css";

// IBM Plex carries the whole product. It was drawn as IBM's corporate face,
// which is the register this is written in: a system of record, read in dense
// tables of serials and tonnages rather than skimmed as marketing.
// Sans and Mono are siblings, so identifiers sit beside prose without a seam.
const display = IBM_Plex_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.product} — Distributed Open-Kiln Biochar`,
    template: `%s · ${BRAND.product}`,
  },
  description: `Digital Monitoring, Reporting & Verification for distributed open-kiln biochar carbon removal by ${BRAND.company}, built for the ${BRAND.standard} methodology.`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-elevated)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.25rem",
            },
          }}
        />
      </body>
    </html>
  );
}

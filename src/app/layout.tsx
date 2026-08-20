import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { BRAND } from "@/lib/brand";
import { NavProgress } from "@/components/layout/nav-progress";
import "./globals.css";

// Outfit is the Acres Climate Tech brand face, taken from acresclimate.tech.
// One family carries the whole product — headings and body alike.
const display = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const mono = JetBrains_Mono({
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

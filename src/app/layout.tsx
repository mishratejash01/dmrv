import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const display = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Rainbow dMRV — Distributed Open-Kiln Biochar",
    template: "%s · Rainbow dMRV",
  },
  description:
    "Digital Monitoring, Reporting & Verification for distributed open-kiln biochar carbon removal, faithful to the Rainbow Standard.",
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
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-elevated)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.625rem",
            },
          }}
        />
      </body>
    </html>
  );
}

import Link from "next/link";
import { Leaf } from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function RegistryPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-base">
      <header className="border-b border-border bg-elevated">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sage-tint text-sage">
              <Leaf className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg text-ink leading-tight">{BRAND.company}</p>
              <p className="text-xs text-muted">Public credit registry</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-clay hover:underline"
          >
            {BRAND.product}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>

      <footer className="border-t border-border bg-elevated">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <p className="text-xs text-muted text-pretty">
            {BRAND.company} publishes its serialised Rainbow Carbon Credits and their lifecycle for
            public inspection. Data is read-only and reflects the current on-ledger state. {BRAND.product}{" "}
            · Distributed open-kiln biochar carbon removal, built for the Rainbow Standard.
          </p>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/common/logo";

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
            <Logo height={22} />
            <span aria-hidden className="block w-px h-6 bg-border-strong" />
            <div>
              <p className="font-display text-base font-semibold text-brand-deep leading-tight">{BRAND.company}</p>
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-5">{children}</main>

      <footer className="border-t border-border bg-elevated">
        <div className="mx-auto max-w-6xl px-5 py-5">
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

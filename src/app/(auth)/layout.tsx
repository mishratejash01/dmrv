import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LogoLockup } from "@/components/common/logo";
import { RULE_CATALOGUE } from "@/lib/methodology";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — brand / context */}
      <div className="hidden lg:flex flex-col justify-between p-8 paper border-r border-border">
        <Link href="/" className="flex items-center">
          <LogoLockup height={22} />
        </Link>

        <div className="max-w-md">
          <h2 className="font-display text-3xl text-ink leading-tight text-balance">
            The trustworthy chain of custody for biochar carbon removal.
          </h2>
          <p className="mt-4 text-ink-soft text-pretty">
            From a single feedstock delivery to an issued Rainbow Carbon Credit — every step is
            recorded, verifiable, and traceable both ways.
          </p>
          <ul className="mt-5 space-y-3">
            {RULE_CATALOGUE.slice(0, 4).map((r) => (
              <li key={r.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sage shrink-0" />
                <span className="text-ink-soft">{r.title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-muted">
          <p className="text-ink-soft">{BRAND.product} — {BRAND.tagline}</p>
          <p className="mt-1">Complies with the Rainbow Standard · RBW-BCR-DOB-V1.0</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-5 sm:p-8 bg-base">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

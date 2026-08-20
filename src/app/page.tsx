import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight16Regular,
  LeafOne16Regular,
  Fire16Regular,
  ShieldCheckmark16Regular,
  Ribbon16Regular,
  Organization16Regular,
} from "@/components/common/icons";
import { LogoLockup } from "@/components/common/logo";
import { getUser } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { RULE_CATALOGUE } from "@/lib/methodology";

export default async function Landing() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  const lifecycle = [
    { icon: Fire16Regular, label: "Field capture", note: "Kiln runs, photos, GPS — offline-ready" },
    { icon: LeafOne16Regular, label: "End-use locking", note: "Durable soil application, proven" },
    { icon: ShieldCheckmark16Regular, label: "Verification", note: "VVB audits the full evidence chain" },
    { icon: Ribbon16Regular, label: "RCC issuance", note: "Serialised credits & buffer pool" },
  ];

  return (
    <div className="min-h-screen paper">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center">
          <LogoLockup height={20} />
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/registry-public"
            className="hidden sm:inline-flex text-sm text-ink-soft hover:text-ink px-3 py-2 rounded-md hover:bg-surface transition-colors"
          >
            Public registry
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md bg-clay px-4 py-2 text-sm font-medium text-elevated shadow-sm hover:bg-[#056b4b] transition-colors"
          >
            Sign in <ArrowRight16Regular className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-14 pb-10 md:pt-20 md:pb-24 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded border border-border bg-elevated/70 px-2.5 py-1 text-xs text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" />
            Rainbow Standard · RBW-BCR-DOB-V1.0
          </span>
          <h1 className="mt-5 font-display text-4xl md:text-6xl leading-[1.05] text-ink text-balance">
            Digital MRV for distributed{" "}
            <span className="italic text-clay">open-kiln biochar</span>
          </h1>
          <p className="mt-5 text-lg text-ink-soft text-pretty max-w-2xl">
            Track every tonne of carbon from biomass sourcing through pyrolysis, sampling, lab
            testing and durable end-use — then verify it and issue certified Rainbow Carbon
            Credits. One trustworthy chain of custody, field to registry.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-clay px-5 py-3 text-sm font-medium text-elevated shadow-sm hover:bg-[#056b4b] transition-colors"
            >
              Open the dashboard <ArrowRight16Regular className="h-4 w-4" />
            </Link>
            <Link
              href="/registry-public"
              className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-5 py-3 text-sm font-medium text-ink hover:bg-surface transition-colors"
            >
              <Organization16Regular className="h-4 w-4" /> Explore the registry
            </Link>
          </div>
        </section>

        {/* Lifecycle */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-10">
          {lifecycle.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-clay-tint text-clay">
                <s.icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 font-display text-base text-ink">{s.label}</p>
              <p className="mt-1 text-sm text-muted text-pretty">{s.note}</p>
            </div>
          ))}
        </section>

        {/* Methodology rules */}
        <section className="pb-20">
          <h2 className="font-display text-2xl text-ink mb-1">Faithful to the methodology</h2>
          <p className="text-muted mb-4">The real rules of the Rainbow Standard, enforced in software.</p>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
            {RULE_CATALOGUE.map((rule) => (
              <div key={rule.id} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sage shrink-0" />
                <div>
                  <p className="font-medium text-ink text-sm">{rule.title}</p>
                  <p className="text-sm text-muted text-pretty">{rule.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>{BRAND.product} by {BRAND.company} — {BRAND.tagline}.</span>
          <Link href="/login" className="text-clay hover:underline">
            Sign in →
          </Link>
        </div>
      </footer>
    </div>
  );
}

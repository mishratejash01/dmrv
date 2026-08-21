"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SpinnerIos16Regular } from "@/components/common/icons";
import { toast } from "sonner";
import { createProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input, Textarea, NativeSelect, Field } from "@/components/ui/input";
import { RULE_CATALOGUE, METHODOLOGY } from "@/lib/methodology";
import { LogoLockup } from "@/components/common/logo";

export function OnboardingWizard() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    country_code: "IN",
    region: "",
    durability_pathway: "years_100" as "years_100" | "years_1000",
    soil_temp_c: 18,
    buffer_pool_pct: 2,
    description: "",
  });

  const set = (k: keyof typeof form, v: string | number) =>setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Give your project a name.");
      return;
    }
    setLoading(true);
    const res = await createProject(form);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Project created");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen paper flex flex-col">
      <header className="max-w-4xl w-full mx-auto flex items-center gap-2.5 px-6 py-5">
        <LogoLockup height={20} />
      </header>

      <main className="max-w-4xl w-full mx-auto px-6 pb-10 grid lg:grid-cols-5 gap-6 flex-1">
        <div className="lg:col-span-3">
          <p className="text-sm text-clay font-medium">Onboarding</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-brand-deep text-balance">
            Set up your biochar project
          </h1>
          <p className="mt-2 text-muted text-pretty">
            This sets up your project under the Rainbow Standard {METHODOLOGY.name} methodology.
            You&apos;ll add sites, kilns, feedstock and team from the dashboard next.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Project name" required>
              <Input
                value={form.name}
                onChange={(e) =>set("name", e.target.value)}
                placeholder="e.g. Deccan Biochar Cooperative"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Country code (ISO)" hint="Used in credit serials">
                <Input
                  value={form.country_code}
                  onChange={(e) =>set("country_code", e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="IN"
                />
              </Field>
              <Field label="Region">
                <Input
                  value={form.region}
                  onChange={(e) =>set("region", e.target.value)}
                  placeholder="Maharashtra, India"
                />
              </Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Durability pathway">
                <NativeSelect
                  value={form.durability_pathway}
                  onChange={(e) =>set("durability_pathway", e.target.value)}
                >
                  <option value="years_100">100-year</option>
                  <option value="years_1000">1000-year</option>
                </NativeSelect>
              </Field>
              <Field label="Soil temp (°C)" hint="Permanence coeffs">
                <Input
                  type="number"
                  value={form.soil_temp_c}
                  onChange={(e) =>set("soil_temp_c", Number(e.target.value))}
                  step="0.5"
                />
              </Field>
              <Field label="Buffer pool (%)" hint="Min 2%">
                <Input
                  type="number"
                  value={form.buffer_pool_pct}
                  onChange={(e) =>set("buffer_pool_pct", Number(e.target.value))}
                  step="0.5"
                  min="2"
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) =>set("description", e.target.value)}
                placeholder="What does this project do, and where?"
              />
            </Field>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : null}
              Create project
            </Button>
          </form>
        </div>

        <aside className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-elevated p-5 shadow-sm sticky top-6">
            <p className="font-display text-base text-ink mb-3">What you&apos;re signing up to</p>
            <ul className="space-y-3">
              {RULE_CATALOGUE.slice(0, 5).map((r) => (
                <li key={r.id} className="flex gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sage shrink-0" />
                  <div>
                    <p className="text-ink font-medium">{r.title}</p>
                    <p className="text-muted text-xs text-pretty">{r.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

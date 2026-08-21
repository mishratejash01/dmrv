"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SpinnerIos16Regular } from "@/components/common/icons";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const DEMO_ACCOUNTS = [
  { email: "developer@dmrv.demo", role: "Project Developer", name: "Ananya" },
  { email: "operator@dmrv.demo", role: "Kiln Operator", name: "Kabir" },
  { email: "supervisor@dmrv.demo", role: "Kiln Supervisor", name: "Rohan" },
  { email: "verifier@dmrv.demo", role: "Verifier (VVB)", name: "Dr. Fischer" },
  { email: "registry@dmrv.demo", role: "Credit Registry", name: "Issuance ledger" },
  { email: "admin@dmrv.demo", role: "Super Admin", name: "Admin" },
];
const DEMO_PASSWORD = BRAND.demoPassword;

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [magic, setMagic] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  async function signIn(withEmail: string, withPassword: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: withEmail,
      password: withPassword,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
    router.push(redirectTo);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const origin = window.location.origin;

    if (magic) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback?redirect=${redirectTo}` },
      });
      setLoading(false);
      if (error) toast.error(error.message);
      else toast.success("Check your email for a magic link.");
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || email.split("@")[0] },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Account created — signing you in…");
      await signIn(email, password);
      return;
    }

    await signIn(email, password);
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <Field label="Full name">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </Field>
        )}
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@organisation.com"
            autoComplete="email"
            required
          />
        </Field>
        {!magic && (
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
            />
          </Field>
        )}

        <Button type="submit" className="w-full" disabled={loading} size="lg">
          {loading && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />}
          {magic ? "Send magic link" : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      <div className="mt-3 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setMagic((m) => !m)}
          className="text-clay hover:underline"
        >
          {magic ? "Use a password" : "Email me a magic link"}
        </button>
        {mode === "login" ? (
          <Link href="/signup" className="text-muted hover:text-ink">
            Create an account
          </Link>
        ) : (
          <Link href="/login" className="text-muted hover:text-ink">
            I have an account
          </Link>
        )}
      </div>
              {/* Demo accounts */}
      <div className="mt-5 pt-6 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
              One-click demo sign-in
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              disabled={loading}
              onClick={() => signIn(a.email, DEMO_PASSWORD)}
              className="text-left rounded-lg border border-border bg-surface/60 px-3 py-2 hover:bg-surface hover:border-border-strong transition-colors disabled:opacity-50"
            >
              <span className="block text-sm font-medium text-ink">{a.role}</span>
              <span className="block text-xs text-muted truncate">{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

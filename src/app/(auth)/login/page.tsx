import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-muted mb-6">
        Sign in to your {BRAND.product} workspace.
      </p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}

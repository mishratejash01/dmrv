import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-muted mb-6">
        Start a new project, or join one you&apos;ve been invited to.
      </p>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}

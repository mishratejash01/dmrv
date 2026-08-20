import Link from "next/link";
import { Logo } from "@/components/common/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen paper flex flex-col items-center justify-center text-center px-6">
      <span className="mb-5">
        <Logo height={24} />
      </span>
      <p className="font-display text-6xl font-semibold text-brand-deep">404</p>
      <h1 className="mt-2 font-display text-xl font-semibold text-brand-deep">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-muted max-w-sm text-pretty">
        The record or page you&apos;re looking for may have moved or been retired.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-flex items-center gap-2 rounded bg-clay px-4 py-2 text-sm font-medium text-elevated hover:bg-[#056b4b] transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

import Link from "next/link";
import { Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen paper flex flex-col items-center justify-center text-center px-6">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-clay text-elevated mb-5">
        <Leaf className="h-5 w-5" />
      </span>
      <p className="font-display text-6xl text-ink">404</p>
      <h1 className="mt-2 font-display text-xl text-ink">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-muted max-w-sm text-pretty">
        The record or page you&apos;re looking for may have moved or been retired.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-clay px-5 py-2.5 text-sm font-medium text-elevated hover:bg-[#056b4b] transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

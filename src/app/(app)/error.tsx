"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () =>void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-err-tint text-err mb-4">
        
      </span>
      <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
      <p className="mt-2 text-muted max-w-md text-pretty">
        We hit an unexpected error loading this view. Your data is safe — try again.
      </p>
      {error?.message && (
        <code className="mt-3 max-w-lg truncate rounded-md bg-surface px-3 py-1.5 text-xs text-muted">
          {error.message}
        </code>
      )}
      <Button className="mt-4" onClick={reset}>
         Try again
      </Button>
    </div>
  );
}

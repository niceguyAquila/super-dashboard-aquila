"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.04_245)_0%,_var(--shell-bg)_55%)] px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="break-words text-sm text-muted-foreground">
          {error.message || "This page could not be loaded."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
        )}
        <div className="flex justify-center gap-2 pt-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" render={<Link href="/" />}>
            Go home
          </Button>
        </div>
      </div>
    </main>
  );
}

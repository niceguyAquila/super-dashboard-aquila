"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BrandError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[brand route error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Couldn’t open this brand
        </h1>
        <p className="break-words text-sm text-muted-foreground">
          {error.message || "Unknown error while loading the brand dashboard."}
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" render={<Link href="/settings/brands" />}>
            Manage brands
          </Button>
        </div>
      </div>
    </main>
  );
}

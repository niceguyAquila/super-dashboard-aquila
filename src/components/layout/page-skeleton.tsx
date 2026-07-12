import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  variant = "list",
}: {
  variant?: "list" | "detail" | "simple";
}) {
  const rows = variant === "simple" ? 4 : variant === "detail" ? 6 : 8;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f5f0_0%,#ffffff_28%,#f0f7f4_100%)]">
      <div className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="ml-auto h-7 w-24" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        {variant === "detail" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
              >
                <Skeleton className="mb-3 h-3 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

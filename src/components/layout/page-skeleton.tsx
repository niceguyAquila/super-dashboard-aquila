import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  variant = "list",
  contentOnly = false,
}: {
  variant?: "list" | "detail" | "simple";
  /** When true, skip the fake app chrome (use inside AppShell). */
  contentOnly?: boolean;
}) {
  const rows = variant === "simple" ? 4 : variant === "detail" ? 6 : 8;

  const body = (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {variant === "list" && (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="ml-auto h-9 w-36" />
        </div>
      )}

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
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-[28%] max-w-[12rem]" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-16 sm:block" />
              <Skeleton className="hidden h-4 w-14 md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (contentOnly) {
    return body;
  }

  return (
    <div className="min-h-screen bg-shell-bg">
      <div className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="ml-auto h-7 w-24" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{body}</div>
    </div>
  );
}

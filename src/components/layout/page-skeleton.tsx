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
              className="rounded-xl border border-border bg-card p-4"
            >
              <Skeleton className="mb-3 h-3 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
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
    <div className="flex min-h-screen bg-shell-bg">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 border-r border-sidebar-border bg-sidebar p-5 md:block">
        <div className="flex h-full flex-col gap-6">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-8 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-3 border-b border-border px-4 md:hidden">
          <Skeleton className="size-8" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {body}
        </div>
      </div>
    </div>
  );
}

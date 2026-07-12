import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export function PageSkeleton({
  variant = "list",
}: {
  variant?: "list" | "detail" | "simple";
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f5f0_0%,#ffffff_28%,#f0f7f4_100%)]">
      <div className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="hidden h-7 w-20 sm:block" />
          <Skeleton className="hidden h-7 w-16 sm:block" />
          <Skeleton className="ml-auto h-7 w-24" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 animate-in fade-in duration-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56 sm:w-72" />
            <Skeleton className="h-4 w-72 sm:w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>

        {variant === "detail" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-2 pb-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: variant === "simple" ? 4 : 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>

        {variant === "detail" && (
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

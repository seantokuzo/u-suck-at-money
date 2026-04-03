import { cn } from "@/lib/utils";

/** Pulsing rectangle skeleton */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-zinc-800", className)} />;
}

/** Card-shaped skeleton */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900 p-6",
        className,
      )}
    >
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/** Text block skeleton */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** KPI card shape (label + big number) */
export function SkeletonKpiCard() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <Skeleton className="mb-3 h-4 w-28" />
      <Skeleton className="h-8 w-36" />
    </div>
  );
}

/** Table rows skeleton */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      {/* Header row */}
      <div className="mb-4 flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="ml-auto h-4 w-16" />
      </div>
      {/* Data rows */}
      <div className="divide-y divide-zinc-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Chart placeholder (rectangle) */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900 p-6",
        className,
      )}
    >
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="h-64 w-full rounded" />
    </div>
  );
}

/** Summary card with label + value + sub-info */
export function SkeletonSummaryCard() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="mb-3 h-7 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Progress bar skeleton (label + bar) */
export function SkeletonProgressBar() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
    </div>
  );
}

import { Skeleton, SkeletonProgressBar, SkeletonChart } from "@/components/ui/skeleton";

export default function BudgetLoading() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <Skeleton className="h-8 w-28" />
      <Skeleton className="mt-2 h-4 w-48" />

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
          >
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>

      {/* Budget progress bars */}
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <Skeleton className="mb-6 h-5 w-36" />
        <div className="space-y-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonProgressBar key={i} />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-8">
        <SkeletonChart />
      </div>
    </div>
  );
}

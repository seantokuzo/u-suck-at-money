import { Skeleton, SkeletonSummaryCard, SkeletonProgressBar } from "@/components/ui/skeleton";

export default function RetirementLoading() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-2 h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SkeletonSummaryCard />
        <SkeletonSummaryCard />
        <SkeletonSummaryCard />
      </div>

      {/* 401k Plans */}
      <section className="mt-8">
        <Skeleton className="mb-4 h-6 w-28" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
              <SkeletonProgressBar />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <Skeleton className="mb-1 h-3 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div>
                  <Skeleton className="mb-1 h-3 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HSA Plans */}
      <section className="mt-8">
        <Skeleton className="mb-4 h-6 w-28" />
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
            <SkeletonProgressBar />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="mb-1 h-3 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div>
                <Skeleton className="mb-1 h-3 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

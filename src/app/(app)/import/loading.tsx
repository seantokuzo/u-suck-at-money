import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <Skeleton className="h-8 w-28" />
      <Skeleton className="mt-2 h-4 w-56" />

      {/* Account selector */}
      <div className="mt-6">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Upload area */}
      <div className="mt-6 rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-12">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-2 h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Pattern section */}
      <div className="mt-8">
        <Skeleton className="mb-4 h-6 w-36" />
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

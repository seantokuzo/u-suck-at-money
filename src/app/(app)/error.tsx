"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md items-center justify-center px-6 py-24">
      <Card className="w-full text-center">
        <div className="mb-4 text-5xl text-zinc-700">!</div>
        <h2 className="text-xl font-bold text-zinc-100">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          An unexpected error occurred. Please try again or head back to the
          dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}

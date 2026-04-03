"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-md px-6 text-center">
          <div className="mb-6 text-6xl text-zinc-700">!</div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

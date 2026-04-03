import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-zinc-800">404</p>
        <h1 className="mt-4 text-2xl font-bold text-zinc-100">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">U Suck At Money</h1>
          <span className="text-sm text-zinc-400">
            {session.user?.name ?? session.user?.email}
          </span>
        </div>
      </header>

      {/* Dashboard placeholder */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="mt-2 text-zinc-400">
            Phase 0 complete. The foundation is set.
          </p>

          {/* KPI cards placeholder */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["Net Worth", "Monthly Cashflow", "Spending This Month", "401k Progress"].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
                >
                  <p className="text-sm text-zinc-400">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-zinc-500">--</p>
                </div>
              ),
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

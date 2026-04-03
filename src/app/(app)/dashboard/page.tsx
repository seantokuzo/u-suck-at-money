import Link from "next/link";
import {
  getNetWorth,
  getMonthlySnapshot,
  getAccountSummary,
  getRecentTransactions,
  getMonthlySnapshots,
  getCategorySpend,
} from "@/db/queries/dashboard";
import { getTotalMonthlyIncome } from "@/db/queries/income";
import {
  getUpcomingBills,
  getTotalMonthlyRecurring,
} from "@/db/queries/recurring-expenses";
import { DashboardCharts } from "./dashboard-charts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents, formatDate, currentMonth, cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

// ─── Account type display labels ────────────────────────
const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  brokerage: "Brokerage",
  "401k": "401k",
  hsa: "HSA",
  credit_card: "Credit Card",
  other: "Other",
};

// ─── KPI Card ───────────────────────────────────────────
function KpiCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <Card>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold", colorClass)}>{value}</p>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────
export default async function DashboardPage() {
  const [
    netWorth,
    snapshot,
    accountGroups,
    recentTxns,
    snapshots,
    categorySpend,
    projectedIncome,
    projectedRecurring,
    upcomingBills,
  ] = await Promise.all([
    getNetWorth(),
    getMonthlySnapshot(currentMonth()),
    getAccountSummary(),
    getRecentTransactions(5),
    getMonthlySnapshots(6),
    getCategorySpend(currentMonth()),
    getTotalMonthlyIncome(),
    getTotalMonthlyRecurring(),
    getUpcomingBills(14),
  ]);

  const projectedNet = projectedIncome - projectedRecurring;

  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <p className="mt-2 text-zinc-400">Your financial command center.</p>

      {/* ── KPI Cards ─────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Net Worth"
          value={formatCents(netWorth)}
          colorClass={netWorth >= 0 ? "text-green-400" : "text-red-400"}
        />
        <KpiCard
          label="Monthly Cashflow"
          value={snapshot ? formatCents(snapshot.netCashflowCents) : "--"}
          colorClass={
            !snapshot
              ? "text-zinc-500"
              : snapshot.netCashflowCents >= 0
                ? "text-green-400"
                : "text-red-400"
          }
        />
        <KpiCard
          label="Spending This Month"
          value={snapshot ? formatCents(snapshot.totalExpensesCents) : "--"}
          colorClass={snapshot ? "text-red-400" : "text-zinc-500"}
        />
        <KpiCard
          label="Income This Month"
          value={snapshot ? formatCents(snapshot.totalIncomeCents) : "--"}
          colorClass={snapshot ? "text-green-400" : "text-zinc-500"}
        />
      </div>

      {/* ── Projected Monthly Summary ─────────────────── */}
      <Card className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-zinc-400">Projected Monthly Summary</p>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Income</span>
              <span className="text-sm font-semibold text-green-400">
                {formatCents(projectedIncome)}
              </span>
            </div>
            <span className="hidden text-zinc-700 sm:inline">|</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Recurring</span>
              <span className="text-sm font-semibold text-red-400">
                {formatCents(projectedRecurring)}
              </span>
            </div>
            <span className="hidden text-zinc-700 sm:inline">|</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Net</span>
              <span
                className={cn(
                  "text-sm font-bold",
                  projectedNet >= 0 ? "text-green-400" : "text-red-400",
                )}
              >
                {formatCents(projectedNet)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Account Summary ───────────────────────────── */}
      <section className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Accounts</h3>

        {accountGroups.length === 0 ? (
          <Card className="text-center">
            <p className="text-zinc-400">
              No accounts yet.{" "}
              <Link href="/accounts" className="text-blue-400 underline hover:text-blue-300">
                Add your first account to get started.
              </Link>
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {accountGroups.map((group) => (
              <Card key={group.type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {TYPE_LABELS[group.type] ?? group.type}
                      </CardTitle>
                      <Badge>
                        {group.accounts.length} account{group.accounts.length !== 1 && "s"}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold text-zinc-300">
                      {formatCents(group.totalCents)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {group.accounts.map((acct) => (
                      <li
                        key={acct.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <span className="text-zinc-200">{acct.name}</span>
                          {acct.institution && (
                            <span className="ml-2 text-zinc-500">{acct.institution}</span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "font-medium",
                            acct.currentBalanceCents >= 0
                              ? "text-zinc-300"
                              : "text-red-400",
                          )}
                        >
                          {formatCents(acct.currentBalanceCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Upcoming Bills ──────────────────────────── */}
      <section className="mt-10">
        <div className="mb-4 flex items-baseline gap-2">
          <h3 className="text-lg font-semibold text-zinc-100">Upcoming Bills</h3>
          <span className="text-sm text-zinc-500">(next 14 days)</span>
        </div>

        {upcomingBills.length === 0 ? (
          <Card className="text-center">
            <p className="text-zinc-400">No bills due in the next 14 days</p>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <ul className="divide-y divide-zinc-800">
                {upcomingBills.map((bill) => (
                  <li
                    key={bill.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {bill.categoryColor && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: bill.categoryColor }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm text-zinc-200">
                            {bill.name}
                          </p>
                          {bill.isAutoPay && (
                            <Badge variant="info">Auto-pay</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {bill.daysUntilDue === 0
                            ? "Due today"
                            : bill.daysUntilDue === 1
                              ? "Due tomorrow"
                              : `Due in ${bill.daysUntilDue} days`}
                          {bill.categoryName && (
                            <span className="ml-2">{bill.categoryName}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="ml-4 text-sm font-medium text-red-400">
                      {formatCents(bill.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <Link
                href="/expenses"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View all recurring expenses &rarr;
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* ── Recent Transactions ───────────────────────── */}
      <section className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Recent Transactions</h3>

        {recentTxns.length === 0 ? (
          <Card className="text-center">
            <p className="text-zinc-400">
              No transactions yet.{" "}
              <Link href="/import" className="text-blue-400 underline hover:text-blue-300">
                Import your bank statement to get started.
              </Link>
            </p>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <ul className="divide-y divide-zinc-800">
                {recentTxns.map((txn) => (
                  <li
                    key={txn.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">
                        {txn.description}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatDate(txn.date)}
                        {txn.categoryName && (
                          <span className="ml-2">{txn.categoryName}</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "ml-4 text-sm font-medium",
                        txn.amountCents >= 0 ? "text-green-400" : "text-red-400",
                      )}
                    >
                      {formatCents(txn.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Charts ──────────────────────────────────── */}
      <section className="mt-10 mb-10">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Charts</h3>
        <DashboardCharts
          monthlySnapshots={snapshots.map((s) => ({
            month: s.month,
            totalIncomeCents: s.totalIncomeCents,
            totalExpensesCents: s.totalExpensesCents,
            netCashflowCents: s.netCashflowCents,
          }))}
          categorySpend={categorySpend}
        />
      </section>
    </div>
  );
}

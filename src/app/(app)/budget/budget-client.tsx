"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents, cn } from "@/lib/utils";
import type { CategoryBudgetVsActual } from "@/db/queries/dashboard";

// ─── Types ──────────────────────────────────────────────

interface BudgetClientProps {
  categories: CategoryBudgetVsActual[];
  totalIncomeCents: number;
  totalExpensesCents: number;
}

interface ChartDatum {
  name: string;
  budget: number;
  actual: number;
  color: string | null;
}

// ─── Helpers ────────────────────────────────────────────

function centsToDollars(cents: number): number {
  return cents / 100;
}

function budgetPct(actual: number, budget: number): number {
  if (budget === 0) return actual > 0 ? 999 : 0;
  return Math.round((actual / budget) * 100);
}

function progressColor(pct: number): string {
  if (pct > 100) return "bg-red-500";
  if (pct >= 80) return "bg-yellow-500";
  return "bg-green-500";
}

function progressBadgeVariant(pct: number): "success" | "warning" | "danger" {
  if (pct > 100) return "danger";
  if (pct >= 80) return "warning";
  return "success";
}

// ─── Custom Tooltip ─────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-lg">
      <p className="mb-1 text-sm font-medium text-zinc-100">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs text-zinc-400">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {formatCents(Math.round(entry.value * 100))}
        </p>
      ))}
    </div>
  );
}

// ─── Dollar Tick Formatter ──────────────────────────────

function formatDollarTick(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
}

// ─── Component ──────────────────────────────────────────

export function BudgetClient({ categories }: BudgetClientProps) {
  // Sort by % of budget used, highest first
  const sorted = [...categories].sort((a, b) => {
    const pctA = budgetPct(a.actualCents, a.budgetCents);
    const pctB = budgetPct(b.actualCents, b.budgetCents);
    return pctB - pctA;
  });

  // Summary totals
  const totalBudgetCents = sorted.reduce((s, c) => s + c.budgetCents, 0);
  const totalActualCents = sorted.reduce((s, c) => s + c.actualCents, 0);
  const remainingCents = totalBudgetCents - totalActualCents;

  // Chart data (in dollars for display)
  const chartData: ChartDatum[] = sorted.map((c) => ({
    name: c.categoryName,
    budget: centsToDollars(c.budgetCents),
    actual: centsToDollars(c.actualCents),
    color: c.color,
  }));

  // ── Empty State ──────────────────────────────────────
  if (sorted.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-bold">Budget vs Actual</h2>
        <p className="mt-2 text-zinc-400">
          Track your spending against category budgets.
        </p>

        <Card className="mt-8 text-center">
          <p className="text-zinc-400">
            No budgets set.{" "}
            <Link
              href="/settings"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Set category budgets in Settings to track spending.
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold">Budget vs Actual</h2>
      <p className="mt-2 text-zinc-400">
        Track your spending against category budgets.
      </p>

      {/* ── Summary Cards ────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-400">Total Budget</p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {formatCents(totalBudgetCents)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-400">Total Spent</p>
          <p className="mt-2 text-2xl font-bold text-red-400">
            {formatCents(totalActualCents)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-400">Remaining</p>
          <p
            className={cn(
              "mt-2 text-2xl font-bold",
              remainingCents >= 0 ? "text-green-400" : "text-red-400",
            )}
          >
            {formatCents(remainingCents)}
          </p>
        </Card>
      </div>

      {/* ── Grouped Bar Chart ────────────────────────────── */}
      <Card className="mt-8">
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                stroke="#3f3f46"
              />
              <YAxis
                tickFormatter={formatDollarTick}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                stroke="#3f3f46"
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }}
              />
              <Bar
                dataKey="budget"
                name="Budget"
                fill="#3f3f46"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="actual"
                name="Actual"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Category Detail Cards ────────────────────────── */}
      <div className="mt-8 mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((cat) => {
          const pct = budgetPct(cat.actualCents, cat.budgetCents);
          const remaining = cat.budgetCents - cat.actualCents;
          const colorClass = progressColor(pct);
          const variant = progressBadgeVariant(pct);

          return (
            <Card key={cat.categoryId}>
              <div className="flex items-center gap-2">
                {cat.color && (
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                )}
                <h4 className="font-semibold text-zinc-100">
                  {cat.categoryName}
                </h4>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-zinc-400">Budget</span>
                <span className="text-zinc-200">
                  {formatCents(cat.budgetCents)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-zinc-400">Spent</span>
                <span className="text-zinc-200">
                  {formatCents(cat.actualCents)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-zinc-800">
                  <div
                    className={cn("h-2 rounded-full", colorClass)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span
                  className={cn(
                    variant === "danger"
                      ? "text-red-400"
                      : variant === "warning"
                        ? "text-yellow-400"
                        : "text-green-400",
                  )}
                >
                  {pct}% of budget
                </span>
                <span
                  className={cn(
                    "font-medium",
                    remaining >= 0 ? "text-green-400" : "text-red-400",
                  )}
                >
                  {remaining >= 0
                    ? `${formatCents(remaining)} remaining`
                    : `${formatCents(Math.abs(remaining))} over budget`}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

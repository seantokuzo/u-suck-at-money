"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface DashboardChartsProps {
  monthlySnapshots: Array<{
    month: string;
    totalIncomeCents: number;
    totalExpensesCents: number;
    netCashflowCents: number;
  }>;
  categorySpend: Array<{
    categoryId: string;
    categoryName: string;
    totalCents: number;
    color: string | null;
  }>;
}

// ─── Constants ──────────────────────────────────────────

const FALLBACK_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "6px",
  color: "#fafafa",
};

// ─── Helpers ────────────────────────────────────────────

function formatMonthLabel(month: string): string {
  return new Date(month + "-01").toLocaleDateString("en-US", {
    month: "short",
  });
}

function centsToDisplayDollars(cents: number): number {
  return Math.abs(cents) / 100;
}

// ─── Component ──────────────────────────────────────────

export function DashboardCharts({
  monthlySnapshots,
  categorySpend,
}: DashboardChartsProps) {
  // Reverse snapshots for chronological order (query returns DESC)
  const cashflowData = [...monthlySnapshots].reverse().map((s) => ({
    month: formatMonthLabel(s.month),
    income: s.totalIncomeCents / 100,
    expenses: Math.abs(s.totalExpensesCents) / 100,
  }));

  // Top 5 categories by absolute spend, sorted largest first
  const topCategories = [...categorySpend]
    .sort((a, b) => Math.abs(b.totalCents) - Math.abs(a.totalCents))
    .slice(0, 5)
    .map((cat, i) => ({
      name: cat.categoryName,
      amount: centsToDisplayDollars(cat.totalCents),
      fill: cat.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* ── Cashflow Trend ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Cashflow</CardTitle>
        </CardHeader>
        <CardContent>
          {cashflowData.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-sm text-zinc-500">No monthly data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={cashflowData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={{ stroke: "#3f3f46" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={{ stroke: "#3f3f46" }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value, name) => [
                    formatCents(Math.round(Number(value) * 100)),
                    name === "income" ? "Income" : "Expenses",
                  ]}
                  labelStyle={{ color: "#a1a1aa" }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Top Spending Categories ────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {topCategories.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-sm text-zinc-500">
                No spending data this month
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={topCategories}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={{ stroke: "#3f3f46" }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={{ stroke: "#3f3f46" }}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [
                    formatCents(Math.round(Number(value) * 100)),
                    "Spent",
                  ]}
                  labelStyle={{ color: "#a1a1aa" }}
                  cursor={{ fill: "#27272a" }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {topCategories.map((cat, i) => (
                    <Cell key={`cell-${i}`} fill={cat.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

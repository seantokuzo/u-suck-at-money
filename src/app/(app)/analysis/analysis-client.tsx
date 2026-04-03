"use client";

import { useState, useTransition } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCents, cn } from "@/lib/utils";
import { fetchAnalysisData } from "@/actions/snapshots";
import { generateAllMissingSnapshots } from "@/actions/snapshots";
import type { CategorySpend } from "@/db/queries/dashboard";
import type { getMonthlySnapshot, getMonthlySnapshots } from "@/db/queries/dashboard";

// ─── Types ──────────────────────────────────────────────

type Snapshot = NonNullable<Awaited<ReturnType<typeof getMonthlySnapshot>>>;
type SnapshotRow = Awaited<ReturnType<typeof getMonthlySnapshots>>[number];

interface AnalysisClientProps {
  initialCategorySpend: CategorySpend[];
  initialSnapshot: Snapshot | null;
  snapshots: SnapshotRow[];
  initialMonth: string;
}

// ─── Constants ──────────────────────────────────────────

const DEFAULT_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
];

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "8px",
    color: "#f4f4f5",
  },
  itemStyle: { color: "#f4f4f5" },
  labelStyle: { color: "#a1a1aa" },
};

// ─── Helpers ────────────────────────────────────────────

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Recharts Tooltip formatter types are notoriously strict with intersection generics.
// Cast is the standard workaround for Recharts v3 typing.
const centsTooltipFormatter = ((value: number | string | undefined) => {
  if (value == null) return "--";
  return formatCents(Number(value));
}) as never;

function centsAxisFormatter(value: number): string {
  const dollars = Math.abs(value / 100);
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

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

// ─── Main Component ─────────────────────────────────────

export function AnalysisClient({
  initialCategorySpend,
  initialSnapshot,
  snapshots,
  initialMonth,
}: AnalysisClientProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [categorySpend, setCategorySpend] = useState(initialCategorySpend);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initialSnapshot);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  // Derive available months from snapshots + current month
  const availableMonths = Array.from(
    new Set([initialMonth, ...snapshots.map((s) => s.month)]),
  ).sort((a, b) => b.localeCompare(a)); // DESC so newest first in dropdown

  const monthOptions = availableMonths.map((m) => ({
    value: m,
    label: formatMonthLabel(m),
  }));

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const month = e.target.value;
    setSelectedMonth(month);
    startTransition(async () => {
      const data = await fetchAnalysisData(month);
      setCategorySpend(data.categorySpend);
      setSnapshot(data.snapshot);
    });
  }

  async function handleGenerateSnapshots() {
    setIsGenerating(true);
    try {
      await generateAllMissingSnapshots();
      // Reload with current month data
      const data = await fetchAnalysisData(selectedMonth);
      setCategorySpend(data.categorySpend);
      setSnapshot(data.snapshot);
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Prepare chart data ──────────────────────────────

  // Category pie/bar data: use absolute values for display, sorted largest first
  const categoryChartData = categorySpend
    .map((c, i) => ({
      name: c.categoryName,
      value: Math.abs(c.totalCents),
      color: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  // Monthly trend data: reverse to chronological order
  const trendData = [...snapshots]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((s) => ({
      month: formatMonthLabel(s.month),
      income: s.totalIncomeCents,
      expenses: s.totalExpensesCents,
    }));

  const hasSnapshots = snapshots.length > 0;
  const hasCategoryData = categoryChartData.length > 0;

  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold">Spend Analysis</h2>
      <p className="mt-2 text-zinc-400">
        Break down where your money goes.
      </p>

      {/* ── Month Selector ─────────────────────────────── */}
      <div className="mt-6 max-w-xs">
        <Select
          label="Month"
          options={monthOptions}
          value={selectedMonth}
          onChange={handleMonthChange}
          disabled={isPending}
        />
      </div>

      {/* ── KPI Summary Row ────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Spent"
          value={snapshot ? formatCents(snapshot.totalExpensesCents) : "--"}
          colorClass={snapshot ? "text-red-400" : "text-zinc-500"}
        />
        <KpiCard
          label="Total Income"
          value={snapshot ? formatCents(snapshot.totalIncomeCents) : "--"}
          colorClass={snapshot ? "text-green-400" : "text-zinc-500"}
        />
        <KpiCard
          label="Net Cashflow"
          value={snapshot ? formatCents(snapshot.netCashflowCents) : "--"}
          colorClass={
            !snapshot
              ? "text-zinc-500"
              : snapshot.netCashflowCents >= 0
                ? "text-green-400"
                : "text-red-400"
          }
        />
      </div>

      {/* ── Category Breakdown Charts ──────────────────── */}
      <section className="mt-8">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">
          Category Breakdown
        </h3>

        {!hasCategoryData ? (
          <Card className="text-center">
            <p className="text-zinc-400">
              No spending data for this month.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      dataKey="value"
                      nameKey="name"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={centsTooltipFormatter}
                      {...TOOLTIP_STYLE}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Spending Ranked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={categoryChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={centsAxisFormatter}
                      stroke="#71717a"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 12, fill: "#a1a1aa" }}
                      stroke="#71717a"
                    />
                    <Tooltip
                      formatter={centsTooltipFormatter}
                      {...TOOLTIP_STYLE}
                    />
                    <Bar dataKey="value" name="Spent" radius={[0, 4, 4, 0]}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ── Monthly Trends ─────────────────────────────── */}
      <section className="mt-8 mb-10">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">
          Monthly Trends
        </h3>

        {!hasSnapshots ? (
          <Card className="text-center">
            <p className="text-zinc-400">
              Import transactions and generate snapshots to see trends.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={handleGenerateSnapshots}
                loading={isGenerating}
              >
                Generate Snapshots
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Income vs Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#71717a"
                    tick={{ fontSize: 12, fill: "#a1a1aa" }}
                  />
                  <YAxis
                    tickFormatter={centsAxisFormatter}
                    stroke="#71717a"
                    tick={{ fontSize: 12, fill: "#a1a1aa" }}
                  />
                  <Tooltip
                    formatter={centsTooltipFormatter}
                    {...TOOLTIP_STYLE}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

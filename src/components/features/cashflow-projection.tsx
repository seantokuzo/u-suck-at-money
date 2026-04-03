"use client";

import {
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCents, cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface CashflowProjectionData {
  month: string;
  projectedIncomeCents: number;
  projectedExpensesCents: number;
  projectedNetCents: number;
}

interface CashflowProjectionProps {
  projections: CashflowProjectionData[];
}

// ─── Constants ──────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────

export function CashflowProjection({ projections }: CashflowProjectionProps) {
  const chartData = projections.map((p) => ({
    month: formatMonthLabel(p.month),
    income: p.projectedIncomeCents / 100,
    expenses: p.projectedExpensesCents / 100,
    net: p.projectedNetCents / 100,
  }));

  // Build cumulative totals for the table
  let cumulativeCents = 0;
  const tableData = projections.map((p) => {
    cumulativeCents += p.projectedNetCents;
    return {
      month: p.month,
      monthLabel: new Date(p.month + "-01").toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      projectedIncomeCents: p.projectedIncomeCents,
      projectedExpensesCents: p.projectedExpensesCents,
      projectedNetCents: p.projectedNetCents,
      cumulativeCents,
    };
  });

  return (
    <div className="space-y-4">
      {/* ── Projected Cashflow Chart ──────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projected Cashflow</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-sm text-zinc-500">
                No projection data available
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
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
                    name === "income"
                      ? "Income"
                      : name === "expenses"
                        ? "Expenses"
                        : "Net",
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
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Monthly Breakdown Table ───────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {tableData.length === 0 ? (
            <p className="text-sm text-zinc-500">No projection data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <th className="pb-2 pr-4">Month</th>
                    <th className="pb-2 pr-4 text-right">Income</th>
                    <th className="pb-2 pr-4 text-right">Expenses</th>
                    <th className="pb-2 pr-4 text-right">Net</th>
                    <th className="pb-2 text-right">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr
                      key={row.month}
                      className="border-b border-zinc-800/50"
                    >
                      <td className="py-2.5 pr-4 text-zinc-100">
                        {row.monthLabel}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-green-400">
                        {formatCents(row.projectedIncomeCents)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-red-400">
                        {formatCents(row.projectedExpensesCents)}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 pr-4 text-right font-medium tabular-nums",
                          row.projectedNetCents >= 0
                            ? "text-green-400"
                            : "text-red-400",
                        )}
                      >
                        {formatCents(row.projectedNetCents)}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 text-right font-medium tabular-nums",
                          row.cumulativeCents >= 0
                            ? "text-green-400"
                            : "text-red-400",
                        )}
                      >
                        {formatCents(row.cumulativeCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

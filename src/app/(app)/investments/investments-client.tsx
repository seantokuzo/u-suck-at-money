"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";
import { UpdateBalanceModal } from "@/components/features/update-balance-modal";
import {
  fetchInvestmentData,
  updateInvestmentBalance,
} from "@/actions/investments";
import { formatCents, cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────

interface InvestmentAccount {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currentBalanceCents: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AllocationGroup {
  type: string;
  totalCents: number;
  accounts: {
    id: string;
    name: string;
    institution: string | null;
    currentBalanceCents: number;
  }[];
}

interface BalanceHistoryEntry {
  month: string;
  brokerage: number;
  "401k": number;
  hsa: number;
  total: number;
}

interface InvestmentPageData {
  investmentAccounts: InvestmentAccount[];
  totalBalanceCents: number;
  allocation: AllocationGroup[];
  balanceHistory: BalanceHistoryEntry[];
}

interface InvestmentsClientProps {
  initialData: InvestmentPageData;
}

// ─── Constants ─────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  brokerage: "Brokerage",
  "401k": "401(k)",
  hsa: "HSA",
};

const TYPE_COLORS: Record<string, string> = {
  brokerage: "#3b82f6", // blue-500
  "401k": "#8b5cf6", // violet-500
  hsa: "#22c55e", // green-500
};

const TYPE_BADGE_VARIANT: Record<string, "default" | "success" | "info"> = {
  brokerage: "info",
  "401k": "default",
  hsa: "success",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "6px",
  color: "#fafafa",
};

// ─── Helpers ───────────────────────────────────────────

function formatMonthLabel(month: string): string {
  return new Date(month + "-01").toLocaleDateString("en-US", {
    month: "short",
  });
}

function formatPct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

// ─── Component ─────────────────────────────────────────

export function InvestmentsClient({ initialData }: InvestmentsClientProps) {
  const queryClient = useQueryClient();

  // ── Data query ────────────────────────────────────────
  const { data } = useQuery({
    queryKey: ["investments"],
    queryFn: () => fetchInvestmentData(),
    initialData,
  });

  const { investmentAccounts, totalBalanceCents, allocation, balanceHistory } =
    data;

  // ── Modal state ───────────────────────────────────────
  const [updateTarget, setUpdateTarget] = useState<{
    id: string;
    name: string;
    currentBalanceCents: number;
  } | null>(null);

  // ── Mutation ──────────────────────────────────────────
  const updateBalanceMutation = useMutation({
    mutationFn: ({
      accountId,
      newBalanceCents,
    }: {
      accountId: string;
      newBalanceCents: number;
    }) => updateInvestmentBalance(accountId, newBalanceCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setUpdateTarget(null);
    },
  });

  // ── Derived values ────────────────────────────────────
  const brokerageTotal =
    allocation.find((g) => g.type === "brokerage")?.totalCents ?? 0;
  const fourOhOneKTotal =
    allocation.find((g) => g.type === "401k")?.totalCents ?? 0;
  const hsaTotal =
    allocation.find((g) => g.type === "hsa")?.totalCents ?? 0;

  // Pie chart data
  const pieData = allocation.map((group) => ({
    name: TYPE_LABELS[group.type] ?? group.type,
    value: group.totalCents / 100,
    cents: group.totalCents,
    fill: TYPE_COLORS[group.type] ?? "#71717a",
  }));

  // Area chart data
  const areaData = balanceHistory.map((entry) => ({
    month: formatMonthLabel(entry.month),
    Brokerage: entry.brokerage / 100,
    "401(k)": entry["401k"] / 100,
    HSA: entry.hsa / 100,
    Total: entry.total / 100,
  }));

  // ── Empty state ───────────────────────────────────────
  if (investmentAccounts.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Investments</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track your investment portfolio across brokerage, 401(k), and HSA
            accounts.
          </p>
        </div>
        <Card className="p-12 text-center">
          <p className="text-zinc-400">
            No investment accounts yet. Create a brokerage, 401(k), or HSA
            account to get started.
          </p>
          <a
            href="/accounts"
            className="mt-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            Go to Accounts
          </a>
        </Card>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Investments</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track your investment portfolio across brokerage, 401(k), and HSA
          accounts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Portfolio"
          value={formatCents(totalBalanceCents)}
          variant="default"
        />
        <SummaryCard
          label="Brokerage"
          value={formatCents(brokerageTotal)}
          subtext={formatPct(brokerageTotal, totalBalanceCents)}
          variant="blue"
        />
        <SummaryCard
          label="401(k)"
          value={formatCents(fourOhOneKTotal)}
          subtext={formatPct(fourOhOneKTotal, totalBalanceCents)}
          variant="purple"
        />
        <SummaryCard
          label="HSA"
          value={formatCents(hsaTotal)}
          subtext={formatPct(hsaTotal, totalBalanceCents)}
          variant="green"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Portfolio Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center">
                <p className="text-sm text-zinc-500">No allocation data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    cornerRadius={4}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, name) => {
                      const cents = Math.round(Number(value) * 100);
                      return [
                        `${formatCents(cents)} (${formatPct(cents, totalBalanceCents)})`,
                        name,
                      ];
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => (
                      <span className="text-sm text-zinc-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Balance History Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance History</CardTitle>
          </CardHeader>
          <CardContent>
            {areaData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center">
                <p className="text-sm text-zinc-500">
                  No monthly snapshots yet
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={areaData}
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
                    tickFormatter={(v: number) =>
                      `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toLocaleString()}`
                    }
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, name) => [
                      formatCents(Math.round(Number(value) * 100)),
                      name,
                    ]}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Brokerage"
                    stackId="1"
                    stroke={TYPE_COLORS.brokerage}
                    fill={TYPE_COLORS.brokerage}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="401(k)"
                    stackId="1"
                    stroke={TYPE_COLORS["401k"]}
                    fill={TYPE_COLORS["401k"]}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="HSA"
                    stackId="1"
                    stroke={TYPE_COLORS.hsa}
                    fill={TYPE_COLORS.hsa}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account List — Grouped by Type */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Accounts</h2>
        <div className="space-y-6">
          {(["brokerage", "401k", "hsa"] as const).map((type) => {
            const group = allocation.find((g) => g.type === type);
            if (!group || group.accounts.length === 0) return null;

            return (
              <div key={type}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    {TYPE_LABELS[type]}
                  </h3>
                  <span className="text-xs tabular-nums text-zinc-500">
                    {formatCents(group.totalCents)}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.accounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      type={type}
                      onUpdateBalance={() =>
                        setUpdateTarget({
                          id: account.id,
                          name: account.name,
                          currentBalanceCents: account.currentBalanceCents,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Update Balance Modal */}
      {updateTarget && (
        <UpdateBalanceModal
          open={!!updateTarget}
          onClose={() => setUpdateTarget(null)}
          accountName={updateTarget.name}
          currentBalanceCents={updateTarget.currentBalanceCents}
          onSave={(newBalanceCents) =>
            updateBalanceMutation.mutate({
              accountId: updateTarget.id,
              newBalanceCents,
            })
          }
          isSaving={updateBalanceMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Summary Card ──────────────────────────────────────

function SummaryCard({
  label,
  value,
  subtext,
  variant = "default",
}: {
  label: string;
  value: string;
  subtext?: string;
  variant?: "green" | "blue" | "purple" | "default";
}) {
  const valueColor =
    variant === "green"
      ? "text-green-400"
      : variant === "blue"
        ? "text-blue-400"
        : variant === "purple"
          ? "text-violet-400"
          : "text-zinc-100";

  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", valueColor)}>
        {value}
      </p>
      {subtext && (
        <p className="mt-0.5 text-xs text-zinc-500">{subtext}</p>
      )}
    </Card>
  );
}

// ─── Account Card ──────────────────────────────────────

function AccountCard({
  account,
  type,
  onUpdateBalance,
}: {
  account: {
    id: string;
    name: string;
    institution: string | null;
    currentBalanceCents: number;
  };
  type: string;
  onUpdateBalance: () => void;
}) {
  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-100 truncate">
            {account.name}
          </span>
          <Badge variant={TYPE_BADGE_VARIANT[type] ?? "default"}>
            {TYPE_LABELS[type] ?? type}
          </Badge>
        </div>
        {account.institution && (
          <p className="mt-0.5 text-sm text-zinc-400">
            {account.institution}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <p className="text-lg font-semibold tabular-nums text-zinc-100">
          {formatCents(account.currentBalanceCents)}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={onUpdateBalance}
        >
          Update Balance
        </Button>
      </div>
    </Card>
  );
}

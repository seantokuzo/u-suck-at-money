"use client";

import { useState, useTransition } from "react";
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
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Select, Modal, Input } from "@/components/ui";
import { RetirementPlanForm } from "@/components/features/retirement-plan-form";
import { HsaPlanForm } from "@/components/features/hsa-plan-form";
import {
  fetchRetirementData,
  deleteRetirementPlan,
  deleteHsaPlan,
  addContribution,
  addHsaContribution,
} from "@/actions/retirement";
import { formatCents, cn, parseCents } from "@/lib/utils";
import type { RetirementSummary } from "@/db/queries/retirement";

// ─── Types ──────────────────────────────────────────────

interface RetirementPlanRow {
  id: string;
  name: string;
  accountId: string | null;
  annualLimitCents: number;
  ytdContributionsCents: number;
  perPaycheckAmountCents: number | null;
  employerMatchPct: number | null;
  employerMatchCap: number | null;
  vestedBalanceCents: number | null;
  totalBalanceCents: number | null;
  year: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  accountName: string | null;
}

interface HsaPlanRow {
  id: string;
  name: string;
  accountId: string | null;
  annualLimitCents: number;
  ytdContributionsCents: number;
  perPaycheckAmountCents: number | null;
  cashBalanceCents: number | null;
  investmentBalanceCents: number | null;
  year: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  accountName: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currentBalanceCents: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RetirementPageData {
  plans401k: RetirementPlanRow[];
  hsaPlans: HsaPlanRow[];
  summary: RetirementSummary;
  year: number;
}

interface RetirementClientProps {
  initialData: RetirementPageData;
  accounts: Account[];
}

// ─── Constants ──────────────────────────────────────────

const CURRENT_YEAR = 2026;

const CHART_COLORS = {
  "401k_contributed": "#22c55e",
  "401k_remaining": "#3f3f46",
  hsa_contributed: "#3b82f6",
  hsa_remaining: "#3f3f46",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
    color: "#f4f4f5",
    fontSize: "13px",
  },
  itemStyle: { color: "#a1a1aa" },
};

// ─── Helpers ────────────────────────────────────────────

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function estimateRemainingPaychecks(
  ytdCents: number,
  limitCents: number,
  perPaycheckCents: number | null,
): number | null {
  if (!perPaycheckCents || perPaycheckCents === 0) return null;
  const remaining = limitCents - ytdCents;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / perPaycheckCents);
}

// Recharts Tooltip formatter types are notoriously strict with intersection generics.
// Cast is the standard workaround for Recharts v3 typing.
const centsTooltipFormatter = ((value: number | string | undefined) => {
  if (value == null) return "--";
  return formatCents(Number(value));
}) as never;

// ─── Component ──────────────────────────────────────────

export function RetirementClient({
  initialData,
  accounts,
}: RetirementClientProps) {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(initialData.year);

  // ── Data query ────────────────────────────────────────
  const { data } = useQuery({
    queryKey: ["retirement-plans", selectedYear],
    queryFn: () => fetchRetirementData(selectedYear),
    initialData: selectedYear === initialData.year ? initialData : undefined,
  });

  const { plans401k, hsaPlans: hsaPlansList, summary } = data ?? initialData;

  // ── Modal state ───────────────────────────────────────
  const [add401kOpen, setAdd401kOpen] = useState(false);
  const [edit401k, setEdit401k] = useState<RetirementPlanRow | null>(null);
  const [addHsaOpen, setAddHsaOpen] = useState(false);
  const [editHsa, setEditHsa] = useState<HsaPlanRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "401k" | "hsa";
    id: string;
    name: string;
  } | null>(null);
  const [contributionModal, setContributionModal] = useState<{
    type: "401k" | "hsa";
    id: string;
    name: string;
  } | null>(null);

  // ── Mutations ─────────────────────────────────────────
  const delete401kMutation = useMutation({
    mutationFn: deleteRetirementPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retirement-plans"] });
      setConfirmDelete(null);
    },
  });

  const deleteHsaMutation = useMutation({
    mutationFn: deleteHsaPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retirement-plans"] });
      setConfirmDelete(null);
    },
  });

  const addContribMutation = useMutation({
    mutationFn: ({ id, amountCents }: { id: string; amountCents: number }) =>
      addContribution(id, amountCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retirement-plans"] });
      setContributionModal(null);
    },
  });

  const addHsaContribMutation = useMutation({
    mutationFn: ({ id, amountCents }: { id: string; amountCents: number }) =>
      addHsaContribution(id, amountCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retirement-plans"] });
      setContributionModal(null);
    },
  });

  // ── Form close handlers ───────────────────────────────
  const handle401kFormClose = () => {
    setAdd401kOpen(false);
    setEdit401k(null);
    queryClient.invalidateQueries({ queryKey: ["retirement-plans"] });
  };

  const handleHsaFormClose = () => {
    setAddHsaOpen(false);
    setEditHsa(null);
    queryClient.invalidateQueries({ queryKey: ["retirement-plans"] });
  };

  // ── Account options ───────────────────────────────────
  const accountOptions = accounts.map((a) => ({
    label: `${a.name}${a.institution ? ` (${a.institution})` : ""}`,
    value: a.id,
  }));

  // ── Year selector ─────────────────────────────────────
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = CURRENT_YEAR - 2 + i;
    return { label: String(y), value: String(y) };
  });

  // ── Chart data ────────────────────────────────────────
  const chartData = [
    {
      name: "401k Contributed",
      value: summary.total401kContributionsCents,
      color: "#22c55e",
    },
    {
      name: "401k Remaining",
      value: Math.max(
        0,
        summary.total401kLimitCents - summary.total401kContributionsCents,
      ),
      color: "#3f3f46",
    },
    {
      name: "HSA Contributed",
      value: summary.totalHsaContributionsCents,
      color: "#3b82f6",
    },
    {
      name: "HSA Remaining",
      value: Math.max(
        0,
        summary.totalHsaLimitCents - summary.totalHsaContributionsCents,
      ),
      color: "#3f3f46",
    },
  ];

  const activePlans401k = plans401k.filter((p) => p.isActive);
  const inactivePlans401k = plans401k.filter((p) => !p.isActive);
  const activeHsa = hsaPlansList.filter((p) => p.isActive);
  const inactiveHsa = hsaPlansList.filter((p) => !p.isActive);

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Retirement</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track your 401k and HSA contributions, limits, and balances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={yearOptions}
            value={String(selectedYear)}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="w-24"
          />
          <Button variant="secondary" onClick={() => setAddHsaOpen(true)}>
            Add HSA
          </Button>
          <Button onClick={() => setAdd401kOpen(true)}>Add 401k</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="401k Contributions"
          value={formatCents(summary.total401kContributionsCents)}
          subtext={`of ${formatCents(summary.total401kLimitCents)} limit (${pct(summary.total401kContributionsCents, summary.total401kLimitCents)}%)`}
          variant="green"
          progress={pct(
            summary.total401kContributionsCents,
            summary.total401kLimitCents,
          )}
        />
        <SummaryCard
          label="HSA Contributions"
          value={formatCents(summary.totalHsaContributionsCents)}
          subtext={`of ${formatCents(summary.totalHsaLimitCents)} limit (${pct(summary.totalHsaContributionsCents, summary.totalHsaLimitCents)}%)`}
          variant="blue"
          progress={pct(
            summary.totalHsaContributionsCents,
            summary.totalHsaLimitCents,
          )}
        />
        <SummaryCard
          label="Employer Match (est.)"
          value={formatCents(summary.totalEmployerMatchCents)}
          subtext="based on current contributions"
          variant="green"
        />
        <SummaryCard
          label="Total Balance"
          value={formatCents(summary.totalBalanceCents)}
          subtext={`${formatCents(summary.totalVestedBalanceCents)} vested`}
          variant="default"
        />
      </div>

      {/* Progress Chart */}
      {(summary.total401kLimitCents > 0 || summary.totalHsaLimitCents > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Contribution Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                {/* 401k ring (outer) */}
                <Pie
                  data={[
                    {
                      name: "401k Contributed",
                      value: summary.total401kContributionsCents || 1,
                    },
                    {
                      name: "401k Remaining",
                      value: Math.max(
                        0,
                        summary.total401kLimitCents -
                          summary.total401kContributionsCents,
                      ) || 1,
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#3f3f46" />
                </Pie>
                {/* HSA ring (inner) */}
                <Pie
                  data={[
                    {
                      name: "HSA Contributed",
                      value: summary.totalHsaContributionsCents || 1,
                    },
                    {
                      name: "HSA Remaining",
                      value: Math.max(
                        0,
                        summary.totalHsaLimitCents -
                          summary.totalHsaContributionsCents,
                      ) || 1,
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  dataKey="value"
                  nameKey="name"
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#3f3f46" />
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
      )}

      {/* 401k Plans Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">401k Plans</h2>
          <Button size="sm" onClick={() => setAdd401kOpen(true)}>
            Add Plan
          </Button>
        </div>

        {plans401k.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-zinc-400">
              No 401k plans for {selectedYear}. Add one to start tracking.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activePlans401k.map((plan) => (
              <RetirementPlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => setEdit401k(plan)}
                onDelete={() =>
                  setConfirmDelete({
                    type: "401k",
                    id: plan.id,
                    name: plan.name,
                  })
                }
                onAddContribution={() =>
                  setContributionModal({
                    type: "401k",
                    id: plan.id,
                    name: plan.name,
                  })
                }
              />
            ))}
            {inactivePlans401k.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Inactive
                </p>
                {inactivePlans401k.map((plan) => (
                  <RetirementPlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => setEdit401k(plan)}
                    onDelete={() =>
                      setConfirmDelete({
                        type: "401k",
                        id: plan.id,
                        name: plan.name,
                      })
                    }
                    onAddContribution={() =>
                      setContributionModal({
                        type: "401k",
                        id: plan.id,
                        name: plan.name,
                      })
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* HSA Plans Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">HSA Plans</h2>
          <Button size="sm" onClick={() => setAddHsaOpen(true)}>
            Add Plan
          </Button>
        </div>

        {hsaPlansList.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-zinc-400">
              No HSA plans for {selectedYear}. Add one to start tracking.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeHsa.map((plan) => (
              <HsaPlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => setEditHsa(plan)}
                onDelete={() =>
                  setConfirmDelete({
                    type: "hsa",
                    id: plan.id,
                    name: plan.name,
                  })
                }
                onAddContribution={() =>
                  setContributionModal({
                    type: "hsa",
                    id: plan.id,
                    name: plan.name,
                  })
                }
              />
            ))}
            {inactiveHsa.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Inactive
                </p>
                {inactiveHsa.map((plan) => (
                  <HsaPlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => setEditHsa(plan)}
                    onDelete={() =>
                      setConfirmDelete({
                        type: "hsa",
                        id: plan.id,
                        name: plan.name,
                      })
                    }
                    onAddContribution={() =>
                      setContributionModal({
                        type: "hsa",
                        id: plan.id,
                        name: plan.name,
                      })
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Modals ───────────────────────────────────────── */}

      <RetirementPlanForm
        open={add401kOpen || !!edit401k}
        onClose={handle401kFormClose}
        plan={edit401k ?? undefined}
        accounts={accountOptions}
        currentYear={selectedYear}
      />

      <HsaPlanForm
        open={addHsaOpen || !!editHsa}
        onClose={handleHsaFormClose}
        plan={editHsa ?? undefined}
        accounts={accountOptions}
        currentYear={selectedYear}
      />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDeleteDialog
          name={confirmDelete.name}
          type={confirmDelete.type}
          onConfirm={() => {
            if (confirmDelete.type === "401k") {
              delete401kMutation.mutate(confirmDelete.id);
            } else {
              deleteHsaMutation.mutate(confirmDelete.id);
            }
          }}
          onCancel={() => setConfirmDelete(null)}
          isPending={
            delete401kMutation.isPending || deleteHsaMutation.isPending
          }
        />
      )}

      {/* Add Contribution Modal */}
      {contributionModal && (
        <AddContributionModal
          planName={contributionModal.name}
          onSubmit={(amountCents) => {
            if (contributionModal.type === "401k") {
              addContribMutation.mutate({
                id: contributionModal.id,
                amountCents,
              });
            } else {
              addHsaContribMutation.mutate({
                id: contributionModal.id,
                amountCents,
              });
            }
          }}
          onCancel={() => setContributionModal(null)}
          isPending={
            addContribMutation.isPending || addHsaContribMutation.isPending
          }
        />
      )}
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────

function SummaryCard({
  label,
  value,
  subtext,
  variant = "default",
  progress,
}: {
  label: string;
  value: string;
  subtext?: string;
  variant?: "green" | "blue" | "default";
  progress?: number;
}) {
  const valueColor =
    variant === "green"
      ? "text-green-400"
      : variant === "blue"
        ? "text-blue-400"
        : "text-zinc-100";

  const barColor =
    variant === "green" ? "bg-green-500" : "bg-blue-500";

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
      {progress != null && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
          <div
            className={cn("h-1.5 rounded-full transition-all", barColor)}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </Card>
  );
}

// ─── 401k Plan Card ─────────────────────────────────────

function RetirementPlanCard({
  plan,
  onEdit,
  onDelete,
  onAddContribution,
}: {
  plan: RetirementPlanRow;
  onEdit: () => void;
  onDelete: () => void;
  onAddContribution: () => void;
}) {
  const progress = pct(plan.ytdContributionsCents, plan.annualLimitCents);
  const remaining = estimateRemainingPaychecks(
    plan.ytdContributionsCents,
    plan.annualLimitCents,
    plan.perPaycheckAmountCents,
  );

  const progressBarColor =
    progress >= 100
      ? "bg-green-500"
      : progress >= 80
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <Card className={cn("p-4", !plan.isActive && "opacity-60")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-100 truncate">
              {plan.name}
            </span>
            <Badge variant="success">401k</Badge>
            {!plan.isActive && <Badge variant="warning">Inactive</Badge>}
          </div>

          {plan.accountName && (
            <p className="mt-0.5 text-sm text-zinc-400">
              {plan.accountName}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                {formatCents(plan.ytdContributionsCents)} of{" "}
                {formatCents(plan.annualLimitCents)}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-zinc-800">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  progressBarColor,
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Details row */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            {plan.perPaycheckAmountCents && (
              <span>
                {formatCents(plan.perPaycheckAmountCents)}/paycheck
              </span>
            )}
            {plan.employerMatchPct != null && (
              <span>
                {plan.employerMatchPct}% match
                {plan.employerMatchCap != null &&
                  ` (cap ${formatCents(plan.employerMatchCap)})`}
              </span>
            )}
            {remaining != null && (
              <span>
                {remaining === 0
                  ? "Maxed out!"
                  : `~${remaining} paychecks to max`}
              </span>
            )}
          </div>

          {/* Balances */}
          {(plan.vestedBalanceCents || plan.totalBalanceCents) && (
            <div className="mt-2 flex gap-4 text-xs">
              {plan.totalBalanceCents != null && (
                <span className="text-zinc-400">
                  Total:{" "}
                  <span className="font-medium text-zinc-200">
                    {formatCents(plan.totalBalanceCents)}
                  </span>
                </span>
              )}
              {plan.vestedBalanceCents != null && (
                <span className="text-zinc-400">
                  Vested:{" "}
                  <span className="font-medium text-green-400">
                    {formatCents(plan.vestedBalanceCents)}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddContribution}
            className="px-2 text-xs text-green-400/70 hover:text-green-400"
          >
            + Contrib
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="px-2 text-xs text-red-400/70 hover:text-red-400"
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── HSA Plan Card ──────────────────────────────────────

function HsaPlanCard({
  plan,
  onEdit,
  onDelete,
  onAddContribution,
}: {
  plan: HsaPlanRow;
  onEdit: () => void;
  onDelete: () => void;
  onAddContribution: () => void;
}) {
  const progress = pct(plan.ytdContributionsCents, plan.annualLimitCents);
  const cashCents = plan.cashBalanceCents ?? 0;
  const investCents = plan.investmentBalanceCents ?? 0;
  const totalHsaBalance = cashCents + investCents;

  const progressBarColor =
    progress >= 100
      ? "bg-blue-500"
      : progress >= 80
        ? "bg-yellow-500"
        : "bg-blue-500";

  return (
    <Card className={cn("p-4", !plan.isActive && "opacity-60")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-100 truncate">
              {plan.name}
            </span>
            <Badge variant="info">HSA</Badge>
            {!plan.isActive && <Badge variant="warning">Inactive</Badge>}
          </div>

          {plan.accountName && (
            <p className="mt-0.5 text-sm text-zinc-400">
              {plan.accountName}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                {formatCents(plan.ytdContributionsCents)} of{" "}
                {formatCents(plan.annualLimitCents)}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-zinc-800">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  progressBarColor,
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Details row */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            {plan.perPaycheckAmountCents && (
              <span>
                {formatCents(plan.perPaycheckAmountCents)}/paycheck
              </span>
            )}
          </div>

          {/* Balance split */}
          {totalHsaBalance > 0 && (
            <div className="mt-2 flex gap-4 text-xs">
              <span className="text-zinc-400">
                Cash:{" "}
                <span className="font-medium text-zinc-200">
                  {formatCents(cashCents)}
                </span>
              </span>
              <span className="text-zinc-400">
                Invested:{" "}
                <span className="font-medium text-blue-400">
                  {formatCents(investCents)}
                </span>
              </span>
              <span className="text-zinc-400">
                Total:{" "}
                <span className="font-medium text-zinc-100">
                  {formatCents(totalHsaBalance)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddContribution}
            className="px-2 text-xs text-blue-400/70 hover:text-blue-400"
          >
            + Contrib
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="px-2 text-xs text-red-400/70 hover:text-red-400"
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Confirm Delete Dialog ──────────────────────────────

function ConfirmDeleteDialog({
  name,
  type,
  onConfirm,
  onCancel,
  isPending,
}: {
  name: string;
  type: "401k" | "hsa";
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const typeLabel = type === "401k" ? "401k plan" : "HSA plan";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirm delete"
        className="relative z-10 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-zinc-100">
          Delete {typeLabel}
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Are you sure you want to delete <strong>{name}</strong>? This action
          cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={isPending}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Contribution Modal ─────────────────────────────

function AddContributionModal({
  planName,
  onSubmit,
  onCancel,
  isPending,
}: {
  planName: string;
  onSubmit: (amountCents: number) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseCents(amount);
    if (cents > 0) {
      onSubmit(cents);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add contribution"
        className="relative z-10 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-zinc-100">
          Add Contribution
        </h3>
        <p className="mt-1 text-sm text-zinc-400">{planName}</p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Input
            label="Amount ($)"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              Add
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useTransition } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Card, Button, Badge } from "@/components/ui";
import { GoalForm } from "@/components/features/goal-form";
import {
  fetchGoals,
  fetchGoalsSummary,
  deleteGoal,
  updateGoalProgress,
  markGoalCompleted,
  markGoalAbandoned,
  reactivateGoal,
} from "@/actions/goals";
import { formatCents, formatDate, cn, parseCents } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────

interface GoalRow {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string | null;
  type: string;
  status: string;
  accountId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  accountName: string | null;
}

interface GoalsSummary {
  totalTargetCents: number;
  totalCurrentCents: number;
  countByStatus: { active: number; completed: number; abandoned: number };
  countByType: Record<string, number>;
}

interface AccountOption {
  label: string;
  value: string;
}

interface GoalsClientProps {
  initialGoals: GoalRow[];
  initialSummary: GoalsSummary;
  accountOptions: AccountOption[];
}

// ─── Constants ─────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  savings: "Savings",
  checking_target: "Checking Target",
  debt_payoff: "Debt Payoff",
  investment: "Investment",
};

const TYPE_BADGE_VARIANT: Record<string, "default" | "success" | "info" | "warning"> = {
  savings: "success",
  checking_target: "info",
  debt_payoff: "warning",
  investment: "default",
};

// ─── Helpers ───────────────────────────────────────────

function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

function daysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function progressBarColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 75) return "bg-green-600";
  if (pct >= 50) return "bg-yellow-500";
  if (pct >= 25) return "bg-orange-500";
  return "bg-red-500";
}

// ─── Component ─────────────────────────────────────────

export function GoalsClient({
  initialGoals,
  initialSummary,
  accountOptions,
}: GoalsClientProps) {
  const queryClient = useQueryClient();

  // ── Data queries ──────────────────────────────────────
  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: () => fetchGoals(),
    initialData: initialGoals,
  });

  const { data: summary } = useQuery({
    queryKey: ["goals", "summary"],
    queryFn: () => fetchGoalsSummary(),
    initialData: initialSummary,
  });

  // ── Filters ───────────────────────────────────────────
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // ── Modal state ───────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalRow | null>(null);
  const [progressGoal, setProgressGoal] = useState<GoalRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ── Collapsible sections ──────────────────────────────
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [abandonedExpanded, setAbandonedExpanded] = useState(false);

  // ── Invalidation helper ───────────────────────────────
  const invalidateGoals = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
  };

  // ── Mutations ─────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      invalidateGoals();
      setConfirmDeleteId(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: markGoalCompleted,
    onSuccess: invalidateGoals,
  });

  const abandonMutation = useMutation({
    mutationFn: markGoalAbandoned,
    onSuccess: invalidateGoals,
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateGoal,
    onSuccess: invalidateGoals,
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, cents }: { id: string; cents: number }) =>
      updateGoalProgress(id, cents),
    onSuccess: () => {
      invalidateGoals();
      setProgressGoal(null);
    },
  });

  // ── Form close handler ────────────────────────────────
  const handleFormClose = () => {
    setAddOpen(false);
    setEditGoal(null);
    invalidateGoals();
  };

  // ── Filtered goals ────────────────────────────────────
  const filteredGoals = goals.filter((g) => {
    if (filterType !== "all" && g.type !== filterType) return false;
    if (filterStatus !== "all" && g.status !== filterStatus) return false;
    return true;
  });

  const activeGoals = filteredGoals.filter((g) => g.status === "active");
  const completedGoals = filteredGoals.filter((g) => g.status === "completed");
  const abandonedGoals = filteredGoals.filter((g) => g.status === "abandoned");

  // ── Summary derived values ────────────────────────────
  const avgProgress =
    summary.countByStatus.active > 0
      ? Math.round(
          (goals
            .filter((g) => g.status === "active")
            .reduce(
              (sum, g) => sum + progressPercent(g.currentAmountCents, g.targetAmountCents),
              0,
            ) /
            summary.countByStatus.active),
        )
      : 0;

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Goals</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track your financial goals and progress.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Goal</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Saved"
          value={formatCents(summary.totalCurrentCents)}
          subtext={`of ${formatCents(summary.totalTargetCents)} target`}
          variant="green"
        />
        <SummaryCard
          label="Active Goals"
          value={String(summary.countByStatus.active)}
          variant="default"
        />
        <SummaryCard
          label="Completed"
          value={String(summary.countByStatus.completed)}
          variant="blue"
        />
        <SummaryCard
          label="Avg Progress"
          value={`${avgProgress}%`}
          subtext="across active goals"
          variant="green"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Type
          </span>
          <div className="flex gap-1">
            {["all", "savings", "checking_target", "debt_payoff", "investment"].map(
              (t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filterType === t
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
                  )}
                >
                  {t === "all" ? "All" : TYPE_LABELS[t] ?? t}
                </button>
              ),
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Status
          </span>
          <div className="flex gap-1">
            {["all", "active", "completed", "abandoned"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  filterStatus === s
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Goals */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Active Goals
        </h2>
        {activeGoals.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-zinc-400">
              {goals.length === 0
                ? "No goals yet. Add your first one to start tracking."
                : "No active goals match your filters."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => setEditGoal(goal)}
                onUpdateProgress={() => setProgressGoal(goal)}
                onComplete={() => completeMutation.mutate(goal.id)}
                onAbandon={() => abandonMutation.mutate(goal.id)}
                onDelete={() =>
                  setConfirmDeleteId({ id: goal.id, name: goal.name })
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <section>
          <button
            onClick={() => setCompletedExpanded(!completedExpanded)}
            className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-100 hover:text-zinc-300 transition-colors"
          >
            <svg
              className={cn(
                "h-4 w-4 transition-transform",
                completedExpanded && "rotate-90",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Completed ({completedGoals.length})
          </button>
          {completedExpanded && (
            <div className="space-y-3 opacity-70">
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => setEditGoal(goal)}
                  onReactivate={() => reactivateMutation.mutate(goal.id)}
                  onDelete={() =>
                    setConfirmDeleteId({ id: goal.id, name: goal.name })
                  }
                  muted
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Abandoned Goals */}
      {abandonedGoals.length > 0 && (
        <section>
          <button
            onClick={() => setAbandonedExpanded(!abandonedExpanded)}
            className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-100 hover:text-zinc-300 transition-colors"
          >
            <svg
              className={cn(
                "h-4 w-4 transition-transform",
                abandonedExpanded && "rotate-90",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Abandoned ({abandonedGoals.length})
          </button>
          {abandonedExpanded && (
            <div className="space-y-3 opacity-50">
              {abandonedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => setEditGoal(goal)}
                  onReactivate={() => reactivateMutation.mutate(goal.id)}
                  onDelete={() =>
                    setConfirmDeleteId({ id: goal.id, name: goal.name })
                  }
                  muted
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      <GoalForm
        open={addOpen || !!editGoal}
        onClose={handleFormClose}
        goal={
          editGoal
            ? {
                id: editGoal.id,
                name: editGoal.name,
                targetAmountCents: editGoal.targetAmountCents,
                currentAmountCents: editGoal.currentAmountCents,
                targetDate: editGoal.targetDate,
                type: editGoal.type,
                accountId: editGoal.accountId,
                notes: editGoal.notes,
              }
            : undefined
        }
        accounts={accountOptions}
      />

      {/* Progress Update Modal */}
      {progressGoal && (
        <ProgressUpdateModal
          goal={progressGoal}
          onClose={() => setProgressGoal(null)}
          onSubmit={(cents) =>
            progressMutation.mutate({ id: progressGoal.id, cents })
          }
          isPending={progressMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <ConfirmDeleteDialog
          name={confirmDeleteId.name}
          onConfirm={() => deleteMutation.mutate(confirmDeleteId.id)}
          onCancel={() => setConfirmDeleteId(null)}
          isPending={deleteMutation.isPending}
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
  variant?: "green" | "blue" | "default";
}) {
  const valueColor =
    variant === "green"
      ? "text-green-400"
      : variant === "blue"
        ? "text-blue-400"
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

// ─── Goal Card ─────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onUpdateProgress,
  onComplete,
  onAbandon,
  onReactivate,
  onDelete,
  muted = false,
}: {
  goal: GoalRow;
  onEdit?: () => void;
  onUpdateProgress?: () => void;
  onComplete?: () => void;
  onAbandon?: () => void;
  onReactivate?: () => void;
  onDelete?: () => void;
  muted?: boolean;
}) {
  const pct = progressPercent(goal.currentAmountCents, goal.targetAmountCents);
  const days = daysRemaining(goal.targetDate);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-100 truncate">
              {goal.name}
            </span>
            <Badge
              variant={TYPE_BADGE_VARIANT[goal.type] ?? "default"}
            >
              {TYPE_LABELS[goal.type] ?? goal.type}
            </Badge>
            {goal.status === "completed" && (
              <Badge variant="success">Completed</Badge>
            )}
            {goal.status === "abandoned" && (
              <Badge variant="danger">Abandoned</Badge>
            )}
          </div>

          {goal.accountName && (
            <p className="mt-0.5 text-sm text-zinc-400">
              {goal.accountName}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-400">
                {formatCents(goal.currentAmountCents)}{" "}
                <span className="text-zinc-500">
                  / {formatCents(goal.targetAmountCents)}
                </span>
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  pct >= 100 ? "text-green-400" : "text-zinc-300",
                )}
              >
                {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progressBarColor(pct),
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Target date */}
          <div className="mt-2 text-xs text-zinc-500">
            {goal.targetDate ? (
              <span>
                Target: {formatDate(goal.targetDate)}
                {days !== null && (
                  <span
                    className={cn(
                      "ml-2",
                      days < 0
                        ? "text-red-400"
                        : days <= 30
                          ? "text-yellow-400"
                          : "text-zinc-400",
                    )}
                  >
                    {days < 0
                      ? `${Math.abs(days)} days overdue`
                      : days === 0
                        ? "Due today"
                        : `${days} days remaining`}
                  </span>
                )}
              </span>
            ) : (
              <span>No deadline</span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {onUpdateProgress && goal.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUpdateProgress}
              className="px-2 text-xs text-green-400/70 hover:text-green-400"
            >
              Update Progress
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
            >
              Edit
            </Button>
          )}
          {onComplete && goal.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onComplete}
              className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
            >
              Complete
            </Button>
          )}
          {onAbandon && goal.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAbandon}
              className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
            >
              Abandon
            </Button>
          )}
          {onReactivate && goal.status !== "active" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReactivate}
              className="px-2 text-xs text-blue-400/70 hover:text-blue-400"
            >
              Reactivate
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="px-2 text-xs text-red-400/70 hover:text-red-400"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Progress Update Modal ─────────────────────────────

function ProgressUpdateModal({
  goal,
  onClose,
  onSubmit,
  isPending,
}: {
  goal: GoalRow;
  onClose: () => void;
  onSubmit: (cents: number) => void;
  isPending: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentDollars = (goal.currentAmountCents / 100).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value;
    if (!val) return;
    const cents = parseCents(val);
    onSubmit(cents);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Update progress"
        className="relative z-10 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-zinc-100">
          Update Progress
        </h3>
        <p className="mt-1 text-sm text-zinc-400">{goal.name}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Target: {formatCents(goal.targetAmountCents)}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="progress-amount"
              className="text-sm font-medium text-zinc-300"
            >
              Current Amount
            </label>
            <input
              ref={inputRef}
              id="progress-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={currentDollars}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              Update
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Delete Dialog ─────────────────────────────

function ConfirmDeleteDialog({
  name,
  onConfirm,
  onCancel,
  isPending,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
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
        <h3 className="text-lg font-semibold text-zinc-100">Delete Goal</h3>
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

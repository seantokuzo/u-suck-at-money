"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Card, Button, Badge, Select } from "@/components/ui";
import { RecurringExpenseForm } from "@/components/features/recurring-expense-form";
import {
  fetchRecurringExpenses,
  deleteRecurringExpense,
  toggleRecurringExpenseActive,
  toggleRecurringExpenseAutoPay,
} from "@/actions/recurring-expenses";
import { formatCents, cn } from "@/lib/utils";
import {
  toMonthlyCents,
  frequencyLabel,
  dueDateDescription,
  getNextDueDate,
  formatDueDate,
  daysUntil,
} from "@/lib/recurring-utils";

// ─── Types ──────────────────────────────────────────────

type Frequency =
  | "weekly"
  | "biweekly"
  | "semi_monthly"
  | "monthly"
  | "quarterly"
  | "annual";

interface RecurringExpenseRow {
  id: string;
  name: string;
  amountCents: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  frequency: string;
  dueDay: number | null;
  dueMonth: number | null;
  isAutoPay: boolean;
  isActive: boolean;
  accountId: string | null;
  accountName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryOption {
  label: string;
  value: string;
}

interface AccountOption {
  label: string;
  value: string;
}

interface ExpensesClientProps {
  initialExpenses: RecurringExpenseRow[];
  initialTotalMonthlyCents: number;
  categories: CategoryOption[];
  accounts: AccountOption[];
}

// ─── Filter Options ─────────────────────────────────────

const FREQUENCY_FILTER_OPTIONS = [
  { label: "All Frequencies", value: "" },
  { label: "Weekly", value: "weekly" },
  { label: "Every 2 Weeks", value: "biweekly" },
  { label: "Twice Monthly", value: "semi_monthly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annual", value: "annual" },
];

const ACTIVE_FILTER_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

const AUTOPAY_FILTER_OPTIONS = [
  { label: "All", value: "" },
  { label: "Auto-Pay", value: "true" },
  { label: "Manual", value: "false" },
];

// ─── Component ──────────────────────────────────────────

export function ExpensesClient({
  initialExpenses,
  initialTotalMonthlyCents,
  categories,
  accounts,
}: ExpensesClientProps) {
  const queryClient = useQueryClient();

  // ── Filter state ──────────────────────────────────────
  const [frequencyFilter, setFrequencyFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [autoPayFilter, setAutoPayFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // ── Modal state ───────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<RecurringExpenseRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Build query options ───────────────────────────────
  const queryOptions = useMemo(
    () => ({
      frequency: (frequencyFilter || undefined) as Frequency | undefined,
      isActive:
        activeFilter === "true"
          ? true
          : activeFilter === "false"
            ? false
            : undefined,
      categoryId: categoryFilter || undefined,
    }),
    [frequencyFilter, activeFilter, categoryFilter],
  );

  const isInitialState =
    !frequencyFilter && !activeFilter && !autoPayFilter && !categoryFilter;

  // ── Data query ────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["recurring-expenses", queryOptions],
    queryFn: () => fetchRecurringExpenses(queryOptions),
    initialData: isInitialState
      ? { expenses: initialExpenses, totalMonthlyCents: initialTotalMonthlyCents }
      : undefined,
  });

  const expenses = data?.expenses ?? [];
  const totalMonthlyCents = data?.totalMonthlyCents ?? 0;

  // ── Client-side auto-pay filter (not in server query) ─
  const filteredExpenses = useMemo(() => {
    if (!autoPayFilter) return expenses;
    const wantAutoPay = autoPayFilter === "true";
    return expenses.filter((e) => e.isAutoPay === wantAutoPay);
  }, [expenses, autoPayFilter]);

  // ── Computed summary stats ────────────────────────────
  const summaryStats = useMemo(() => {
    const activeExpenses = initialExpenses.filter((e) => e.isActive);
    const activeCount = activeExpenses.length;
    const autoPayCount = activeExpenses.filter((e) => e.isAutoPay).length;
    const totalAnnualCents = totalMonthlyCents * 12;

    return { activeCount, autoPayCount, totalMonthlyCents, totalAnnualCents };
  }, [initialExpenses, totalMonthlyCents]);

  // ── Category breakdown ────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const activeExpenses = initialExpenses.filter((e) => e.isActive);
    const map = new Map<
      string,
      { name: string; color: string | null; monthlyCents: number }
    >();

    for (const e of activeExpenses) {
      const key = e.categoryId ?? "__uncategorized";
      const existing = map.get(key) ?? {
        name: e.categoryName ?? "Uncategorized",
        color: e.categoryColor,
        monthlyCents: 0,
      };
      existing.monthlyCents += toMonthlyCents(
        e.amountCents,
        e.frequency as Frequency,
      );
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.monthlyCents - a.monthlyCents);
  }, [initialExpenses]);

  // ── Mutations ─────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteRecurringExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
      setConfirmDeleteId(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: toggleRecurringExpenseActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
    },
  });

  const toggleAutoPayMutation = useMutation({
    mutationFn: toggleRecurringExpenseAutoPay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
    },
  });

  // ── Handlers ──────────────────────────────────────────
  const handleEdit = useCallback((expense: RecurringExpenseRow) => {
    setEditExpense(expense);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditExpense(null);
    queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
  }, [queryClient]);

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Recurring Expenses
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track your bills, subscriptions, and recurring costs.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Add Expense</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Monthly Cost"
          value={formatCents(summaryStats.totalMonthlyCents)}
          valueClass="text-red-400"
        />
        <SummaryCard
          label="Annual Cost"
          value={formatCents(summaryStats.totalAnnualCents)}
          valueClass="text-red-400"
        />
        <SummaryCard
          label="Active Expenses"
          value={String(summaryStats.activeCount)}
          valueClass="text-zinc-100"
        />
        <SummaryCard
          label="Auto-Pay"
          value={String(summaryStats.autoPayCount)}
          valueClass="text-green-400"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select
            options={FREQUENCY_FILTER_OPTIONS}
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            placeholder="All Frequencies"
          />
          <Select
            options={[
              { label: "All Categories", value: "" },
              ...categories,
            ]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="All Categories"
          />
          <Select
            options={ACTIVE_FILTER_OPTIONS}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            placeholder="All Statuses"
          />
          <Select
            options={AUTOPAY_FILTER_OPTIONS}
            value={autoPayFilter}
            onChange={(e) => setAutoPayFilter(e.target.value)}
            placeholder="All"
          />
        </div>
      </Card>

      {/* Expense List */}
      <Card className="overflow-hidden p-0">
        {isLoading && filteredExpenses.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-zinc-400">Loading expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-zinc-400">
              No recurring expenses found. Add your first one to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Monthly
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Next Due
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onEdit={handleEdit}
                    onDelete={setConfirmDeleteId}
                    onToggleActive={toggleActiveMutation.mutate}
                    onToggleAutoPay={toggleAutoPayMutation.mutate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">
            Monthly Breakdown by Category
          </h3>
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => {
              const pct =
                summaryStats.totalMonthlyCents > 0
                  ? (cat.monthlyCents / summaryStats.totalMonthlyCents) * 100
                  : 0;

              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: cat.color ?? "#71717a",
                    }}
                  />
                  <span className="w-36 truncate text-sm text-zinc-300">
                    {cat.name}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-zinc-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-20 text-right text-sm font-medium tabular-nums text-zinc-300">
                    {formatCents(cat.monthlyCents)}
                  </span>
                  <span className="w-12 text-right text-xs tabular-nums text-zinc-500">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
            <div className="flex items-center gap-3 border-t border-zinc-800 pt-3">
              <div className="h-3 w-3 shrink-0" />
              <span className="w-36 text-sm font-semibold text-zinc-100">
                Total
              </span>
              <div className="flex-1" />
              <span className="w-20 text-right text-sm font-bold tabular-nums text-zinc-100">
                {formatCents(summaryStats.totalMonthlyCents)}
              </span>
              <span className="w-12 text-right text-xs tabular-nums text-zinc-500">
                /mo
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <RecurringExpenseForm
        open={formOpen}
        onClose={handleFormClose}
        expense={editExpense ?? undefined}
        categories={categories}
        accounts={accounts}
      />

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <ConfirmDeleteDialog
          onConfirm={() => deleteMutation.mutate(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums",
          valueClass ?? "text-zinc-100",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

// ─── Expense Row ────────────────────────────────────────

function ExpenseRow({
  expense,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleAutoPay,
}: {
  expense: RecurringExpenseRow;
  onEdit: (e: RecurringExpenseRow) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onToggleAutoPay: (id: string) => void;
}) {
  const monthlyCents = toMonthlyCents(
    expense.amountCents,
    expense.frequency as Frequency,
  );

  const nextDue = getNextDueDate(
    {
      frequency: expense.frequency as Frequency,
      dueDay: expense.dueDay,
      dueMonth: expense.dueMonth,
    },
  );

  const daysLeft = nextDue ? daysUntil(nextDue) : null;

  return (
    <tr
      className={cn(
        "border-b border-zinc-800 transition-colors hover:bg-zinc-800/50",
        !expense.isActive && "opacity-50",
      )}
    >
      {/* Name + Account */}
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-zinc-100">{expense.name}</p>
          {expense.accountName && (
            <p className="text-xs text-zinc-500">{expense.accountName}</p>
          )}
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {expense.categoryColor && (
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: expense.categoryColor }}
            />
          )}
          <span className="text-zinc-300">
            {expense.categoryName ?? (
              <span className="text-zinc-500">None</span>
            )}
          </span>
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-3 text-right">
        <span className="font-medium tabular-nums text-red-400">
          {formatCents(expense.amountCents)}
        </span>
      </td>

      {/* Frequency */}
      <td className="px-4 py-3">
        <Badge variant="info">
          {frequencyLabel(expense.frequency as Frequency)}
        </Badge>
      </td>

      {/* Monthly Equivalent */}
      <td className="px-4 py-3 text-right">
        <span className="tabular-nums text-zinc-300">
          {formatCents(monthlyCents)}
        </span>
        <span className="text-xs text-zinc-500">/mo</span>
      </td>

      {/* Next Due */}
      <td className="px-4 py-3">
        {nextDue ? (
          <div>
            <p className="text-zinc-300">{formatDueDate(nextDue)}</p>
            <p
              className={cn(
                "text-xs",
                daysLeft !== null && daysLeft <= 7
                  ? "text-yellow-400"
                  : "text-zinc-500",
              )}
            >
              {daysLeft === 0
                ? "Due today"
                : daysLeft === 1
                  ? "Due tomorrow"
                  : `${daysLeft} days`}
            </p>
          </div>
        ) : (
          <span className="text-zinc-500">--</span>
        )}
      </td>

      {/* Status badges */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleActive(expense.id)}
            title={expense.isActive ? "Click to deactivate" : "Click to activate"}
          >
            <Badge variant={expense.isActive ? "success" : "default"}>
              {expense.isActive ? "Active" : "Inactive"}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => onToggleAutoPay(expense.id)}
            title={
              expense.isAutoPay
                ? "Click to mark as manual pay"
                : "Click to mark as auto-pay"
            }
          >
            <Badge variant={expense.isAutoPay ? "info" : "default"}>
              {expense.isAutoPay ? "Auto" : "Manual"}
            </Badge>
          </button>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(expense)}
            className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(expense.id)}
            className="px-2 text-xs text-red-400/70 hover:text-red-400"
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Confirm Delete Dialog ──────────────────────────────

function ConfirmDeleteDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
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
        <h3 className="text-lg font-semibold text-zinc-100">
          Delete Recurring Expense
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Are you sure you want to delete this recurring expense? This action
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

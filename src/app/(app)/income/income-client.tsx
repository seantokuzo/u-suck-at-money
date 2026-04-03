"use client";

import { useState, useTransition } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Card, Button, Badge } from "@/components/ui";
import { IncomeSourceForm } from "@/components/features/income-source-form";
import { BonusForm } from "@/components/features/bonus-form";
import {
  fetchIncomePageData,
  toggleIncomeSourceActive,
  deleteIncomeSource,
  deleteBonus,
} from "@/actions/income";
import { CashflowProjection } from "@/components/features/cashflow-projection";
import { formatCents, formatDate, cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────

interface IncomeSource {
  id: string;
  name: string;
  type: string;
  paySchedule: string | null;
  netPerPaycheckCents: number | null;
  grossPerPaycheckCents: number | null;
  employerName: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BonusRow {
  id: string;
  incomeSourceId: string;
  name: string;
  expectedDate: string | null;
  expectedAmountCents: number | null;
  actualDate: string | null;
  actualAmountCents: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  sourceName: string;
}

interface IncomePageData {
  sources: IncomeSource[];
  activeSources: IncomeSource[];
  allBonuses: BonusRow[];
  upcomingBonuses: BonusRow[];
  totalMonthlyIncomeCents: number;
}

interface CashflowProjectionData {
  month: string;
  projectedIncomeCents: number;
  projectedExpensesCents: number;
  projectedNetCents: number;
}

interface IncomeClientProps {
  initialData: IncomePageData;
  projections: CashflowProjectionData[];
}

// ─── Constants ─────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  salary: "Salary",
  bonus: "Bonus",
  side_income: "Side Income",
};

const TYPE_BADGE_VARIANT: Record<string, "default" | "success" | "info"> = {
  salary: "success",
  bonus: "info",
  side_income: "default",
};

const SCHEDULE_LABELS: Record<string, string> = {
  biweekly: "Biweekly",
  semi_monthly: "Semi-Monthly",
  monthly: "Monthly",
};

// ─── Helpers ───────────────────────────────────────────

function calcMonthlyFromSource(source: IncomeSource): number {
  const net = source.netPerPaycheckCents ?? 0;
  switch (source.paySchedule) {
    case "biweekly":
      return Math.round((net * 26) / 12);
    case "semi_monthly":
      return net * 2;
    case "monthly":
      return net;
    default:
      return net;
  }
}

function calcAnnualFromSource(source: IncomeSource): number {
  const net = source.netPerPaycheckCents ?? 0;
  switch (source.paySchedule) {
    case "biweekly":
      return net * 26;
    case "semi_monthly":
      return net * 24;
    case "monthly":
      return net * 12;
    default:
      return net * 12;
  }
}

// ─── Component ─────────────────────────────────────────

export function IncomeClient({ initialData, projections }: IncomeClientProps) {
  const queryClient = useQueryClient();

  // ── Data query ────────────────────────────────────────
  const { data } = useQuery({
    queryKey: ["income-sources"],
    queryFn: () => fetchIncomePageData(),
    initialData,
  });

  const {
    sources,
    activeSources,
    allBonuses,
    upcomingBonuses,
    totalMonthlyIncomeCents,
  } = data;

  // ── Modal state ───────────────────────────────────────
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [editSource, setEditSource] = useState<IncomeSource | null>(null);
  const [addBonusOpen, setAddBonusOpen] = useState(false);
  const [editBonus, setEditBonus] = useState<BonusRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{
    type: "source" | "bonus";
    id: string;
    name: string;
  } | null>(null);

  // ── Mutations ─────────────────────────────────────────
  const toggleActiveMutation = useMutation({
    mutationFn: toggleIncomeSourceActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income-sources"] });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: deleteIncomeSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income-sources"] });
      setConfirmDeleteId(null);
    },
  });

  const deleteBonusMutation = useMutation({
    mutationFn: deleteBonus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income-sources"] });
      setConfirmDeleteId(null);
    },
  });

  // ── Derived values ────────────────────────────────────
  const totalAnnualIncomeCents =
    totalMonthlyIncomeCents * 12 +
    upcomingBonuses.reduce(
      (sum, b) => sum + (b.expectedAmountCents ?? 0),
      0,
    );

  const nextBonus =
    upcomingBonuses.length > 0 ? upcomingBonuses[0] : null;

  const incomeSourceOptions = activeSources.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const receivedBonuses = allBonuses.filter((b) => b.actualDate);
  const pendingBonuses = allBonuses.filter((b) => !b.actualDate);

  // ── Form close handlers (invalidate on close to pick up mutations) ──
  const handleSourceFormClose = () => {
    setAddSourceOpen(false);
    setEditSource(null);
    queryClient.invalidateQueries({ queryKey: ["income-sources"] });
  };

  const handleBonusFormClose = () => {
    setAddBonusOpen(false);
    setEditBonus(null);
    queryClient.invalidateQueries({ queryKey: ["income-sources"] });
  };

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Income</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track your income sources, pay schedules, and bonuses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setAddBonusOpen(true)}>
            Add Bonus
          </Button>
          <Button onClick={() => setAddSourceOpen(true)}>
            Add Income Source
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Monthly Income"
          value={formatCents(totalMonthlyIncomeCents)}
          variant="green"
        />
        <SummaryCard
          label="Annual Income"
          value={formatCents(totalAnnualIncomeCents)}
          subtext="incl. expected bonuses"
          variant="green"
        />
        <SummaryCard
          label="Active Sources"
          value={String(activeSources.length)}
          subtext={`of ${sources.length} total`}
          variant="default"
        />
        <SummaryCard
          label="Next Bonus"
          value={
            nextBonus
              ? formatCents(nextBonus.expectedAmountCents ?? 0)
              : "--"
          }
          subtext={
            nextBonus?.expectedDate
              ? formatDate(nextBonus.expectedDate)
              : "None scheduled"
          }
          variant="blue"
        />
      </div>

      {/* Income Sources */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Income Sources
        </h2>
        {sources.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-zinc-400">
              No income sources yet. Add your first one to get started.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <IncomeSourceCard
                key={source.id}
                source={source}
                bonuses={allBonuses.filter(
                  (b) => b.incomeSourceId === source.id,
                )}
                onEdit={() => setEditSource(source)}
                onToggleActive={() =>
                  toggleActiveMutation.mutate(source.id)
                }
                onDelete={() =>
                  setConfirmDeleteId({
                    type: "source",
                    id: source.id,
                    name: source.name,
                  })
                }
                isToggling={toggleActiveMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* Bonuses */}
      {allBonuses.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">
            Bonuses
          </h2>

          {/* Upcoming */}
          {pendingBonuses.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Upcoming
              </h3>
              <div className="space-y-2">
                {pendingBonuses.map((bonus) => (
                  <BonusCard
                    key={bonus.id}
                    bonus={bonus}
                    onEdit={() => setEditBonus(bonus)}
                    onDelete={() =>
                      setConfirmDeleteId({
                        type: "bonus",
                        id: bonus.id,
                        name: bonus.name,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Received */}
          {receivedBonuses.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Received
              </h3>
              <div className="space-y-2">
                {receivedBonuses.map((bonus) => (
                  <BonusCard
                    key={bonus.id}
                    bonus={bonus}
                    onEdit={() => setEditBonus(bonus)}
                    onDelete={() =>
                      setConfirmDeleteId({
                        type: "bonus",
                        id: bonus.id,
                        name: bonus.name,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      <IncomeSourceForm
        open={addSourceOpen || !!editSource}
        onClose={handleSourceFormClose}
        source={editSource ?? undefined}
      />

      <BonusForm
        open={addBonusOpen || !!editBonus}
        onClose={handleBonusFormClose}
        incomeSources={incomeSourceOptions}
        bonus={editBonus ?? undefined}
      />

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <ConfirmDeleteDialog
          name={confirmDeleteId.name}
          type={confirmDeleteId.type}
          onConfirm={() => {
            if (confirmDeleteId.type === "source") {
              deleteSourceMutation.mutate(confirmDeleteId.id);
            } else {
              deleteBonusMutation.mutate(confirmDeleteId.id);
            }
          }}
          onCancel={() => setConfirmDeleteId(null)}
          isPending={
            deleteSourceMutation.isPending || deleteBonusMutation.isPending
          }
        />
      )}

      {/* Cashflow Projection */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Cashflow Projection
        </h2>
        <CashflowProjection projections={projections} />
      </section>
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

// ─── Income Source Card ────────────────────────────────

function IncomeSourceCard({
  source,
  bonuses,
  onEdit,
  onToggleActive,
  onDelete,
  isToggling,
}: {
  source: IncomeSource;
  bonuses: BonusRow[];
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  isToggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const monthly = calcMonthlyFromSource(source);
  const annual = calcAnnualFromSource(source);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-100 truncate">
              {source.name}
            </span>
            <Badge
              variant={
                TYPE_BADGE_VARIANT[source.type] ?? "default"
              }
            >
              {TYPE_LABELS[source.type] ?? source.type}
            </Badge>
            {!source.isActive && (
              <Badge variant="warning">Inactive</Badge>
            )}
          </div>

          {source.employerName && (
            <p className="mt-0.5 text-sm text-zinc-400">
              {source.employerName}
            </p>
          )}

          {source.paySchedule && (
            <p className="mt-1 text-xs text-zinc-500">
              {SCHEDULE_LABELS[source.paySchedule] ?? source.paySchedule}
              {source.netPerPaycheckCents
                ? ` \u00b7 ${formatCents(source.netPerPaycheckCents)} net/paycheck`
                : ""}
              {source.grossPerPaycheckCents
                ? ` \u00b7 ${formatCents(source.grossPerPaycheckCents)} gross/paycheck`
                : ""}
            </p>
          )}

          {/* Monthly / Annual breakdown */}
          {source.netPerPaycheckCents && (
            <div className="mt-2 flex gap-4 text-xs">
              <span className="text-zinc-400">
                Monthly:{" "}
                <span className="font-medium text-green-400">
                  {formatCents(monthly)}
                </span>
              </span>
              <span className="text-zinc-400">
                Annual:{" "}
                <span className="font-medium text-green-400">
                  {formatCents(annual)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {bonuses.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
            >
              {expanded ? "Hide" : "Show"} Bonuses ({bonuses.length})
            </Button>
          )}
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
            onClick={onToggleActive}
            loading={isToggling}
            className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
          >
            {source.isActive ? "Deactivate" : "Activate"}
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

      {/* Expanded bonuses */}
      {expanded && bonuses.length > 0 && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Bonuses
          </p>
          <div className="space-y-1.5">
            {bonuses.map((bonus) => (
              <div
                key={bonus.id}
                className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2 text-sm"
              >
                <div>
                  <span className="text-zinc-100">{bonus.name}</span>
                  {bonus.expectedDate && (
                    <span className="ml-2 text-xs text-zinc-500">
                      {formatDate(bonus.expectedDate)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {bonus.actualAmountCents ? (
                    <span className="font-medium tabular-nums text-green-400">
                      {formatCents(bonus.actualAmountCents)}
                    </span>
                  ) : bonus.expectedAmountCents ? (
                    <span className="font-medium tabular-nums text-zinc-300">
                      {formatCents(bonus.expectedAmountCents)}
                      <span className="ml-1 text-xs text-zinc-500">
                        expected
                      </span>
                    </span>
                  ) : null}
                  {bonus.actualDate && (
                    <Badge variant="success">Received</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Bonus Card ────────────────────────────────────────

function BonusCard({
  bonus,
  onEdit,
  onDelete,
}: {
  bonus: BonusRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isReceived = !!bonus.actualDate;

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-100 truncate">
            {bonus.name}
          </span>
          <span className="text-xs text-zinc-500">{bonus.sourceName}</span>
          {isReceived && <Badge variant="success">Received</Badge>}
        </div>
        <div className="mt-1 flex gap-4 text-xs text-zinc-400">
          {bonus.expectedDate && (
            <span>Expected: {formatDate(bonus.expectedDate)}</span>
          )}
          {bonus.actualDate && (
            <span>Received: {formatDate(bonus.actualDate)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Show both expected and actual for comparison */}
        <div className="text-right">
          {isReceived && bonus.actualAmountCents ? (
            <>
              <p className="font-medium tabular-nums text-green-400">
                {formatCents(bonus.actualAmountCents)}
              </p>
              {bonus.expectedAmountCents &&
                bonus.expectedAmountCents !== bonus.actualAmountCents && (
                  <p className="text-xs tabular-nums text-zinc-500 line-through">
                    {formatCents(bonus.expectedAmountCents)}
                  </p>
                )}
            </>
          ) : bonus.expectedAmountCents ? (
            <p className="font-medium tabular-nums text-zinc-300">
              {formatCents(bonus.expectedAmountCents)}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
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

// ─── Confirm Delete Dialog ─────────────────────────────

function ConfirmDeleteDialog({
  name,
  type,
  onConfirm,
  onCancel,
  isPending,
}: {
  name: string;
  type: "source" | "bonus";
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const typeLabel = type === "source" ? "income source" : "bonus";

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
          Are you sure you want to delete <strong>{name}</strong>?
          {type === "source" &&
            " This will also delete all associated bonuses."}
          {" "}
          This action cannot be undone.
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

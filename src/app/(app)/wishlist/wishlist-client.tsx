"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Card, Button, Badge } from "@/components/ui";
import { WishlistForm } from "@/components/features/wishlist-form";
import { PurchaseModal } from "@/components/features/purchase-modal";
import {
  fetchWishlistPageData,
  updateWishlistStatus,
  deleteWishlistItem,
} from "@/actions/wishlist";
import { formatCents, formatDate, cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────

interface WishlistItemRow {
  id: string;
  name: string;
  estimatedCostCents: number | null;
  actualCostCents: number | null;
  priority: "p1" | "p2" | "p3";
  categoryId: string | null;
  url: string | null;
  status: "wishlist" | "researching" | "ready_to_buy" | "purchased";
  purchaseDate: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
}

interface WishlistSummary {
  totalEstimatedCentsActive: number;
  totalActualCentsPurchased: number;
  countByStatus: {
    wishlist: number;
    researching: number;
    ready_to_buy: number;
    purchased: number;
  };
  countByPriority: {
    p1: number;
    p2: number;
    p3: number;
  };
}

interface CategoryRow {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
}

interface WishlistPageData {
  items: WishlistItemRow[];
  summary: WishlistSummary;
  categories: CategoryRow[];
}

interface WishlistClientProps {
  initialData: WishlistPageData;
}

// ─── Constants ────────────────────────────────────────

type StatusFilter = "all" | "wishlist" | "researching" | "ready_to_buy" | "purchased";
type PriorityFilter = "all" | "p1" | "p2" | "p3";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Wishlist", value: "wishlist" },
  { label: "Researching", value: "researching" },
  { label: "Ready to Buy", value: "ready_to_buy" },
  { label: "Purchased", value: "purchased" },
];

const PRIORITY_FILTERS: { label: string; value: PriorityFilter }[] = [
  { label: "All", value: "all" },
  { label: "P1", value: "p1" },
  { label: "P2", value: "p2" },
  { label: "P3", value: "p3" },
];

const PRIORITY_LABELS: Record<string, string> = {
  p1: "P1",
  p2: "P2",
  p3: "P3",
};

const PRIORITY_COLORS: Record<string, string> = {
  p1: "bg-red-600/20 text-red-400 border border-red-600/30",
  p2: "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
  p3: "bg-zinc-700 text-zinc-400",
};

const STATUS_LABELS: Record<string, string> = {
  wishlist: "Wishlist",
  researching: "Researching",
  ready_to_buy: "Ready to Buy",
  purchased: "Purchased",
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "info" | "success" | "warning"> = {
  wishlist: "default",
  researching: "info",
  ready_to_buy: "success",
  purchased: "default",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  purchased: "bg-violet-600/20 text-violet-400 border border-violet-600/30",
};

// ─── Component ────────────────────────────────────────

export function WishlistClient({ initialData }: WishlistClientProps) {
  const queryClient = useQueryClient();

  // ── Data query ────────────────────────────────────────
  const { data } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => fetchWishlistPageData(),
    initialData,
  });

  const { items, summary, categories } = data;

  // ── Filter state ──────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  // ── Modal state ───────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItemRow | null>(null);
  const [purchaseItem, setPurchaseItem] = useState<WishlistItemRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [purchasedExpanded, setPurchasedExpanded] = useState(false);

  // ── Mutations ─────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "wishlist" | "researching" | "ready_to_buy" | "purchased";
    }) => updateWishlistStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWishlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setConfirmDeleteId(null);
    },
  });

  // ── Derived data ──────────────────────────────────────
  const filteredItems = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
    return true;
  });

  const activeItems = filteredItems.filter((i) => i.status !== "purchased");
  const purchasedItems = filteredItems.filter((i) => i.status === "purchased");

  const totalItemCount =
    summary.countByStatus.wishlist +
    summary.countByStatus.researching +
    summary.countByStatus.ready_to_buy +
    summary.countByStatus.purchased;

  const activeCount =
    summary.countByStatus.wishlist +
    summary.countByStatus.researching +
    summary.countByStatus.ready_to_buy;

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  // ── Form close handler ────────────────────────────────
  const handleFormClose = () => {
    setAddOpen(false);
    setEditItem(null);
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };

  const handlePurchaseClose = () => {
    setPurchaseItem(null);
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
  };

  // ── Next status action helper ─────────────────────────
  function getNextStatusAction(
    item: WishlistItemRow,
  ): { label: string; status: "researching" | "ready_to_buy" } | null {
    switch (item.status) {
      case "wishlist":
        return { label: "Start Research", status: "researching" };
      case "researching":
        return { label: "Ready to Buy", status: "ready_to_buy" };
      default:
        return null;
    }
  }

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Wishlist</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track items you want, research them, and mark purchases.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Item</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Wishlist Value"
          value={formatCents(summary.totalEstimatedCentsActive)}
          subtext={`${activeCount} active item${activeCount !== 1 ? "s" : ""}`}
          variant="default"
        />
        <SummaryCard
          label="Total Items"
          value={String(totalItemCount)}
          subtext={`${summary.countByStatus.purchased} purchased`}
          variant="default"
        />
        <SummaryCard
          label="Ready to Buy"
          value={String(summary.countByStatus.ready_to_buy)}
          variant="green"
        />
        <SummaryCard
          label="Purchased Total"
          value={formatCents(summary.totalActualCentsPurchased)}
          subtext={`${summary.countByStatus.purchased} item${summary.countByStatus.purchased !== 1 ? "s" : ""}`}
          variant="violet"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-6">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Status
          </span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Priority pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Priority
          </span>
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setPriorityFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                priorityFilter === f.value
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Items */}
      <section>
        {activeItems.length === 0 && purchasedItems.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-zinc-400">
              {items.length === 0
                ? "No wishlist items yet. Add your first one to get started."
                : "No items match the current filters."}
            </p>
          </Card>
        ) : (
          <>
            {activeItems.length > 0 && (
              <div className="space-y-3">
                {activeItems.map((item) => {
                  const nextAction = getNextStatusAction(item);
                  return (
                    <WishlistItemCard
                      key={item.id}
                      item={item}
                      nextAction={nextAction}
                      onStatusTransition={(status) =>
                        statusMutation.mutate({ id: item.id, status })
                      }
                      onMarkPurchased={() => setPurchaseItem(item)}
                      onEdit={() => setEditItem(item)}
                      onDelete={() =>
                        setConfirmDeleteId({ id: item.id, name: item.name })
                      }
                      isTransitioning={statusMutation.isPending}
                    />
                  );
                })}
              </div>
            )}

            {/* Purchased Section (collapsible) */}
            {purchasedItems.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setPurchasedExpanded(!purchasedExpanded)}
                  className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <svg
                    className={cn(
                      "h-4 w-4 transition-transform",
                      purchasedExpanded && "rotate-90",
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Purchased ({purchasedItems.length})
                </button>

                {purchasedExpanded && (
                  <div className="space-y-3">
                    {purchasedItems.map((item) => (
                      <PurchasedItemCard
                        key={item.id}
                        item={item}
                        onEdit={() => setEditItem(item)}
                        onDelete={() =>
                          setConfirmDeleteId({
                            id: item.id,
                            name: item.name,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Modals */}
      <WishlistForm
        open={addOpen || !!editItem}
        onClose={handleFormClose}
        item={editItem ?? undefined}
        categories={categoryOptions}
      />

      <PurchaseModal
        open={!!purchaseItem}
        onClose={handlePurchaseClose}
        item={purchaseItem}
      />

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

// ─── Summary Card ─────────────────────────────────────

function SummaryCard({
  label,
  value,
  subtext,
  variant = "default",
}: {
  label: string;
  value: string;
  subtext?: string;
  variant?: "green" | "violet" | "default";
}) {
  const valueColor =
    variant === "green"
      ? "text-green-400"
      : variant === "violet"
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

// ─── Wishlist Item Card ───────────────────────────────

function WishlistItemCard({
  item,
  nextAction,
  onStatusTransition,
  onMarkPurchased,
  onEdit,
  onDelete,
  isTransitioning,
}: {
  item: WishlistItemRow;
  nextAction: { label: string; status: "researching" | "ready_to_buy" } | null;
  onStatusTransition: (status: "researching" | "ready_to_buy") => void;
  onMarkPurchased: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isTransitioning: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-100 truncate">
              {item.name}
            </span>

            {/* Priority badge */}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                PRIORITY_COLORS[item.priority],
              )}
            >
              {PRIORITY_LABELS[item.priority]}
            </span>

            {/* Status badge */}
            <Badge
              variant={STATUS_BADGE_VARIANT[item.status]}
              className={STATUS_BADGE_CLASSES[item.status]}
            >
              {STATUS_LABELS[item.status]}
            </Badge>

            {/* URL link */}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Open link"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>

          {/* Category + cost row */}
          <div className="mt-1 flex items-center gap-3 text-sm">
            {item.categoryName && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: item.categoryColor ?? "#71717a",
                  }}
                />
                {item.categoryName}
              </span>
            )}
            {item.estimatedCostCents != null && (
              <span className="text-xs text-zinc-400">
                Est.{" "}
                <span className="font-medium tabular-nums text-zinc-300">
                  {formatCents(item.estimatedCostCents)}
                </span>
              </span>
            )}
          </div>

          {/* Notes preview */}
          {item.notes && (
            <p className="mt-1 text-xs text-zinc-500 truncate max-w-md">
              {item.notes}
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {nextAction && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStatusTransition(nextAction.status)}
              loading={isTransitioning}
              className="text-xs"
            >
              {nextAction.label}
            </Button>
          )}
          {(item.status === "ready_to_buy" ||
            item.status === "wishlist" ||
            item.status === "researching") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkPurchased}
              className="px-2 text-xs text-violet-400 hover:text-violet-300"
            >
              Purchased
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

// ─── Purchased Item Card ──────────────────────────────

function PurchasedItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: WishlistItemRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const estimated = item.estimatedCostCents;
  const actual = item.actualCostCents;
  const hasBothCosts = estimated != null && actual != null;
  const costDiff = hasBothCosts ? actual - estimated : null;

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-zinc-100 truncate">
            {item.name}
          </span>
          <Badge className="bg-violet-600/20 text-violet-400 border border-violet-600/30">
            Purchased
          </Badge>
          {item.categoryName && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: item.categoryColor ?? "#71717a",
                }}
              />
              {item.categoryName}
            </span>
          )}
        </div>

        <div className="mt-1 flex gap-4 text-xs text-zinc-400">
          {item.purchaseDate && (
            <span>Purchased: {formatDate(item.purchaseDate)}</span>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300 transition-colors underline"
            >
              Link
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Cost comparison */}
        <div className="text-right">
          {actual != null ? (
            <>
              <p className="font-medium tabular-nums text-violet-400">
                {formatCents(actual)}
              </p>
              {hasBothCosts && estimated !== actual && (
                <p className="text-xs tabular-nums text-zinc-500">
                  <span className="line-through">
                    {formatCents(estimated!)}
                  </span>
                  {costDiff != null && (
                    <span
                      className={cn(
                        "ml-1",
                        costDiff > 0 ? "text-red-400" : "text-green-400",
                      )}
                    >
                      {costDiff > 0 ? "+" : ""}
                      {formatCents(costDiff)}
                    </span>
                  )}
                </p>
              )}
            </>
          ) : estimated != null ? (
            <p className="font-medium tabular-nums text-zinc-300">
              {formatCents(estimated)}
              <span className="ml-1 text-xs text-zinc-500">est.</span>
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

// ─── Confirm Delete Dialog ────────────────────────────

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
        <h3 className="text-lg font-semibold text-zinc-100">
          Delete wishlist item
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

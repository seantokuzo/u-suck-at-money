"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Card, Button, Badge } from "@/components/ui";
import { EventForm } from "@/components/features/event-form";
import {
  fetchEventsPageData,
  deleteEvent,
  updateEventStatus,
} from "@/actions/events";
import { formatCents, formatDate, cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────

type EventStatus = "planned" | "booked" | "paid" | "completed" | "cancelled";

interface EventWithCategory {
  id: string;
  name: string;
  estimatedCostCents: number | null;
  actualCostCents: number | null;
  targetDate: string | null;
  categoryId: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string | null;
}

interface EventsSummary {
  totalEstimatedCents: number;
  totalActualCents: number;
  countByStatus: Record<EventStatus, number>;
}

interface EventsPageData {
  events: EventWithCategory[];
  summary: EventsSummary;
  categories: CategoryOption[];
}

interface EventsClientProps {
  initialData: EventsPageData;
}

// ─── Constants ─────────────────────────────────────────

const STATUS_LABELS: Record<EventStatus, string> = {
  planned: "Planned",
  booked: "Booked",
  paid: "Paid",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE_CLASSES: Record<EventStatus, string> = {
  planned:
    "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
  booked: "bg-blue-600/20 text-blue-400 border border-blue-600/30",
  paid: "bg-green-600/20 text-green-400 border border-green-600/30",
  completed:
    "bg-zinc-600/20 text-zinc-400 border border-zinc-600/30",
  cancelled: "bg-red-600/20 text-red-400 border border-red-600/30",
};

/** Status transitions: what the next action is from the current status */
const STATUS_TRANSITIONS: Partial<
  Record<EventStatus, { label: string; next: EventStatus }>
> = {
  planned: { label: "Book", next: "booked" },
  booked: { label: "Mark Paid", next: "paid" },
  paid: { label: "Complete", next: "completed" },
};

const ALL_STATUSES: EventStatus[] = [
  "planned",
  "booked",
  "paid",
  "completed",
  "cancelled",
];

const FILTER_TABS: { label: string; value: EventStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "Booked", value: "booked" },
  { label: "Paid", value: "paid" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

// ─── Component ─────────────────────────────────────────

export function EventsClient({ initialData }: EventsClientProps) {
  const queryClient = useQueryClient();

  // ── Data query ────────────────────────────────────────
  const { data } = useQuery({
    queryKey: ["events"],
    queryFn: () => fetchEventsPageData(),
    initialData,
  });

  const { events: allEvents, summary, categories } = data;

  // ── State ─────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventWithCategory | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // ── Mutations ─────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setConfirmDeleteId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) =>
      updateEventStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  // ── Derived values ────────────────────────────────────
  const filteredEvents =
    statusFilter === "all"
      ? allEvents
      : allEvents.filter((e) => e.status === statusFilter);

  const activeEvents = allEvents.filter(
    (e) => e.status !== "completed" && e.status !== "cancelled",
  );
  const totalPlannedCents = activeEvents.reduce(
    (sum, e) => sum + (e.estimatedCostCents ?? 0),
    0,
  );
  const totalSpentCents = allEvents.reduce(
    (sum, e) => sum + (e.actualCostCents ?? 0),
    0,
  );
  const upcomingCount = allEvents.filter(
    (e) =>
      (e.status === "planned" || e.status === "booked") &&
      e.targetDate &&
      new Date(e.targetDate) >= new Date(),
  ).length;

  const totalEventsCount = allEvents.length;

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  // ── Form close handler ────────────────────────────────
  const handleFormClose = () => {
    setAddOpen(false);
    setEditEvent(null);
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Life Events</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track upcoming events, costs, and progress.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Event</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Planned Cost"
          value={formatCents(totalPlannedCents)}
          subtext="active events"
          variant="yellow"
        />
        <SummaryCard
          label="Total Spent"
          value={formatCents(totalSpentCents)}
          variant="green"
        />
        <SummaryCard
          label="Total Events"
          value={String(totalEventsCount)}
          subtext={statusBreakdownText(summary.countByStatus)}
          variant="default"
        />
        <SummaryCard
          label="Upcoming"
          value={String(upcomingCount)}
          subtext="planned or booked"
          variant="blue"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              statusFilter === tab.value
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
            )}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {summary.countByStatus[tab.value as EventStatus]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <section>
        {filteredEvents.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-zinc-400">
              {statusFilter === "all"
                ? "No events yet. Add your first one to get started."
                : `No ${STATUS_LABELS[statusFilter as EventStatus].toLowerCase()} events.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={() => setEditEvent(event)}
                onDelete={() =>
                  setConfirmDeleteId({
                    id: event.id,
                    name: event.name,
                  })
                }
                onStatusTransition={(next) =>
                  statusMutation.mutate({ id: event.id, status: next })
                }
                onCancel={() =>
                  statusMutation.mutate({
                    id: event.id,
                    status: "cancelled",
                  })
                }
                isTransitioning={statusMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* Form Modal */}
      <EventForm
        open={addOpen || !!editEvent}
        onClose={handleFormClose}
        event={editEvent ?? undefined}
        categories={categoryOptions}
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

// ─── Helpers ──────────────────────────────────────────

function statusBreakdownText(
  countByStatus: Record<EventStatus, number>,
): string {
  const parts: string[] = [];
  for (const status of ALL_STATUSES) {
    const count = countByStatus[status];
    if (count > 0) {
      parts.push(`${count} ${status}`);
    }
  }
  return parts.join(", ") || "none";
}

function costVariance(
  estimated: number | null,
  actual: number | null,
): { text: string; isOver: boolean } | null {
  if (estimated == null || actual == null) return null;
  const diff = actual - estimated;
  if (diff === 0) return null;
  const isOver = diff > 0;
  return {
    text: `${isOver ? "+" : "-"}${formatCents(Math.abs(diff))}`,
    isOver,
  };
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
  variant?: "green" | "blue" | "yellow" | "default";
}) {
  const valueColor =
    variant === "green"
      ? "text-green-400"
      : variant === "blue"
        ? "text-blue-400"
        : variant === "yellow"
          ? "text-yellow-400"
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

// ─── Event Card ────────────────────────────────────────

function EventCard({
  event,
  onEdit,
  onDelete,
  onStatusTransition,
  onCancel,
  isTransitioning,
}: {
  event: EventWithCategory;
  onEdit: () => void;
  onDelete: () => void;
  onStatusTransition: (next: EventStatus) => void;
  onCancel: () => void;
  isTransitioning: boolean;
}) {
  const status = event.status as EventStatus;
  const transition = STATUS_TRANSITIONS[status];
  const variance = costVariance(
    event.estimatedCostCents,
    event.actualCostCents,
  );

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-100 truncate">
              {event.name}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_BADGE_CLASSES[status],
              )}
            >
              {STATUS_LABELS[status]}
            </span>
            {event.categoryName && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: event.categoryColor ?? "#71717a",
                  }}
                />
                {event.categoryName}
              </span>
            )}
          </div>

          {/* Date */}
          {event.targetDate && (
            <p className="mt-1 text-xs text-zinc-500">
              {formatDate(event.targetDate)}
            </p>
          )}

          {/* Cost display */}
          <div className="mt-2 flex items-center gap-4 text-xs">
            {event.estimatedCostCents != null && (
              <span className="text-zinc-400">
                Estimated:{" "}
                <span className="font-medium text-zinc-300">
                  {formatCents(event.estimatedCostCents)}
                </span>
              </span>
            )}
            {event.actualCostCents != null && (
              <span className="text-zinc-400">
                Actual:{" "}
                <span className="font-medium text-green-400">
                  {formatCents(event.actualCostCents)}
                </span>
              </span>
            )}
            {variance && (
              <span
                className={cn(
                  "font-medium",
                  variance.isOver ? "text-red-400" : "text-green-400",
                )}
              >
                {variance.text} {variance.isOver ? "over" : "under"} budget
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Status transition button */}
          {transition && status !== "cancelled" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStatusTransition(transition.next)}
              loading={isTransitioning}
              className="text-xs"
            >
              {transition.label}
            </Button>
          )}
          {/* Cancel button for non-terminal statuses */}
          {status !== "completed" && status !== "cancelled" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              loading={isTransitioning}
              className="px-2 text-xs text-zinc-400 hover:text-red-400"
            >
              Cancel
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
        <h3 className="text-lg font-semibold text-zinc-100">Delete Event</h3>
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

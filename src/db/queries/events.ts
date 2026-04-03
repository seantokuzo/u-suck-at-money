import { eq, asc, and, inArray, gte, lte, sql, count } from "drizzle-orm";
import { db } from "@/db";
import { events, categories } from "@/db/schema";

export type Event = typeof events.$inferSelect;

export interface EventWithCategory extends Event {
  categoryName: string | null;
  categoryColor: string | null;
}

export type EventStatus =
  | "planned"
  | "booked"
  | "paid"
  | "completed"
  | "cancelled";

export interface EventsFilterOptions {
  status?: EventStatus;
  categoryId?: string;
}

export interface EventsSummary {
  totalEstimatedCents: number;
  totalActualCents: number;
  countByStatus: Record<EventStatus, number>;
}

/** All events with optional filters, joined with category name/color */
export async function getEvents(
  options?: EventsFilterOptions,
): Promise<EventWithCategory[]> {
  const conditions = [];

  if (options?.status) {
    conditions.push(eq(events.status, options.status));
  }
  if (options?.categoryId) {
    conditions.push(eq(events.categoryId, options.categoryId));
  }

  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      estimatedCostCents: events.estimatedCostCents,
      actualCostCents: events.actualCostCents,
      targetDate: events.targetDate,
      categoryId: events.categoryId,
      status: events.status,
      notes: events.notes,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(events.targetDate), asc(events.createdAt));

  return rows;
}

/** Single event by ID with category name */
export async function getEventById(
  id: string,
): Promise<EventWithCategory | null> {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      estimatedCostCents: events.estimatedCostCents,
      actualCostCents: events.actualCostCents,
      targetDate: events.targetDate,
      categoryId: events.categoryId,
      status: events.status,
      notes: events.notes,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(eq(events.id, id))
    .limit(1);

  return rows[0] ?? null;
}

/** Upcoming events (planned or booked) within N days from today */
export async function getUpcomingEvents(
  days: number = 90,
): Promise<EventWithCategory[]> {
  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return db
    .select({
      id: events.id,
      name: events.name,
      estimatedCostCents: events.estimatedCostCents,
      actualCostCents: events.actualCostCents,
      targetDate: events.targetDate,
      categoryId: events.categoryId,
      status: events.status,
      notes: events.notes,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .where(
      and(
        inArray(events.status, ["planned", "booked"]),
        gte(events.targetDate, today),
        lte(events.targetDate, futureDate),
      ),
    )
    .orderBy(asc(events.targetDate));
}

/** Aggregate summary: total estimated, total actual, count by status */
export async function getEventsSummary(): Promise<EventsSummary> {
  const [totals] = await db
    .select({
      totalEstimated: sql<number>`coalesce(sum(${events.estimatedCostCents}), 0)`,
      totalActual: sql<number>`coalesce(sum(${events.actualCostCents}), 0)`,
    })
    .from(events);

  const statusCounts = await db
    .select({
      status: events.status,
      count: count(),
    })
    .from(events)
    .groupBy(events.status);

  const allStatuses: EventStatus[] = [
    "planned",
    "booked",
    "paid",
    "completed",
    "cancelled",
  ];
  const countByStatus = Object.fromEntries(
    allStatuses.map((s) => [s, 0]),
  ) as Record<EventStatus, number>;

  for (const row of statusCounts) {
    countByStatus[row.status as EventStatus] = Number(row.count);
  }

  return {
    totalEstimatedCents: Number(totals.totalEstimated),
    totalActualCents: Number(totals.totalActual),
    countByStatus,
  };
}

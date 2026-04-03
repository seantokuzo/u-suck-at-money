"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events } from "@/db/schema";
import { parseCents } from "@/lib/utils";
import {
  getEvents,
  getEventsSummary,
  type EventsFilterOptions,
  type EventStatus,
} from "@/db/queries/events";
import { getCategories } from "@/db/queries/categories";

// ─── Fetch Wrappers (for React Query on client) ────────

/** Fetch events page data — events + summary + categories */
export async function fetchEventsPageData(options?: EventsFilterOptions) {
  const [eventsList, summary, categoriesList] = await Promise.all([
    getEvents(options),
    getEventsSummary(),
    getCategories(),
  ]);

  return {
    events: eventsList,
    summary,
    categories: categoriesList,
  };
}

/** Fetch events with optional filters */
export async function fetchEvents(options?: EventsFilterOptions) {
  return getEvents(options);
}

// ─── Mutations ────────────────────────────────────────────

/** Create a new event */
export async function createEvent(formData: FormData) {
  const name = formData.get("name") as string;
  const estimatedCost = formData.get("estimatedCostCents") as string;
  const actualCost = formData.get("actualCostCents") as string;
  const targetDate = (formData.get("targetDate") as string) || null;
  const categoryId = (formData.get("categoryId") as string) || null;
  const status = (formData.get("status") as string) || "planned";
  const notes = (formData.get("notes") as string) || null;

  if (!name) {
    throw new Error("Name is required");
  }

  const estimatedCostCents = estimatedCost ? parseCents(estimatedCost) : null;
  const actualCostCents = actualCost ? parseCents(actualCost) : null;

  await db.insert(events).values({
    name,
    estimatedCostCents,
    actualCostCents,
    targetDate,
    categoryId,
    status: status as EventStatus,
    notes,
  });

  revalidatePath("/events");
}

/** Update an existing event */
export async function updateEvent(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const estimatedCost = formData.get("estimatedCostCents") as string;
  const actualCost = formData.get("actualCostCents") as string;
  const targetDate = (formData.get("targetDate") as string) || null;
  const categoryId = (formData.get("categoryId") as string) || null;
  const status = (formData.get("status") as string) || "planned";
  const notes = (formData.get("notes") as string) || null;

  if (!id || !name) {
    throw new Error("ID and name are required");
  }

  const estimatedCostCents = estimatedCost ? parseCents(estimatedCost) : null;
  const actualCostCents = actualCost ? parseCents(actualCost) : null;

  await db
    .update(events)
    .set({
      name,
      estimatedCostCents,
      actualCostCents,
      targetDate,
      categoryId,
      status: status as EventStatus,
      notes,
    })
    .where(eq(events.id, id));

  revalidatePath("/events");
}

/** Delete an event */
export async function deleteEvent(id: string) {
  if (!id) {
    throw new Error("Event ID is required");
  }

  await db.delete(events).where(eq(events.id, id));

  revalidatePath("/events");
}

/** Transition event status */
export async function updateEventStatus(id: string, status: EventStatus) {
  if (!id || !status) {
    throw new Error("Event ID and status are required");
  }

  await db
    .update(events)
    .set({ status })
    .where(eq(events.id, id));

  revalidatePath("/events");
}

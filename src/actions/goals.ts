"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { parseCents } from "@/lib/utils";
import {
  getGoals,
  getGoalsSummary,
  type GetGoalsOptions,
} from "@/db/queries/goals";

// ─── Fetch Wrappers (for React Query on client) ──────

/** Fetch goals with optional filters — used by client-side React Query */
export async function fetchGoals(options?: GetGoalsOptions) {
  return getGoals(options);
}

/** Fetch goals summary — used by client-side React Query */
export async function fetchGoalsSummary() {
  return getGoalsSummary();
}

// ─── Goal Mutations ──────────────────────────────────

/** Create a new goal */
export async function createGoal(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const targetAmount = formData.get("targetAmount") as string;
  const currentAmount = formData.get("currentAmount") as string;
  const targetDate = (formData.get("targetDate") as string) || null;
  const accountId = (formData.get("accountId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!name || !type || !targetAmount) {
    throw new Error("Name, type, and target amount are required");
  }

  const targetAmountCents = parseCents(targetAmount);
  const currentAmountCents = currentAmount ? parseCents(currentAmount) : 0;

  await db.insert(goals).values({
    name,
    type: type as "savings" | "checking_target" | "debt_payoff" | "investment",
    targetAmountCents,
    currentAmountCents,
    targetDate,
    accountId,
    notes,
  });

  revalidatePath("/goals");
}

/** Update an existing goal */
export async function updateGoal(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const targetAmount = formData.get("targetAmount") as string;
  const currentAmount = formData.get("currentAmount") as string;
  const targetDate = (formData.get("targetDate") as string) || null;
  const accountId = (formData.get("accountId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!id || !name || !type || !targetAmount) {
    throw new Error("ID, name, type, and target amount are required");
  }

  const targetAmountCents = parseCents(targetAmount);
  const currentAmountCents = currentAmount ? parseCents(currentAmount) : 0;

  await db
    .update(goals)
    .set({
      name,
      type: type as
        | "savings"
        | "checking_target"
        | "debt_payoff"
        | "investment",
      targetAmountCents,
      currentAmountCents,
      targetDate,
      accountId,
      notes,
    })
    .where(eq(goals.id, id));

  revalidatePath("/goals");
}

/** Delete a goal */
export async function deleteGoal(id: string) {
  if (!id) {
    throw new Error("Goal ID is required");
  }

  await db.delete(goals).where(eq(goals.id, id));

  revalidatePath("/goals");
}

/** Quick progress update — set currentAmountCents */
export async function updateGoalProgress(id: string, newAmountCents: number) {
  if (!id) {
    throw new Error("Goal ID is required");
  }

  await db
    .update(goals)
    .set({ currentAmountCents: newAmountCents })
    .where(eq(goals.id, id));

  revalidatePath("/goals");
}

/** Mark a goal as completed */
export async function markGoalCompleted(id: string) {
  if (!id) {
    throw new Error("Goal ID is required");
  }

  await db
    .update(goals)
    .set({ status: "completed" })
    .where(eq(goals.id, id));

  revalidatePath("/goals");
}

/** Mark a goal as abandoned */
export async function markGoalAbandoned(id: string) {
  if (!id) {
    throw new Error("Goal ID is required");
  }

  await db
    .update(goals)
    .set({ status: "abandoned" })
    .where(eq(goals.id, id));

  revalidatePath("/goals");
}

/** Reactivate a goal — set status back to active */
export async function reactivateGoal(id: string) {
  if (!id) {
    throw new Error("Goal ID is required");
  }

  await db
    .update(goals)
    .set({ status: "active" })
    .where(eq(goals.id, id));

  revalidatePath("/goals");
}

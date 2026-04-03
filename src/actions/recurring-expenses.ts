"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { recurringExpenses } from "@/db/schema";
import { parseCents } from "@/lib/utils";
import {
  getRecurringExpenses,
  getTotalMonthlyRecurring,
  type GetRecurringExpensesOptions,
} from "@/db/queries/recurring-expenses";

// ─── Fetch Wrappers (for React Query on client) ────────

/** Fetch recurring expenses with optional filters — used by client-side React Query */
export async function fetchRecurringExpenses(
  options?: GetRecurringExpensesOptions,
) {
  const [expenses, totalMonthlyCents] = await Promise.all([
    getRecurringExpenses(options),
    getTotalMonthlyRecurring(),
  ]);
  return { expenses, totalMonthlyCents };
}

// ─── Create ────────────────────────────────────────────

export async function createRecurringExpense(formData: FormData) {
  const name = formData.get("name") as string;
  const amount = formData.get("amount") as string;
  const frequency = formData.get("frequency") as string;
  const categoryId = (formData.get("categoryId") as string) || null;
  const dueDay = formData.get("dueDay") as string;
  const dueMonth = formData.get("dueMonth") as string;
  const isAutoPay = formData.get("isAutoPay") === "on";
  const accountId = (formData.get("accountId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!name || !amount || !frequency) {
    throw new Error("Name, amount, and frequency are required");
  }

  const amountCents = parseCents(amount);

  await db.insert(recurringExpenses).values({
    name,
    amountCents,
    frequency: frequency as any,
    categoryId,
    dueDay: dueDay ? parseInt(dueDay, 10) : null,
    dueMonth: dueMonth ? parseInt(dueMonth, 10) : null,
    isAutoPay,
    accountId,
    notes,
  });

  revalidatePath("/expenses");
}

// ─── Update ────────────────────────────────────────────

export async function updateRecurringExpense(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const amount = formData.get("amount") as string;
  const frequency = formData.get("frequency") as string;
  const categoryId = (formData.get("categoryId") as string) || null;
  const dueDay = formData.get("dueDay") as string;
  const dueMonth = formData.get("dueMonth") as string;
  const isAutoPay = formData.get("isAutoPay") === "on";
  const accountId = (formData.get("accountId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!id || !name || !amount || !frequency) {
    throw new Error("ID, name, amount, and frequency are required");
  }

  const amountCents = parseCents(amount);

  await db
    .update(recurringExpenses)
    .set({
      name,
      amountCents,
      frequency: frequency as any,
      categoryId,
      dueDay: dueDay ? parseInt(dueDay, 10) : null,
      dueMonth: dueMonth ? parseInt(dueMonth, 10) : null,
      isAutoPay,
      accountId,
      notes,
    })
    .where(eq(recurringExpenses.id, id));

  revalidatePath("/expenses");
}

// ─── Delete ────────────────────────────────────────────

export async function deleteRecurringExpense(id: string) {
  if (!id) throw new Error("ID is required");

  await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));

  revalidatePath("/expenses");
}

// ─── Toggle Active ─────────────────────────────────────

export async function toggleRecurringExpenseActive(id: string) {
  if (!id) throw new Error("ID is required");

  // Fetch current state
  const [current] = await db
    .select({ isActive: recurringExpenses.isActive })
    .from(recurringExpenses)
    .where(eq(recurringExpenses.id, id));

  if (!current) throw new Error("Expense not found");

  await db
    .update(recurringExpenses)
    .set({ isActive: !current.isActive })
    .where(eq(recurringExpenses.id, id));

  revalidatePath("/expenses");
}

// ─── Toggle Auto-Pay ───────────────────────────────────

export async function toggleRecurringExpenseAutoPay(id: string) {
  if (!id) throw new Error("ID is required");

  const [current] = await db
    .select({ isAutoPay: recurringExpenses.isAutoPay })
    .from(recurringExpenses)
    .where(eq(recurringExpenses.id, id));

  if (!current) throw new Error("Expense not found");

  await db
    .update(recurringExpenses)
    .set({ isAutoPay: !current.isAutoPay })
    .where(eq(recurringExpenses.id, id));

  revalidatePath("/expenses");
}

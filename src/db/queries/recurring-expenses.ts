import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { recurringExpenses, categories, accounts } from "@/db/schema";
import { toMonthlyCents, getNextDueDate, daysUntil } from "@/lib/recurring-utils";

// ─── Types ──────────────────────────────────────────────

type Frequency =
  | "weekly"
  | "biweekly"
  | "semi_monthly"
  | "monthly"
  | "quarterly"
  | "annual";

export interface GetRecurringExpensesOptions {
  isActive?: boolean;
  frequency?: Frequency;
  categoryId?: string;
}

// ─── Queries ────────────────────────────────────────────

/** All recurring expenses with optional filters, joined with category and account */
export async function getRecurringExpenses(
  options: GetRecurringExpensesOptions = {},
) {
  const conditions = [];

  if (options.isActive !== undefined) {
    conditions.push(eq(recurringExpenses.isActive, options.isActive));
  }
  if (options.frequency) {
    conditions.push(eq(recurringExpenses.frequency, options.frequency));
  }
  if (options.categoryId) {
    conditions.push(eq(recurringExpenses.categoryId, options.categoryId));
  }

  const whereClause =
    conditions.length > 1
      ? and(...conditions)
      : conditions.length === 1
        ? conditions[0]
        : undefined;

  return db
    .select({
      id: recurringExpenses.id,
      name: recurringExpenses.name,
      amountCents: recurringExpenses.amountCents,
      categoryId: recurringExpenses.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      frequency: recurringExpenses.frequency,
      dueDay: recurringExpenses.dueDay,
      dueMonth: recurringExpenses.dueMonth,
      isAutoPay: recurringExpenses.isAutoPay,
      isActive: recurringExpenses.isActive,
      accountId: recurringExpenses.accountId,
      accountName: accounts.name,
      notes: recurringExpenses.notes,
      createdAt: recurringExpenses.createdAt,
      updatedAt: recurringExpenses.updatedAt,
    })
    .from(recurringExpenses)
    .leftJoin(categories, eq(recurringExpenses.categoryId, categories.id))
    .leftJoin(accounts, eq(recurringExpenses.accountId, accounts.id))
    .where(whereClause)
    .orderBy(asc(recurringExpenses.name));
}

/** Single recurring expense by ID with category and account joined */
export async function getRecurringExpenseById(id: string) {
  const [result] = await db
    .select({
      id: recurringExpenses.id,
      name: recurringExpenses.name,
      amountCents: recurringExpenses.amountCents,
      categoryId: recurringExpenses.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      frequency: recurringExpenses.frequency,
      dueDay: recurringExpenses.dueDay,
      dueMonth: recurringExpenses.dueMonth,
      isAutoPay: recurringExpenses.isAutoPay,
      isActive: recurringExpenses.isActive,
      accountId: recurringExpenses.accountId,
      accountName: accounts.name,
      notes: recurringExpenses.notes,
      createdAt: recurringExpenses.createdAt,
      updatedAt: recurringExpenses.updatedAt,
    })
    .from(recurringExpenses)
    .leftJoin(categories, eq(recurringExpenses.categoryId, categories.id))
    .leftJoin(accounts, eq(recurringExpenses.accountId, accounts.id))
    .where(eq(recurringExpenses.id, id));

  return result ?? null;
}

/** Shorthand: all active recurring expenses */
export async function getActiveRecurringExpenses() {
  return getRecurringExpenses({ isActive: true });
}

/** All recurring expenses for a specific category */
export async function getRecurringExpensesByCategory(categoryId: string) {
  return getRecurringExpenses({ categoryId });
}

/**
 * Calculate total monthly cost from all active recurring expenses.
 * Normalizes each expense to its monthly equivalent based on frequency.
 * Returns total in cents.
 */
export async function getTotalMonthlyRecurring(): Promise<number> {
  const active = await db
    .select({
      amountCents: recurringExpenses.amountCents,
      frequency: recurringExpenses.frequency,
    })
    .from(recurringExpenses)
    .where(eq(recurringExpenses.isActive, true));

  return active.reduce((total, expense) => {
    return total + toMonthlyCents(expense.amountCents, expense.frequency as Frequency);
  }, 0);
}

/**
 * Get active expenses with next due date within N days.
 * Calculates next due date from dueDay + frequency, then filters.
 * Returns expenses sorted by soonest due date first.
 */
export async function getUpcomingBills(days: number = 30) {
  const active = await getActiveRecurringExpenses();
  const now = new Date();

  const withDueDates = active
    .map((expense) => {
      const nextDue = getNextDueDate(
        {
          frequency: expense.frequency as Frequency,
          dueDay: expense.dueDay,
          dueMonth: expense.dueMonth,
        },
        now,
      );

      return {
        ...expense,
        nextDueDate: nextDue,
        daysUntilDue: nextDue ? daysUntil(nextDue, now) : null,
      };
    })
    .filter(
      (expense) =>
        expense.nextDueDate !== null &&
        expense.daysUntilDue !== null &&
        expense.daysUntilDue >= 0 &&
        expense.daysUntilDue <= days,
    )
    .sort((a, b) => (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999));

  return withDueDates;
}

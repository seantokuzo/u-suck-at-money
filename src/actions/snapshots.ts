"use server";

import { eq, and, lt, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { transactions, accounts, monthlySnapshots } from "@/db/schema";
import { getCategorySpend, getMonthlySnapshot } from "@/db/queries/dashboard";

// ─── Helpers ───────────────────────────────────────────

/** Given "YYYY-MM", return the first day as "YYYY-MM-01" */
function getFirstDay(month: string): string {
  return `${month}-01`;
}

/** Given "YYYY-MM", return the first day of the next month as "YYYY-MM-01" */
function getNextMonthFirstDay(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  let year = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);
  m += 1;
  if (m > 12) {
    m = 1;
    year += 1;
  }
  return `${year}-${String(m).padStart(2, "0")}-01`;
}

// ─── Generate Monthly Snapshot ─────────────────────────

/**
 * Generate (or regenerate) the monthly snapshot for a given month.
 * Aggregates all transactions in the month into:
 * - totalIncomeCents: sum of positive amountCents (where excludeFromTotals=false)
 * - totalExpensesCents: sum of negative amountCents (abs value, where excludeFromTotals=false)
 * - netCashflowCents: income - expenses
 * - categoryBreakdown: JSON object mapping categoryId -> total amountCents (expenses only)
 * - accountBalances: JSON object mapping accountId -> current balance from accounts table
 *
 * Uses upsert (INSERT ... ON CONFLICT UPDATE) on the month unique index.
 */
export async function generateMonthlySnapshot(month: string) {
  const firstDay = getFirstDay(month);
  const nextMonthFirstDay = getNextMonthFirstDay(month);

  // Date range filter for transactions in this month
  const dateFilter = and(
    gte(transactions.date, firstDay),
    lt(transactions.date, nextMonthFirstDay),
    eq(transactions.excludeFromTotals, false),
  );

  // Aggregate income and expenses in a single query
  const [totals] = await db
    .select({
      totalIncomeCents:
        sql<number>`coalesce(sum(case when ${transactions.amountCents} > 0 then ${transactions.amountCents} else 0 end), 0)`,
      totalExpensesCents:
        sql<number>`coalesce(abs(sum(case when ${transactions.amountCents} < 0 then ${transactions.amountCents} else 0 end)), 0)`,
    })
    .from(transactions)
    .where(dateFilter);

  const totalIncomeCents = Number(totals.totalIncomeCents);
  const totalExpensesCents = Number(totals.totalExpensesCents);
  const netCashflowCents = totalIncomeCents - totalExpensesCents;

  // Category breakdown: group expense transactions by categoryId
  const categoryRows = await db
    .select({
      categoryId: transactions.categoryId,
      totalCents: sql<number>`sum(${transactions.amountCents})`,
    })
    .from(transactions)
    .where(
      and(dateFilter, lt(transactions.amountCents, 0)),
    )
    .groupBy(transactions.categoryId);

  const categoryBreakdown: Record<string, number> = {};
  for (const row of categoryRows) {
    if (row.categoryId) {
      categoryBreakdown[row.categoryId] = Number(row.totalCents);
    }
  }

  // Account balances: snapshot current balances of all active accounts
  const activeAccounts = await db
    .select({
      id: accounts.id,
      currentBalanceCents: accounts.currentBalanceCents,
    })
    .from(accounts)
    .where(eq(accounts.isActive, true));

  const accountBalances: Record<string, number> = {};
  for (const acct of activeAccounts) {
    accountBalances[acct.id] = acct.currentBalanceCents;
  }

  // Upsert the snapshot
  await db
    .insert(monthlySnapshots)
    .values({
      month,
      totalIncomeCents,
      totalExpensesCents,
      netCashflowCents,
      categoryBreakdown,
      accountBalances,
    })
    .onConflictDoUpdate({
      target: monthlySnapshots.month,
      set: {
        totalIncomeCents,
        totalExpensesCents,
        netCashflowCents,
        categoryBreakdown,
        accountBalances,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/dashboard");
  revalidatePath("/analysis");

  return {
    month,
    totalIncomeCents,
    totalExpensesCents,
    netCashflowCents,
  };
}

// ─── Generate All Missing Snapshots ────────────────────

/**
 * Generate snapshots for all months that have transactions but no existing snapshot.
 * Returns the count of newly generated snapshots.
 */
export async function generateAllMissingSnapshots() {
  // Find all distinct months from transactions
  const transactionMonths = await db
    .selectDistinct({
      month: sql<string>`to_char(${transactions.date}::date, 'YYYY-MM')`,
    })
    .from(transactions);

  // Find all existing snapshot months
  const existingSnapshots = await db
    .select({ month: monthlySnapshots.month })
    .from(monthlySnapshots);

  const existingSet = new Set(existingSnapshots.map((s) => s.month));

  // Find missing months
  const missingMonths = transactionMonths
    .map((r) => r.month)
    .filter((m) => !existingSet.has(m));

  // Generate each missing snapshot
  for (const month of missingMonths) {
    await generateMonthlySnapshot(month);
  }

  return { generated: missingMonths.length, months: missingMonths };
}

// ─── Fetch Analysis Data ──────────────────────────────

/**
 * Fetch category spend and snapshot for a given month.
 * Used by the analysis page month selector to load data client-side.
 */
export async function fetchAnalysisData(month: string) {
  const [categorySpend, snapshot] = await Promise.all([
    getCategorySpend(month),
    getMonthlySnapshot(month),
  ]);
  return { categorySpend, snapshot };
}

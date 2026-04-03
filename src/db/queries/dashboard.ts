import { db } from "@/db";
import {
  accounts,
  transactions,
  categories,
  monthlySnapshots,
} from "@/db/schema";
import { eq, and, lt, gte, desc, sql, isNotNull } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────

export interface AccountGroupSummary {
  type: string;
  accounts: {
    id: string;
    name: string;
    institution: string | null;
    currentBalanceCents: number;
  }[];
  totalCents: number;
}

export interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  categoryName: string | null;
}

// ─── Queries ────────────────────────────────────────────

/** Sum of all active account balances (credit cards are negative, so sum = net worth) */
export async function getNetWorth(): Promise<number> {
  const [result] = await db
    .select({
      total: sql<number>`coalesce(sum(${accounts.currentBalanceCents}), 0)`,
    })
    .from(accounts)
    .where(eq(accounts.isActive, true));

  return Number(result.total);
}

/** Get the monthly_snapshots row for a given month (e.g. "2026-04"). Returns null if none. */
export async function getMonthlySnapshot(month: string) {
  const [result] = await db
    .select()
    .from(monthlySnapshots)
    .where(eq(monthlySnapshots.month, month));

  return result ?? null;
}

/** Returns accounts grouped by type with subtotals */
export async function getAccountSummary(): Promise<AccountGroupSummary[]> {
  const allAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      institution: accounts.institution,
      currentBalanceCents: accounts.currentBalanceCents,
    })
    .from(accounts)
    .where(eq(accounts.isActive, true));

  // Group by type
  const grouped = new Map<string, AccountGroupSummary>();

  for (const account of allAccounts) {
    const existing = grouped.get(account.type);
    if (existing) {
      existing.accounts.push(account);
      existing.totalCents += account.currentBalanceCents;
    } else {
      grouped.set(account.type, {
        type: account.type,
        accounts: [account],
        totalCents: account.currentBalanceCents,
      });
    }
  }

  return Array.from(grouped.values());
}

/** Last N transactions with category name joined */
export async function getRecentTransactions(
  limit: number,
): Promise<RecentTransaction[]> {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amountCents: transactions.amountCents,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);

  return rows;
}

// ─── Snapshot & Analysis Queries ───────────────────────

/** Get the last N monthly snapshots, ordered by month DESC (for trend charts) */
export async function getMonthlySnapshots(months: number) {
  return db
    .select()
    .from(monthlySnapshots)
    .orderBy(desc(monthlySnapshots.month))
    .limit(months);
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  totalCents: number;
  color: string | null;
}

/**
 * Aggregate expense transactions for a given month, grouped by category.
 * Only includes negative amounts (expenses) where excludeFromTotals=false.
 */
export async function getCategorySpend(
  month: string,
): Promise<CategorySpend[]> {
  const firstDay = `${month}-01`;
  const nextMonth = getNextMonthFirstDay(month);

  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      totalCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
      color: categories.color,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        gte(transactions.date, firstDay),
        lt(transactions.date, nextMonth),
        eq(transactions.excludeFromTotals, false),
        lt(transactions.amountCents, 0),
      ),
    )
    .groupBy(transactions.categoryId, categories.name, categories.color);

  // Filter out any null categoryIds (shouldn't happen with innerJoin, but be safe)
  return rows.filter(
    (r): r is CategorySpend => r.categoryId !== null,
  );
}

export interface CategoryBudgetVsActual {
  categoryId: string;
  categoryName: string;
  budgetCents: number;
  actualCents: number;
  color: string | null;
}

/**
 * Compare category budgets to actual spending for a month.
 * Only includes categories that have a budget set.
 * actualCents is the absolute value of expense totals for easier comparison.
 */
export async function getCategoryBudgetVsActual(
  month: string,
): Promise<CategoryBudgetVsActual[]> {
  const firstDay = `${month}-01`;
  const nextMonth = getNextMonthFirstDay(month);

  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      budgetCents: categories.budgetAmountCents,
      actualCents:
        sql<number>`coalesce(abs(sum(case when ${transactions.amountCents} < 0 and ${transactions.excludeFromTotals} = false and ${transactions.date} >= ${firstDay} and ${transactions.date} < ${nextMonth} then ${transactions.amountCents} else 0 end)), 0)`,
      color: categories.color,
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .where(isNotNull(categories.budgetAmountCents))
    .groupBy(
      categories.id,
      categories.name,
      categories.budgetAmountCents,
      categories.color,
    );

  return rows.filter(
    (r): r is CategoryBudgetVsActual => r.budgetCents !== null,
  );
}

// ─── Cashflow Projection Queries ──────────────────────

export interface ProjectedMonthlyCashflow {
  projectedIncomeCents: number;
  projectedExpensesCents: number;
  projectedNetCents: number;
}

/** Get projected monthly cashflow: total income - total recurring expenses */
export async function getProjectedMonthlyCashflow(): Promise<ProjectedMonthlyCashflow> {
  const { getTotalMonthlyIncome } = await import("@/db/queries/income");
  const { getTotalMonthlyRecurring } = await import(
    "@/db/queries/recurring-expenses"
  );

  const [projectedIncomeCents, projectedExpensesCents] = await Promise.all([
    getTotalMonthlyIncome(),
    getTotalMonthlyRecurring(),
  ]);

  return {
    projectedIncomeCents,
    projectedExpensesCents,
    projectedNetCents: projectedIncomeCents - projectedExpensesCents,
  };
}

export interface CashflowProjection {
  month: string;
  projectedIncomeCents: number;
  projectedExpensesCents: number;
  projectedNetCents: number;
}

/** Generate cashflow projections for the next N months */
export async function getCashflowProjections(
  months: number = 6,
): Promise<CashflowProjection[]> {
  const { projectedIncomeCents, projectedExpensesCents, projectedNetCents } =
    await getProjectedMonthlyCashflow();

  const now = new Date();
  const projections: CashflowProjection[] = [];

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    projections.push({
      month,
      projectedIncomeCents,
      projectedExpensesCents,
      projectedNetCents,
    });
  }

  return projections;
}

// ─── Helpers ───────────────────────────────────────────

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

import { db } from "@/db";
import { accounts, transactions, categories, monthlySnapshots } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

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
export async function getRecentTransactions(limit: number): Promise<RecentTransaction[]> {
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

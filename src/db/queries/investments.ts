import { sql, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { accounts, monthlySnapshots } from "@/db/schema";

// ─── Constants ─────────────────────────────────────────

const INVESTMENT_TYPES = ["brokerage", "401k", "hsa"] as const;
export type InvestmentAccountType = (typeof INVESTMENT_TYPES)[number];

// ─── Types ─────────────────────────────────────────────

export interface InvestmentAccount {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currentBalanceCents: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestmentAllocationGroup {
  type: string;
  totalCents: number;
  accounts: {
    id: string;
    name: string;
    institution: string | null;
    currentBalanceCents: number;
  }[];
}

export interface InvestmentBalanceHistoryEntry {
  month: string;
  totalCents: number;
  breakdown: Record<string, number>; // { accountId: balanceCents }
}

// ─── Queries ───────────────────────────────────────────

/** All active investment accounts (brokerage, 401k, hsa) ordered by type then name */
export async function getInvestmentAccounts(): Promise<InvestmentAccount[]> {
  return db
    .select()
    .from(accounts)
    .where(
      sql`${accounts.isActive} = true AND ${accounts.type} IN ('brokerage', '401k', 'hsa')`,
    )
    .orderBy(asc(accounts.type), asc(accounts.name));
}

/** Sum of currentBalanceCents for all active investment accounts */
export async function getTotalInvestmentBalance(): Promise<number> {
  const [result] = await db
    .select({
      total: sql<number>`coalesce(sum(${accounts.currentBalanceCents}), 0)`,
    })
    .from(accounts)
    .where(
      sql`${accounts.isActive} = true AND ${accounts.type} IN ('brokerage', '401k', 'hsa')`,
    );

  return Number(result.total);
}

/** Group investment accounts by type with subtotals */
export async function getInvestmentAllocation(): Promise<
  InvestmentAllocationGroup[]
> {
  const investmentAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      institution: accounts.institution,
      currentBalanceCents: accounts.currentBalanceCents,
    })
    .from(accounts)
    .where(
      sql`${accounts.isActive} = true AND ${accounts.type} IN ('brokerage', '401k', 'hsa')`,
    )
    .orderBy(asc(accounts.type), asc(accounts.name));

  const grouped = new Map<string, InvestmentAllocationGroup>();

  for (const account of investmentAccounts) {
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

/**
 * Pull balance history from monthlySnapshots.accountBalances JSONB,
 * filtering to only investment account balances.
 * Returns chronologically ordered (oldest first) for charting.
 */
export async function getInvestmentBalanceHistory(
  months: number = 12,
): Promise<InvestmentBalanceHistoryEntry[]> {
  // First, get all active investment account IDs so we can filter the JSONB
  const investmentAccounts = await db
    .select({ id: accounts.id, type: accounts.type })
    .from(accounts)
    .where(
      sql`${accounts.isActive} = true AND ${accounts.type} IN ('brokerage', '401k', 'hsa')`,
    );

  const investmentAccountIds = new Set(investmentAccounts.map((a) => a.id));

  if (investmentAccountIds.size === 0) {
    return [];
  }

  // Get the last N monthly snapshots
  const snapshots = await db
    .select({
      month: monthlySnapshots.month,
      accountBalances: monthlySnapshots.accountBalances,
    })
    .from(monthlySnapshots)
    .orderBy(desc(monthlySnapshots.month))
    .limit(months);

  // Process snapshots: extract only investment account balances
  const history: InvestmentBalanceHistoryEntry[] = snapshots
    .reverse() // Chronological order for charting
    .map((snapshot) => {
      const allBalances =
        (snapshot.accountBalances as Record<string, number>) || {};
      const breakdown: Record<string, number> = {};
      let totalCents = 0;

      for (const [accountId, balanceCents] of Object.entries(allBalances)) {
        if (investmentAccountIds.has(accountId)) {
          breakdown[accountId] = balanceCents;
          totalCents += balanceCents;
        }
      }

      return {
        month: snapshot.month,
        totalCents,
        breakdown,
      };
    });

  return history;
}

/**
 * Build balance history grouped by account type for stacked area charts.
 * Returns { month, brokerage, 401k, hsa } for each month.
 */
export async function getInvestmentBalanceHistoryByType(
  months: number = 12,
): Promise<
  Array<{
    month: string;
    brokerage: number;
    "401k": number;
    hsa: number;
    total: number;
  }>
> {
  // Get investment accounts with their types
  const investmentAccounts = await db
    .select({ id: accounts.id, type: accounts.type })
    .from(accounts)
    .where(
      sql`${accounts.isActive} = true AND ${accounts.type} IN ('brokerage', '401k', 'hsa')`,
    );

  const accountTypeMap = new Map(
    investmentAccounts.map((a) => [a.id, a.type]),
  );

  if (accountTypeMap.size === 0) {
    return [];
  }

  const snapshots = await db
    .select({
      month: monthlySnapshots.month,
      accountBalances: monthlySnapshots.accountBalances,
    })
    .from(monthlySnapshots)
    .orderBy(desc(monthlySnapshots.month))
    .limit(months);

  return snapshots.reverse().map((snapshot) => {
    const allBalances =
      (snapshot.accountBalances as Record<string, number>) || {};
    let brokerage = 0;
    let fourOhOneK = 0;
    let hsa = 0;

    for (const [accountId, balanceCents] of Object.entries(allBalances)) {
      const type = accountTypeMap.get(accountId);
      if (type === "brokerage") brokerage += balanceCents;
      else if (type === "401k") fourOhOneK += balanceCents;
      else if (type === "hsa") hsa += balanceCents;
    }

    return {
      month: snapshot.month,
      brokerage,
      "401k": fourOhOneK,
      hsa,
      total: brokerage + fourOhOneK + hsa,
    };
  });
}

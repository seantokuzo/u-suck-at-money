import { eq, and, desc, or } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";

interface GetTransactionsOptions {
  accountId?: string;
  importId?: string;
  limit?: number;
  offset?: number;
}

/** Flexible transaction query with optional filters, category name joined */
export async function getTransactions(options: GetTransactionsOptions = {}) {
  const { accountId, importId, limit = 50, offset = 0 } = options;

  const conditions = [];
  if (accountId) conditions.push(eq(transactions.accountId, accountId));
  if (importId) conditions.push(eq(transactions.importId, importId));

  const whereClause =
    conditions.length > 1
      ? and(...conditions)
      : conditions.length === 1
        ? conditions[0]
        : undefined;

  return db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      date: transactions.date,
      amountCents: transactions.amountCents,
      description: transactions.description,
      merchant: transactions.merchant,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      notes: transactions.notes,
      tags: transactions.tags,
      isSplit: transactions.isSplit,
      importId: transactions.importId,
      excludeFromTotals: transactions.excludeFromTotals,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(whereClause)
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset(offset);
}

interface DuplicateCandidate {
  date: string;
  amountCents: number;
  description: string;
}

/**
 * Given candidate transactions, return which ones already exist in the DB.
 * Uses the (date, amountCents, description) dedup index for efficient matching.
 * Returns matching tuples so the caller can filter them out.
 */
export async function findDuplicates(candidates: DuplicateCandidate[]) {
  if (candidates.length === 0) return [];

  // Build OR conditions for each candidate tuple
  const conditions = candidates.map((c) =>
    and(
      eq(transactions.date, c.date),
      eq(transactions.amountCents, c.amountCents),
      eq(transactions.description, c.description),
    ),
  );

  const existing = await db
    .select({
      date: transactions.date,
      amountCents: transactions.amountCents,
      description: transactions.description,
    })
    .from(transactions)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions));

  return existing;
}

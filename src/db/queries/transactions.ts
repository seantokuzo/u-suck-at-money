import { eq, and, desc, asc, or, ilike, gte, lte, count } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categories, transactionSplits } from "@/db/schema";

export interface GetTransactionsOptions {
  accountId?: string;
  importId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: "date" | "amountCents" | "description";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Build where clause from filter options (shared by getTransactions and getTransactionCount) */
function buildTransactionFilters(options: GetTransactionsOptions) {
  const conditions = [];
  if (options.accountId)
    conditions.push(eq(transactions.accountId, options.accountId));
  if (options.importId)
    conditions.push(eq(transactions.importId, options.importId));
  if (options.categoryId)
    conditions.push(eq(transactions.categoryId, options.categoryId));
  if (options.dateFrom)
    conditions.push(gte(transactions.date, options.dateFrom));
  if (options.dateTo) conditions.push(lte(transactions.date, options.dateTo));
  if (options.search) {
    const pattern = `%${options.search}%`;
    conditions.push(
      or(
        ilike(transactions.description, pattern),
        ilike(transactions.merchant, pattern),
      ),
    );
  }

  return conditions.length > 1
    ? and(...conditions)
    : conditions.length === 1
      ? conditions[0]
      : undefined;
}

/** Map sortBy field name to the actual Drizzle column */
function buildTransactionOrderBy(
  sortBy: GetTransactionsOptions["sortBy"] = "date",
  sortDir: GetTransactionsOptions["sortDir"] = "desc",
) {
  const columnMap = {
    date: transactions.date,
    amountCents: transactions.amountCents,
    description: transactions.description,
  } as const;

  const column = columnMap[sortBy];
  return sortDir === "asc" ? asc(column) : desc(column);
}

/** Flexible transaction query with optional filters, sorting, and category name joined */
export async function getTransactions(options: GetTransactionsOptions = {}) {
  const { limit = 50, offset = 0 } = options;

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
    .where(buildTransactionFilters(options))
    .orderBy(buildTransactionOrderBy(options.sortBy, options.sortDir))
    .limit(limit)
    .offset(offset);
}

/** Total count of transactions matching the given filters (for pagination) */
export async function getTransactionCount(
  options: GetTransactionsOptions = {},
): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(transactions)
    .where(buildTransactionFilters(options));

  return result?.count ?? 0;
}

/** Single transaction by ID with category name joined, or null if not found */
export async function getTransactionById(id: string) {
  const [result] = await db
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
    .where(eq(transactions.id, id));

  return result ?? null;
}

/** All splits for a transaction with category name joined */
export async function getTransactionSplits(transactionId: string) {
  return db
    .select({
      id: transactionSplits.id,
      transactionId: transactionSplits.transactionId,
      categoryId: transactionSplits.categoryId,
      categoryName: categories.name,
      amountCents: transactionSplits.amountCents,
      notes: transactionSplits.notes,
      createdAt: transactionSplits.createdAt,
    })
    .from(transactionSplits)
    .leftJoin(categories, eq(transactionSplits.categoryId, categories.id))
    .where(eq(transactionSplits.transactionId, transactionId));
}

interface DuplicateCandidate {
  date: string;
  amountCents: number;
  description: string;
}

/**
 * Given candidate transactions, return which ones already exist in the DB.
 * Uses the (date, amountCents, description) dedup index for efficient matching.
 * Chunks candidates into batches to avoid oversized SQL queries.
 * Returns matching tuples so the caller can filter them out.
 */
export async function findDuplicates(candidates: DuplicateCandidate[]) {
  if (candidates.length === 0) return [];

  const CHUNK_SIZE = 500;
  const results: { date: string; amountCents: number; description: string }[] =
    [];

  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    const chunk = candidates.slice(i, i + CHUNK_SIZE);

    const conditions = chunk.map((c) =>
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

    results.push(...existing);
  }

  return results;
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { transactions, transactionSplits } from "@/db/schema";
import {
  getTransactions,
  getTransactionCount,
  getTransactionById,
  getTransactionSplits,
  type GetTransactionsOptions,
} from "@/db/queries/transactions";

// ─── Fetch Wrappers (for React Query on client) ────────

/** Fetch transactions with filters — used by client-side React Query */
export async function fetchTransactions(options: GetTransactionsOptions) {
  const [rows, total] = await Promise.all([
    getTransactions(options),
    getTransactionCount(options),
  ]);
  return { transactions: rows, total };
}

/** Fetch a single transaction with its splits */
export async function fetchTransactionDetail(id: string) {
  const [transaction, splits] = await Promise.all([
    getTransactionById(id),
    getTransactionSplits(id),
  ]);
  return { transaction, splits };
}

// ─── Types ──────────────────────────────────────────────

interface UpdateTransactionData {
  id: string;
  categoryId?: string | null;
  description?: string;
  merchant?: string | null;
  notes?: string | null;
  tags?: string[];
  excludeFromTotals?: boolean;
}

interface SplitEntry {
  categoryId: string;
  amountCents: number;
  notes?: string;
}

interface SplitTransactionData {
  transactionId: string;
  splits: SplitEntry[];
}

// ─── Update Transaction ────────────────────────────────

/** Update a transaction's editable fields */
export async function updateTransaction(data: UpdateTransactionData) {
  const { id, ...fields } = data;

  if (!id) {
    throw new Error("Transaction ID is required");
  }

  // Build the update set from provided fields only
  const updateSet: Record<string, unknown> = {};
  if ("categoryId" in fields) updateSet.categoryId = fields.categoryId;
  if ("description" in fields) updateSet.description = fields.description;
  if ("merchant" in fields) updateSet.merchant = fields.merchant;
  if ("notes" in fields) updateSet.notes = fields.notes;
  if ("tags" in fields) updateSet.tags = fields.tags;
  if ("excludeFromTotals" in fields)
    updateSet.excludeFromTotals = fields.excludeFromTotals;

  if (Object.keys(updateSet).length === 0) {
    throw new Error("No fields to update");
  }

  await db.update(transactions).set(updateSet).where(eq(transactions.id, id));

  revalidatePath("/transactions");
}

// ─── Delete Transaction ────────────────────────────────

/** Hard delete a transaction and its splits (cascade) */
export async function deleteTransaction(id: string) {
  if (!id) {
    throw new Error("Transaction ID is required");
  }

  await db.delete(transactions).where(eq(transactions.id, id));

  revalidatePath("/transactions");
}

// ─── Split Transaction ─────────────────────────────────

/**
 * Split a transaction across multiple categories.
 * Creates split records and sets isSplit=true on the parent.
 * Validates that the sum of splits equals the parent amountCents.
 */
export async function splitTransaction(data: SplitTransactionData) {
  const { transactionId, splits } = data;

  if (!transactionId) {
    throw new Error("Transaction ID is required");
  }
  if (!splits || splits.length < 2) {
    throw new Error("At least 2 splits are required");
  }

  // Fetch the parent transaction to validate split sum
  const [parent] = await db
    .select({ amountCents: transactions.amountCents })
    .from(transactions)
    .where(eq(transactions.id, transactionId));

  if (!parent) {
    throw new Error("Transaction not found");
  }

  // Validate: sum of splits must equal parent amount
  const splitSum = splits.reduce((sum, s) => sum + s.amountCents, 0);
  if (splitSum !== parent.amountCents) {
    throw new Error(
      `Split amounts (${splitSum}) must equal transaction amount (${parent.amountCents})`,
    );
  }

  await db.transaction(async (tx) => {
    // Remove any existing splits first
    await tx
      .delete(transactionSplits)
      .where(eq(transactionSplits.transactionId, transactionId));

    // Insert new splits
    await tx.insert(transactionSplits).values(
      splits.map((s) => ({
        transactionId,
        categoryId: s.categoryId,
        amountCents: s.amountCents,
        notes: s.notes ?? null,
      })),
    );

    // Mark parent as split
    await tx
      .update(transactions)
      .set({ isSplit: true })
      .where(eq(transactions.id, transactionId));
  });

  revalidatePath("/transactions");
}

// ─── Unsplit Transaction ───────────────────────────────

/** Remove all splits and reset parent transaction */
export async function unsplitTransaction(transactionId: string) {
  if (!transactionId) {
    throw new Error("Transaction ID is required");
  }

  await db.transaction(async (tx) => {
    // Delete all split records
    await tx
      .delete(transactionSplits)
      .where(eq(transactionSplits.transactionId, transactionId));

    // Reset parent: isSplit=false, clear categoryId since splits had the categories
    await tx
      .update(transactions)
      .set({ isSplit: false, categoryId: null })
      .where(eq(transactions.id, transactionId));
  });

  revalidatePath("/transactions");
}

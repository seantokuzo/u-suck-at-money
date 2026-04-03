"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { imports, transactions, importPatterns } from "@/db/schema";
import { getImportByHash } from "@/db/queries/imports";
import { findDuplicates } from "@/db/queries/transactions";

// ─── Types ──────────────────────────────────────────────

interface ImportTransactionRow {
  date: string; // ISO date string "YYYY-MM-DD"
  amountCents: number; // integer cents
  description: string;
  merchant: string | null;
  categoryId: string | null;
}

interface ImportData {
  fileName: string;
  fileHash: string;
  accountId: string;
  transactions: ImportTransactionRow[];
}

// ─── Import Transactions ────────────────────────────────

export async function importTransactions(data: ImportData) {
  const { fileName, fileHash, accountId, transactions: rows } = data;

  // 1. Check for duplicate file
  const existing = await getImportByHash(fileHash);
  if (existing) {
    return { error: "This file has already been imported" };
  }

  // 2. Create import record with status "pending"
  let importId: string;
  try {
    const [importRecord] = await db
      .insert(imports)
      .values({
        fileName,
        fileHash,
        accountId,
        rowCount: rows.length,
        status: "pending",
      })
      .returning({ id: imports.id });

    importId = importRecord.id;
  } catch (err: any) {
    if (err?.message?.includes("imports_file_hash_uniq")) {
      return { error: "This file has already been imported" };
    }
    return { error: "Failed to create import record" };
  }

  try {
    // 3. Duplicate detection — batch query existing transactions
    const candidates = rows.map((r) => ({
      date: r.date,
      amountCents: r.amountCents,
      description: r.description,
    }));

    const duplicates = await findDuplicates(candidates);

    // Build a Set of dedup keys for O(1) lookup
    const dupKeys = new Set(
      duplicates.map((d) => `${d.date}|${d.amountCents}|${d.description}`),
    );

    // 4. Filter out duplicates
    const newRows = rows.filter(
      (r) => !dupKeys.has(`${r.date}|${r.amountCents}|${r.description}`),
    );
    const duplicateCount = rows.length - newRows.length;

    // Batch insert non-duplicate transactions
    if (newRows.length > 0) {
      await db.insert(transactions).values(
        newRows.map((r) => ({
          accountId,
          date: r.date,
          amountCents: r.amountCents,
          description: r.description,
          merchant: r.merchant,
          categoryId: r.categoryId,
          importId,
        })),
      );
    }

    // 5. Update import record with final counts
    await db
      .update(imports)
      .set({
        importedCount: newRows.length,
        duplicateCount,
        status: "completed",
      })
      .where(eq(imports.id, importId));

    // 6. Revalidate paths
    revalidatePath("/import");
    revalidatePath("/import/history");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    // 7. Return success
    return {
      success: true,
      importId,
      importedCount: newRows.length,
      duplicateCount,
    };
  } catch (err: any) {
    // 8. Mark import as failed on any error
    await db
      .update(imports)
      .set({ status: "failed" })
      .where(eq(imports.id, importId));

    return { error: "Import failed: " + (err?.message ?? "unknown error") };
  }
}

// ─── Delete Import (Rollback) ───────────────────────────

export async function deleteImport(importId: string) {
  if (!importId) return { error: "Import ID is required" };

  try {
    // 1. Delete all transactions linked to this import
    await db
      .delete(transactions)
      .where(eq(transactions.importId, importId));

    // 2. Delete the import record
    await db.delete(imports).where(eq(imports.id, importId));

    // 3. Revalidate paths
    revalidatePath("/import");
    revalidatePath("/import/history");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return { success: true };
  } catch {
    return { error: "Failed to delete import" };
  }
}

// ─── Import Patterns ────────────────────────────────────

export async function createImportPattern(
  pattern: string,
  categoryId: string,
) {
  if (!pattern?.trim()) return { error: "Pattern is required" };
  if (!categoryId) return { error: "Category is required" };

  try {
    const [result] = await db
      .insert(importPatterns)
      .values({
        pattern: pattern.trim(),
        categoryId,
      })
      .onConflictDoUpdate({
        target: importPatterns.pattern,
        set: { categoryId },
      })
      .returning();

    revalidatePath("/import");
    revalidatePath("/import/history");
    return { success: true, pattern: result };
  } catch {
    return { error: "Failed to create import pattern" };
  }
}

export async function deleteImportPattern(id: string) {
  if (!id) return { error: "Pattern ID is required" };

  try {
    await db.delete(importPatterns).where(eq(importPatterns.id, id));

    revalidatePath("/import");
    revalidatePath("/import/history");
    return { success: true };
  } catch {
    return { error: "Failed to delete import pattern" };
  }
}

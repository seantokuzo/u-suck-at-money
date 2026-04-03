"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  transactions,
  transactionSplits,
  recurringExpenses,
  events,
  wishlistItems,
  importPatterns,
} from "@/db/schema";
import { parseCents } from "@/lib/utils";

// ─── Create ─────────────────────────────────────────────

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const parentId = (formData.get("parentId") as string) || null;
  const color = (formData.get("color") as string) || null;
  const icon = (formData.get("icon") as string) || null;
  const budgetRaw = formData.get("budgetAmount") as string;
  const sortOrderRaw = formData.get("sortOrder") as string;

  if (!name?.trim()) {
    return { error: "Name is required" };
  }

  const budgetAmountCents = budgetRaw ? parseCents(budgetRaw) : null;
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw, 10) : 0;

  try {
    await db.insert(categories).values({
      name: name.trim(),
      parentId,
      color,
      icon,
      budgetAmountCents,
      sortOrder,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("categories_name_parent_uniq")) {
      return { error: "A category with that name already exists at this level" };
    }
    return { error: "Failed to create category" };
  }

  revalidatePath("/settings");
  return { success: true };
}

// ─── Update ─────────────────────────────────────────────

export async function updateCategory(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const parentId = (formData.get("parentId") as string) || null;
  const color = (formData.get("color") as string) || null;
  const icon = (formData.get("icon") as string) || null;
  const budgetRaw = formData.get("budgetAmount") as string;
  const sortOrderRaw = formData.get("sortOrder") as string;

  if (!id) return { error: "Category ID is required" };
  if (!name?.trim()) return { error: "Name is required" };

  const budgetAmountCents = budgetRaw ? parseCents(budgetRaw) : null;
  const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw, 10) : 0;

  try {
    await db
      .update(categories)
      .set({
        name: name.trim(),
        parentId,
        color,
        icon,
        budgetAmountCents,
        sortOrder,
      })
      .where(eq(categories.id, id));
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("categories_name_parent_uniq")) {
      return { error: "A category with that name already exists at this level" };
    }
    return { error: "Failed to update category" };
  }

  revalidatePath("/settings");
  return { success: true };
}

// ─── Delete ─────────────────────────────────────────────

export async function deleteCategory(id: string) {
  if (!id) return { error: "Category ID is required" };

  // Check for child categories
  const [hasChildren] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, id))
    .limit(1);

  if (hasChildren) {
    return {
      error: "Cannot delete: this category has subcategories. Delete or move them first.",
    };
  }

  // Check if any transactions reference this category
  const [hasTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.categoryId, id))
    .limit(1);

  if (hasTransaction) {
    return {
      error: "Cannot delete: transactions are using this category. Reassign them first.",
    };
  }

  // Check transaction splits
  const [hasSplit] = await db
    .select({ id: transactionSplits.id })
    .from(transactionSplits)
    .where(eq(transactionSplits.categoryId, id))
    .limit(1);

  if (hasSplit) {
    return {
      error: "Cannot delete: transaction splits reference this category.",
    };
  }

  // Check recurring expenses
  const [hasRecurring] = await db
    .select({ id: recurringExpenses.id })
    .from(recurringExpenses)
    .where(eq(recurringExpenses.categoryId, id))
    .limit(1);

  if (hasRecurring) {
    return {
      error: "Cannot delete: recurring expenses reference this category.",
    };
  }

  // Check events
  const [hasEvent] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.categoryId, id))
    .limit(1);

  if (hasEvent) {
    return {
      error: "Cannot delete: events reference this category.",
    };
  }

  // Check wishlist items
  const [hasWishlist] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(eq(wishlistItems.categoryId, id))
    .limit(1);

  if (hasWishlist) {
    return {
      error: "Cannot delete: wishlist items reference this category.",
    };
  }

  // Check import patterns
  const [hasPattern] = await db
    .select({ id: importPatterns.id })
    .from(importPatterns)
    .where(eq(importPatterns.categoryId, id))
    .limit(1);

  if (hasPattern) {
    return {
      error: "Cannot delete: import patterns reference this category.",
    };
  }

  await db.delete(categories).where(eq(categories.id, id));

  revalidatePath("/settings");
  return { success: true };
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { wishlistItems } from "@/db/schema";
import { parseCents } from "@/lib/utils";
import {
  getWishlistItems,
  getWishlistSummary,
  type GetWishlistItemsOptions,
} from "@/db/queries/wishlist";
import { getCategories } from "@/db/queries/categories";

// ─── Fetch Wrappers (for React Query on client) ──────

/** Fetch wishlist items — used by client-side React Query */
export async function fetchWishlistItems(options?: GetWishlistItemsOptions) {
  return getWishlistItems(options);
}

/** Fetch all data needed for the wishlist page */
export async function fetchWishlistPageData() {
  const [items, summary, categories] = await Promise.all([
    getWishlistItems(),
    getWishlistSummary(),
    getCategories(),
  ]);

  return { items, summary, categories };
}

// ─── Mutations ────────────────────────────────────────

/** Create a new wishlist item */
export async function createWishlistItem(formData: FormData) {
  const name = formData.get("name") as string;
  const estimatedCost = formData.get("estimatedCost") as string;
  const priority = formData.get("priority") as string;
  const categoryId = (formData.get("categoryId") as string) || null;
  const url = (formData.get("url") as string) || null;
  const status = (formData.get("status") as string) || "wishlist";
  const notes = (formData.get("notes") as string) || null;

  if (!name) {
    throw new Error("Name is required");
  }

  const estimatedCostCents = estimatedCost ? parseCents(estimatedCost) : null;

  await db.insert(wishlistItems).values({
    name,
    estimatedCostCents,
    priority: (priority || "p2") as "p1" | "p2" | "p3",
    categoryId,
    url,
    status: status as "wishlist" | "researching" | "ready_to_buy" | "purchased",
    notes,
  });

  revalidatePath("/wishlist");
}

/** Update an existing wishlist item */
export async function updateWishlistItem(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const estimatedCost = formData.get("estimatedCost") as string;
  const actualCost = formData.get("actualCost") as string;
  const priority = formData.get("priority") as string;
  const categoryId = (formData.get("categoryId") as string) || null;
  const url = (formData.get("url") as string) || null;
  const status = formData.get("status") as string;
  const purchaseDate = (formData.get("purchaseDate") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!id || !name) {
    throw new Error("ID and name are required");
  }

  const estimatedCostCents = estimatedCost ? parseCents(estimatedCost) : null;
  const actualCostCents = actualCost ? parseCents(actualCost) : null;

  await db
    .update(wishlistItems)
    .set({
      name,
      estimatedCostCents,
      actualCostCents,
      priority: (priority || "p2") as "p1" | "p2" | "p3",
      categoryId,
      url,
      status: status as
        | "wishlist"
        | "researching"
        | "ready_to_buy"
        | "purchased",
      purchaseDate,
      notes,
    })
    .where(eq(wishlistItems.id, id));

  revalidatePath("/wishlist");
}

/** Delete a wishlist item */
export async function deleteWishlistItem(id: string) {
  if (!id) {
    throw new Error("Wishlist item ID is required");
  }

  await db.delete(wishlistItems).where(eq(wishlistItems.id, id));

  revalidatePath("/wishlist");
}

/** Transition a wishlist item status */
export async function updateWishlistStatus(
  id: string,
  status: "wishlist" | "researching" | "ready_to_buy" | "purchased",
) {
  if (!id || !status) {
    throw new Error("ID and status are required");
  }

  await db
    .update(wishlistItems)
    .set({ status })
    .where(eq(wishlistItems.id, id));

  revalidatePath("/wishlist");
}

/** Mark an item as purchased with optional actual cost */
export async function markPurchased(id: string, actualCostCents?: number) {
  if (!id) {
    throw new Error("Wishlist item ID is required");
  }

  const today = new Date().toISOString().split("T")[0];

  await db
    .update(wishlistItems)
    .set({
      status: "purchased",
      purchaseDate: today,
      ...(actualCostCents !== undefined ? { actualCostCents } : {}),
    })
    .where(eq(wishlistItems.id, id));

  revalidatePath("/wishlist");
}

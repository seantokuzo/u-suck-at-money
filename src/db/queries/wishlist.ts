import { eq, and, ne, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { wishlistItems, categories } from "@/db/schema";

// ─── Types ────────────────────────────────────────────

export type WishlistItem = typeof wishlistItems.$inferSelect;

export type WishlistItemWithCategory = WishlistItem & {
  categoryName: string | null;
  categoryColor: string | null;
};

export interface GetWishlistItemsOptions {
  status?: "wishlist" | "researching" | "ready_to_buy" | "purchased";
  priority?: "p1" | "p2" | "p3";
  categoryId?: string;
}

export interface WishlistSummary {
  totalEstimatedCentsActive: number;
  totalActualCentsPurchased: number;
  countByStatus: {
    wishlist: number;
    researching: number;
    ready_to_buy: number;
    purchased: number;
  };
  countByPriority: {
    p1: number;
    p2: number;
    p3: number;
  };
}

// ─── Priority sort helper ─────────────────────────────

const PRIORITY_ORDER = sql`CASE ${wishlistItems.priority}
  WHEN 'p1' THEN 1
  WHEN 'p2' THEN 2
  WHEN 'p3' THEN 3
END`;

// ─── Queries ──────────────────────────────────────────

/** List wishlist items with optional filters, joined with category */
export async function getWishlistItems(
  options: GetWishlistItemsOptions = {},
): Promise<WishlistItemWithCategory[]> {
  const conditions = [];

  if (options.status) {
    conditions.push(eq(wishlistItems.status, options.status));
  }
  if (options.priority) {
    conditions.push(eq(wishlistItems.priority, options.priority));
  }
  if (options.categoryId) {
    conditions.push(eq(wishlistItems.categoryId, options.categoryId));
  }

  const where =
    conditions.length > 1
      ? and(...conditions)
      : conditions.length === 1
        ? conditions[0]
        : undefined;

  return db
    .select({
      id: wishlistItems.id,
      name: wishlistItems.name,
      estimatedCostCents: wishlistItems.estimatedCostCents,
      actualCostCents: wishlistItems.actualCostCents,
      priority: wishlistItems.priority,
      categoryId: wishlistItems.categoryId,
      url: wishlistItems.url,
      status: wishlistItems.status,
      purchaseDate: wishlistItems.purchaseDate,
      notes: wishlistItems.notes,
      createdAt: wishlistItems.createdAt,
      updatedAt: wishlistItems.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(wishlistItems)
    .leftJoin(categories, eq(wishlistItems.categoryId, categories.id))
    .where(where)
    .orderBy(PRIORITY_ORDER, asc(wishlistItems.name));
}

/** Single wishlist item by ID with category */
export async function getWishlistItemById(
  id: string,
): Promise<WishlistItemWithCategory | null> {
  const [result] = await db
    .select({
      id: wishlistItems.id,
      name: wishlistItems.name,
      estimatedCostCents: wishlistItems.estimatedCostCents,
      actualCostCents: wishlistItems.actualCostCents,
      priority: wishlistItems.priority,
      categoryId: wishlistItems.categoryId,
      url: wishlistItems.url,
      status: wishlistItems.status,
      purchaseDate: wishlistItems.purchaseDate,
      notes: wishlistItems.notes,
      createdAt: wishlistItems.createdAt,
      updatedAt: wishlistItems.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(wishlistItems)
    .leftJoin(categories, eq(wishlistItems.categoryId, categories.id))
    .where(eq(wishlistItems.id, id))
    .limit(1);

  return result ?? null;
}

/** Active items (not purchased) */
export async function getActiveWishlistItems(): Promise<
  WishlistItemWithCategory[]
> {
  return db
    .select({
      id: wishlistItems.id,
      name: wishlistItems.name,
      estimatedCostCents: wishlistItems.estimatedCostCents,
      actualCostCents: wishlistItems.actualCostCents,
      priority: wishlistItems.priority,
      categoryId: wishlistItems.categoryId,
      url: wishlistItems.url,
      status: wishlistItems.status,
      purchaseDate: wishlistItems.purchaseDate,
      notes: wishlistItems.notes,
      createdAt: wishlistItems.createdAt,
      updatedAt: wishlistItems.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(wishlistItems)
    .leftJoin(categories, eq(wishlistItems.categoryId, categories.id))
    .where(ne(wishlistItems.status, "purchased"))
    .orderBy(PRIORITY_ORDER, asc(wishlistItems.name));
}

/** Aggregate summary: totals and counts */
export async function getWishlistSummary(): Promise<WishlistSummary> {
  const all = await db.select().from(wishlistItems);

  const summary: WishlistSummary = {
    totalEstimatedCentsActive: 0,
    totalActualCentsPurchased: 0,
    countByStatus: { wishlist: 0, researching: 0, ready_to_buy: 0, purchased: 0 },
    countByPriority: { p1: 0, p2: 0, p3: 0 },
  };

  for (const item of all) {
    // Count by status
    summary.countByStatus[item.status]++;

    // Count by priority
    summary.countByPriority[item.priority]++;

    // Sum estimated cost for active (non-purchased) items
    if (item.status !== "purchased" && item.estimatedCostCents) {
      summary.totalEstimatedCentsActive += item.estimatedCostCents;
    }

    // Sum actual cost for purchased items
    if (item.status === "purchased" && item.actualCostCents) {
      summary.totalActualCentsPurchased += item.actualCostCents;
    }
  }

  return summary;
}

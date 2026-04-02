import { eq, asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export type Category = typeof categories.$inferSelect;

export interface CategoryGroup {
  parent: Category;
  children: Category[];
}

/** All categories ordered by sortOrder */
export async function getCategories(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder));
}

/**
 * Categories organized as parent/children groups.
 * Parents = categories with no parentId.
 * Children grouped under their respective parent.
 */
export async function getCategoriesGrouped(): Promise<CategoryGroup[]> {
  const all = await getCategories();

  const parents = all.filter((c) => c.parentId === null);
  const childMap = new Map<string, Category[]>();

  for (const c of all) {
    if (c.parentId) {
      const existing = childMap.get(c.parentId) ?? [];
      existing.push(c);
      childMap.set(c.parentId, existing);
    }
  }

  return parents.map((parent) => ({
    parent,
    children: childMap.get(parent.id) ?? [],
  }));
}

/** Single category by ID */
export async function getCategoryById(
  id: string,
): Promise<Category | undefined> {
  const [result] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id));
  return result;
}

/** All parent categories (no parentId) — used for select dropdowns */
export async function getParentCategories(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(isNull(categories.parentId))
    .orderBy(asc(categories.sortOrder));
}

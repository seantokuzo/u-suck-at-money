import { eq } from "drizzle-orm";
import { db } from "@/db";
import { importPatterns, categories } from "@/db/schema";

/** All patterns with their category name joined */
export async function getImportPatterns() {
  return db
    .select({
      id: importPatterns.id,
      pattern: importPatterns.pattern,
      categoryId: importPatterns.categoryId,
      categoryName: categories.name,
      createdAt: importPatterns.createdAt,
    })
    .from(importPatterns)
    .leftJoin(categories, eq(importPatterns.categoryId, categories.id));
}

/** Patterns for a specific category */
export async function getPatternsByCategoryId(categoryId: string) {
  return db
    .select()
    .from(importPatterns)
    .where(eq(importPatterns.categoryId, categoryId));
}

/**
 * Given a transaction description, find the first matching pattern.
 * Fetches all patterns and matches in JS with case-insensitive includes.
 * Returns the pattern row with category info, or null.
 */
export async function matchPattern(description: string) {
  const allPatterns = await getImportPatterns();

  const match = allPatterns.find((p) =>
    description.toLowerCase().includes(p.pattern.toLowerCase()),
  );

  if (!match) return null;

  return {
    patternId: match.id,
    pattern: match.pattern,
    categoryId: match.categoryId,
    categoryName: match.categoryName,
  };
}

/**
 * Batch version: given multiple descriptions, return a Map of
 * description -> matched category info.
 * Fetches all patterns once, then matches in JS using case-insensitive includes.
 */
export async function matchPatternsMultiple(
  descriptions: string[],
): Promise<Map<string, { categoryId: string; categoryName: string | null }>> {
  const allPatterns = await getImportPatterns();
  const result = new Map<
    string,
    { categoryId: string; categoryName: string | null }
  >();

  for (const desc of descriptions) {
    const descLower = desc.toLowerCase();
    const match = allPatterns.find((p) =>
      descLower.includes(p.pattern.toLowerCase()),
    );

    if (match) {
      result.set(desc, {
        categoryId: match.categoryId,
        categoryName: match.categoryName,
      });
    }
  }

  return result;
}

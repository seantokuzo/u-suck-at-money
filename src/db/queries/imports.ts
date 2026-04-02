import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { imports } from "@/db/schema";

/** All imports, most recent first */
export async function getImports() {
  return db
    .select()
    .from(imports)
    .orderBy(desc(imports.importedAt));
}

/** Single import by ID */
export async function getImportById(id: string) {
  const rows = await db
    .select()
    .from(imports)
    .where(eq(imports.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Imports for a specific account, most recent first */
export async function getImportsByAccount(accountId: string) {
  return db
    .select()
    .from(imports)
    .where(eq(imports.accountId, accountId))
    .orderBy(desc(imports.importedAt));
}

/** Check if a file was already imported (dedup by hash) */
export async function getImportByHash(fileHash: string) {
  const rows = await db
    .select()
    .from(imports)
    .where(eq(imports.fileHash, fileHash))
    .limit(1);
  return rows[0] ?? null;
}

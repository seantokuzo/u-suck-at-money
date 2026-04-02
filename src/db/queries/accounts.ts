import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";

/** All active accounts, ordered by type then name */
export async function getAccounts() {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, true))
    .orderBy(asc(accounts.type), asc(accounts.name));
}

/** All accounts including inactive */
export async function getAllAccounts() {
  return db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.type), asc(accounts.name));
}

/** Single account by ID */
export async function getAccountById(id: string) {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Active accounts filtered by type */
export async function getAccountsByType(type: string) {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.type, type as any))
    .orderBy(asc(accounts.name));
}

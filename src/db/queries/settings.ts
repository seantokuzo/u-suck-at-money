import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

/** Get a single setting value by key. Returns undefined if not found. */
export async function getSetting(key: string): Promise<unknown | undefined> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key));
  return row?.value;
}

/** Get all settings as a Record<string, unknown>. */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await db.select({ key: settings.key, value: settings.value }).from(settings);
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

/** Get a setting by key, returning the provided default if not found. */
export async function getSettingWithDefault<T>(
  key: string,
  defaultValue: T,
): Promise<T> {
  const value = await getSetting(key);
  return value !== undefined ? (value as T) : defaultValue;
}

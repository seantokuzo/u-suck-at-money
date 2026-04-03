"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";

// ─── Update Setting ──────────────────────────────────────

/**
 * Upsert a setting by key. Inserts if the key doesn't exist,
 * updates if it does (ON CONFLICT on unique key).
 */
export async function updateSetting(key: string, value: unknown) {
  if (!key?.trim()) {
    return { error: "Setting key is required" };
  }

  try {
    await db
      .insert(settings)
      .values({ key: key.trim(), value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      });
  } catch {
    return { error: `Failed to update setting "${key}"` };
  }

  revalidatePath("/settings");
  return { success: true };
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { parseCents } from "@/lib/utils";

export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const institution = (formData.get("institution") as string) || null;
  const currentBalance = formData.get("currentBalance") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!name || !type) {
    throw new Error("Name and type are required");
  }

  const currentBalanceCents = currentBalance ? parseCents(currentBalance) : 0;

  await db.insert(accounts).values({
    name,
    type: type as "checking" | "savings" | "brokerage" | "401k" | "hsa" | "credit_card" | "other",
    institution,
    currentBalanceCents,
    notes,
  });

  revalidatePath("/accounts");
}

export async function updateAccount(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const institution = (formData.get("institution") as string) || null;
  const currentBalance = formData.get("currentBalance") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!id || !name || !type) {
    throw new Error("ID, name, and type are required");
  }

  const currentBalanceCents = currentBalance ? parseCents(currentBalance) : 0;

  await db
    .update(accounts)
    .set({
      name,
      type: type as "checking" | "savings" | "brokerage" | "401k" | "hsa" | "credit_card" | "other",
      institution,
      currentBalanceCents,
      notes,
    })
    .where(eq(accounts.id, id));

  revalidatePath("/accounts");
}

export async function deleteAccount(id: string) {
  await db
    .update(accounts)
    .set({ isActive: false })
    .where(eq(accounts.id, id));

  revalidatePath("/accounts");
}

export async function reactivateAccount(id: string) {
  await db
    .update(accounts)
    .set({ isActive: true })
    .where(eq(accounts.id, id));

  revalidatePath("/accounts");
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { incomeSources, bonuses } from "@/db/schema";
import { parseCents } from "@/lib/utils";
import {
  getIncomeSources,
  getActiveIncomeSources,
  getTotalMonthlyIncome,
  getUpcomingBonuses,
  getAllBonuses,
  getBonusesByIncomeSource,
} from "@/db/queries/income";

// ─── Fetch Wrappers (for React Query on client) ────────

/** Fetch all income sources — used by client-side React Query */
export async function fetchIncomeSources(options?: {
  isActive?: boolean;
  type?: "salary" | "bonus" | "side_income";
}) {
  return getIncomeSources(options);
}

/** Fetch bonuses for a specific income source */
export async function fetchBonuses(incomeSourceId: string) {
  return getBonusesByIncomeSource(incomeSourceId);
}

/** Fetch all data needed for the income page */
export async function fetchIncomePageData() {
  const [sources, allBonuses, upcoming, monthlyIncome] = await Promise.all([
    getIncomeSources(),
    getAllBonuses(),
    getUpcomingBonuses(),
    getTotalMonthlyIncome(),
  ]);

  const activeSources = sources.filter((s) => s.isActive);

  return {
    sources,
    activeSources,
    allBonuses,
    upcomingBonuses: upcoming,
    totalMonthlyIncomeCents: monthlyIncome,
  };
}

// ─── Income Source Mutations ───────────────────────────

/** Create a new income source */
export async function createIncomeSource(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const paySchedule = (formData.get("paySchedule") as string) || null;
  const grossPerPaycheck = formData.get("grossPerPaycheck") as string;
  const netPerPaycheck = formData.get("netPerPaycheck") as string;
  const employerName = (formData.get("employerName") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!name || !type) {
    throw new Error("Name and type are required");
  }

  const grossPerPaycheckCents = grossPerPaycheck
    ? parseCents(grossPerPaycheck)
    : null;
  const netPerPaycheckCents = netPerPaycheck
    ? parseCents(netPerPaycheck)
    : null;

  await db.insert(incomeSources).values({
    name,
    type: type as "salary" | "bonus" | "side_income",
    paySchedule: paySchedule as "biweekly" | "semi_monthly" | "monthly" | null,
    grossPerPaycheckCents,
    netPerPaycheckCents,
    employerName,
    notes,
  });

  revalidatePath("/income");
}

/** Update an existing income source */
export async function updateIncomeSource(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const paySchedule = (formData.get("paySchedule") as string) || null;
  const grossPerPaycheck = formData.get("grossPerPaycheck") as string;
  const netPerPaycheck = formData.get("netPerPaycheck") as string;
  const employerName = (formData.get("employerName") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!id || !name || !type) {
    throw new Error("ID, name, and type are required");
  }

  const grossPerPaycheckCents = grossPerPaycheck
    ? parseCents(grossPerPaycheck)
    : null;
  const netPerPaycheckCents = netPerPaycheck
    ? parseCents(netPerPaycheck)
    : null;

  await db
    .update(incomeSources)
    .set({
      name,
      type: type as "salary" | "bonus" | "side_income",
      paySchedule: paySchedule as
        | "biweekly"
        | "semi_monthly"
        | "monthly"
        | null,
      grossPerPaycheckCents,
      netPerPaycheckCents,
      employerName,
      notes,
    })
    .where(eq(incomeSources.id, id));

  revalidatePath("/income");
}

/** Delete an income source — cascades bonuses */
export async function deleteIncomeSource(id: string) {
  if (!id) {
    throw new Error("Income source ID is required");
  }

  // Delete associated bonuses first, then the source
  await db.transaction(async (tx) => {
    await tx.delete(bonuses).where(eq(bonuses.incomeSourceId, id));
    await tx.delete(incomeSources).where(eq(incomeSources.id, id));
  });

  revalidatePath("/income");
}

/** Toggle isActive on an income source */
export async function toggleIncomeSourceActive(id: string) {
  if (!id) {
    throw new Error("Income source ID is required");
  }

  // Fetch current state
  const [source] = await db
    .select({ isActive: incomeSources.isActive })
    .from(incomeSources)
    .where(eq(incomeSources.id, id))
    .limit(1);

  if (!source) {
    throw new Error("Income source not found");
  }

  await db
    .update(incomeSources)
    .set({ isActive: !source.isActive })
    .where(eq(incomeSources.id, id));

  revalidatePath("/income");
}

// ─── Bonus Mutations ──────────────────────────────────

/** Create a new bonus */
export async function createBonus(formData: FormData) {
  const name = formData.get("name") as string;
  const incomeSourceId = formData.get("incomeSourceId") as string;
  const expectedDate = (formData.get("expectedDate") as string) || null;
  const expectedAmount = formData.get("expectedAmount") as string;
  const actualDate = (formData.get("actualDate") as string) || null;
  const actualAmount = formData.get("actualAmount") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!name || !incomeSourceId) {
    throw new Error("Name and income source are required");
  }

  const expectedAmountCents = expectedAmount
    ? parseCents(expectedAmount)
    : null;
  const actualAmountCents = actualAmount ? parseCents(actualAmount) : null;

  await db.insert(bonuses).values({
    name,
    incomeSourceId,
    expectedDate,
    expectedAmountCents,
    actualDate,
    actualAmountCents,
    notes,
  });

  revalidatePath("/income");
}

/** Update an existing bonus */
export async function updateBonus(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const incomeSourceId = formData.get("incomeSourceId") as string;
  const expectedDate = (formData.get("expectedDate") as string) || null;
  const expectedAmount = formData.get("expectedAmount") as string;
  const actualDate = (formData.get("actualDate") as string) || null;
  const actualAmount = formData.get("actualAmount") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!id || !name || !incomeSourceId) {
    throw new Error("ID, name, and income source are required");
  }

  const expectedAmountCents = expectedAmount
    ? parseCents(expectedAmount)
    : null;
  const actualAmountCents = actualAmount ? parseCents(actualAmount) : null;

  await db
    .update(bonuses)
    .set({
      name,
      incomeSourceId,
      expectedDate,
      expectedAmountCents,
      actualDate,
      actualAmountCents,
      notes,
    })
    .where(eq(bonuses.id, id));

  revalidatePath("/income");
}

/** Delete a bonus */
export async function deleteBonus(id: string) {
  if (!id) {
    throw new Error("Bonus ID is required");
  }

  await db.delete(bonuses).where(eq(bonuses.id, id));

  revalidatePath("/income");
}

"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { retirementPlans, hsaPlans } from "@/db/schema";
import { parseCents } from "@/lib/utils";
import {
  getRetirementPlans,
  getHsaPlans,
  getRetirementSummary,
} from "@/db/queries/retirement";

// ─── Fetch Wrappers (for React Query on client) ─────────

/** Fetch all retirement data for a given year */
export async function fetchRetirementData(year?: number) {
  const targetYear = year ?? new Date().getFullYear();

  const [plans401k, hsaPlansResult, summary] = await Promise.all([
    getRetirementPlans({ year: targetYear }),
    getHsaPlans({ year: targetYear }),
    getRetirementSummary(targetYear),
  ]);

  return {
    plans401k,
    hsaPlans: hsaPlansResult,
    summary,
    year: targetYear,
  };
}

// ─── 401k Plan Mutations ────────────────────────────────

/** Create a new 401k retirement plan */
export async function createRetirementPlan(formData: FormData) {
  const name = formData.get("name") as string;
  const accountId = (formData.get("accountId") as string) || null;
  const annualLimit = formData.get("annualLimit") as string;
  const ytdContributions = formData.get("ytdContributions") as string;
  const perPaycheckAmount = formData.get("perPaycheckAmount") as string;
  const employerMatchPct = formData.get("employerMatchPct") as string;
  const employerMatchCap = formData.get("employerMatchCap") as string;
  const vestedBalance = formData.get("vestedBalance") as string;
  const totalBalance = formData.get("totalBalance") as string;
  const year = formData.get("year") as string;
  const isActive = formData.get("isActive") as string;

  if (!name || !annualLimit || !year) {
    throw new Error("Name, annual limit, and year are required");
  }

  await db.insert(retirementPlans).values({
    name,
    accountId,
    annualLimitCents: parseCents(annualLimit),
    ytdContributionsCents: ytdContributions ? parseCents(ytdContributions) : 0,
    perPaycheckAmountCents: perPaycheckAmount
      ? parseCents(perPaycheckAmount)
      : null,
    employerMatchPct: employerMatchPct ? parseInt(employerMatchPct, 10) : null,
    employerMatchCap: employerMatchCap ? parseCents(employerMatchCap) : null,
    vestedBalanceCents: vestedBalance ? parseCents(vestedBalance) : null,
    totalBalanceCents: totalBalance ? parseCents(totalBalance) : null,
    year: parseInt(year, 10),
    isActive: isActive !== "false",
  });

  revalidatePath("/retirement");
}

/** Update an existing 401k retirement plan */
export async function updateRetirementPlan(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const accountId = (formData.get("accountId") as string) || null;
  const annualLimit = formData.get("annualLimit") as string;
  const ytdContributions = formData.get("ytdContributions") as string;
  const perPaycheckAmount = formData.get("perPaycheckAmount") as string;
  const employerMatchPct = formData.get("employerMatchPct") as string;
  const employerMatchCap = formData.get("employerMatchCap") as string;
  const vestedBalance = formData.get("vestedBalance") as string;
  const totalBalance = formData.get("totalBalance") as string;
  const year = formData.get("year") as string;
  const isActive = formData.get("isActive") as string;

  if (!id || !name || !annualLimit || !year) {
    throw new Error("ID, name, annual limit, and year are required");
  }

  await db
    .update(retirementPlans)
    .set({
      name,
      accountId,
      annualLimitCents: parseCents(annualLimit),
      ytdContributionsCents: ytdContributions
        ? parseCents(ytdContributions)
        : 0,
      perPaycheckAmountCents: perPaycheckAmount
        ? parseCents(perPaycheckAmount)
        : null,
      employerMatchPct: employerMatchPct ? parseInt(employerMatchPct, 10) : null,
      employerMatchCap: employerMatchCap ? parseCents(employerMatchCap) : null,
      vestedBalanceCents: vestedBalance ? parseCents(vestedBalance) : null,
      totalBalanceCents: totalBalance ? parseCents(totalBalance) : null,
      year: parseInt(year, 10),
      isActive: isActive !== "false",
    })
    .where(eq(retirementPlans.id, id));

  revalidatePath("/retirement");
}

/** Delete a 401k retirement plan */
export async function deleteRetirementPlan(id: string) {
  if (!id) throw new Error("Plan ID is required");

  await db.delete(retirementPlans).where(eq(retirementPlans.id, id));

  revalidatePath("/retirement");
}

/** Add a contribution to a 401k plan (increment ytdContributionsCents) */
export async function addContribution(id: string, amountCents: number) {
  if (!id) throw new Error("Plan ID is required");
  if (amountCents <= 0) throw new Error("Amount must be positive");

  await db
    .update(retirementPlans)
    .set({
      ytdContributionsCents: sql`${retirementPlans.ytdContributionsCents} + ${amountCents}`,
    })
    .where(eq(retirementPlans.id, id));

  revalidatePath("/retirement");
}

// ─── HSA Plan Mutations ─────────────────────────────────

/** Create a new HSA plan */
export async function createHsaPlan(formData: FormData) {
  const name = formData.get("name") as string;
  const accountId = (formData.get("accountId") as string) || null;
  const annualLimit = formData.get("annualLimit") as string;
  const ytdContributions = formData.get("ytdContributions") as string;
  const perPaycheckAmount = formData.get("perPaycheckAmount") as string;
  const cashBalance = formData.get("cashBalance") as string;
  const investmentBalance = formData.get("investmentBalance") as string;
  const year = formData.get("year") as string;
  const isActive = formData.get("isActive") as string;

  if (!name || !annualLimit || !year) {
    throw new Error("Name, annual limit, and year are required");
  }

  await db.insert(hsaPlans).values({
    name,
    accountId,
    annualLimitCents: parseCents(annualLimit),
    ytdContributionsCents: ytdContributions ? parseCents(ytdContributions) : 0,
    perPaycheckAmountCents: perPaycheckAmount
      ? parseCents(perPaycheckAmount)
      : null,
    cashBalanceCents: cashBalance ? parseCents(cashBalance) : null,
    investmentBalanceCents: investmentBalance
      ? parseCents(investmentBalance)
      : null,
    year: parseInt(year, 10),
    isActive: isActive !== "false",
  });

  revalidatePath("/retirement");
}

/** Update an existing HSA plan */
export async function updateHsaPlan(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const accountId = (formData.get("accountId") as string) || null;
  const annualLimit = formData.get("annualLimit") as string;
  const ytdContributions = formData.get("ytdContributions") as string;
  const perPaycheckAmount = formData.get("perPaycheckAmount") as string;
  const cashBalance = formData.get("cashBalance") as string;
  const investmentBalance = formData.get("investmentBalance") as string;
  const year = formData.get("year") as string;
  const isActive = formData.get("isActive") as string;

  if (!id || !name || !annualLimit || !year) {
    throw new Error("ID, name, annual limit, and year are required");
  }

  await db
    .update(hsaPlans)
    .set({
      name,
      accountId,
      annualLimitCents: parseCents(annualLimit),
      ytdContributionsCents: ytdContributions
        ? parseCents(ytdContributions)
        : 0,
      perPaycheckAmountCents: perPaycheckAmount
        ? parseCents(perPaycheckAmount)
        : null,
      cashBalanceCents: cashBalance ? parseCents(cashBalance) : null,
      investmentBalanceCents: investmentBalance
        ? parseCents(investmentBalance)
        : null,
      year: parseInt(year, 10),
      isActive: isActive !== "false",
    })
    .where(eq(hsaPlans.id, id));

  revalidatePath("/retirement");
}

/** Delete an HSA plan */
export async function deleteHsaPlan(id: string) {
  if (!id) throw new Error("HSA plan ID is required");

  await db.delete(hsaPlans).where(eq(hsaPlans.id, id));

  revalidatePath("/retirement");
}

/** Add a contribution to an HSA plan (increment ytdContributionsCents) */
export async function addHsaContribution(id: string, amountCents: number) {
  if (!id) throw new Error("HSA plan ID is required");
  if (amountCents <= 0) throw new Error("Amount must be positive");

  await db
    .update(hsaPlans)
    .set({
      ytdContributionsCents: sql`${hsaPlans.ytdContributionsCents} + ${amountCents}`,
    })
    .where(eq(hsaPlans.id, id));

  revalidatePath("/retirement");
}

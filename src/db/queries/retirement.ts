import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { retirementPlans, hsaPlans, accounts } from "@/db/schema";

// ─── Types ──────────────────────────────────────────────

export interface GetRetirementPlansOptions {
  year?: number;
  isActive?: boolean;
}

export interface GetHsaPlansOptions {
  year?: number;
  isActive?: boolean;
}

export interface RetirementSummary {
  total401kContributionsCents: number;
  total401kLimitCents: number;
  totalHsaContributionsCents: number;
  totalHsaLimitCents: number;
  totalEmployerMatchCents: number;
  totalVestedBalanceCents: number;
  totalBalanceCents: number;
  totalHsaCashCents: number;
  totalHsaInvestmentCents: number;
}

// ─── 401k Plan Queries ──────────────────────────────────

/** List retirement plans with optional filters, join account name */
export async function getRetirementPlans(
  options: GetRetirementPlansOptions = {},
) {
  const conditions = [];

  if (options.year !== undefined) {
    conditions.push(eq(retirementPlans.year, options.year));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(retirementPlans.isActive, options.isActive));
  }

  const where =
    conditions.length > 1
      ? and(...conditions)
      : conditions.length === 1
        ? conditions[0]
        : undefined;

  return db
    .select({
      id: retirementPlans.id,
      name: retirementPlans.name,
      accountId: retirementPlans.accountId,
      annualLimitCents: retirementPlans.annualLimitCents,
      ytdContributionsCents: retirementPlans.ytdContributionsCents,
      perPaycheckAmountCents: retirementPlans.perPaycheckAmountCents,
      employerMatchPct: retirementPlans.employerMatchPct,
      employerMatchCap: retirementPlans.employerMatchCap,
      vestedBalanceCents: retirementPlans.vestedBalanceCents,
      totalBalanceCents: retirementPlans.totalBalanceCents,
      year: retirementPlans.year,
      isActive: retirementPlans.isActive,
      createdAt: retirementPlans.createdAt,
      updatedAt: retirementPlans.updatedAt,
      accountName: accounts.name,
    })
    .from(retirementPlans)
    .leftJoin(accounts, eq(retirementPlans.accountId, accounts.id))
    .where(where)
    .orderBy(asc(retirementPlans.name));
}

/** Single retirement plan by ID with account name */
export async function getRetirementPlanById(id: string) {
  const [plan] = await db
    .select({
      id: retirementPlans.id,
      name: retirementPlans.name,
      accountId: retirementPlans.accountId,
      annualLimitCents: retirementPlans.annualLimitCents,
      ytdContributionsCents: retirementPlans.ytdContributionsCents,
      perPaycheckAmountCents: retirementPlans.perPaycheckAmountCents,
      employerMatchPct: retirementPlans.employerMatchPct,
      employerMatchCap: retirementPlans.employerMatchCap,
      vestedBalanceCents: retirementPlans.vestedBalanceCents,
      totalBalanceCents: retirementPlans.totalBalanceCents,
      year: retirementPlans.year,
      isActive: retirementPlans.isActive,
      createdAt: retirementPlans.createdAt,
      updatedAt: retirementPlans.updatedAt,
      accountName: accounts.name,
    })
    .from(retirementPlans)
    .leftJoin(accounts, eq(retirementPlans.accountId, accounts.id))
    .where(eq(retirementPlans.id, id))
    .limit(1);

  return plan ?? null;
}

/** Active retirement plans for a given year (defaults to current year) */
export async function getActiveRetirementPlans(year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  return getRetirementPlans({ year: targetYear, isActive: true });
}

// ─── HSA Plan Queries ───────────────────────────────────

/** List HSA plans with optional filters, join account name */
export async function getHsaPlans(options: GetHsaPlansOptions = {}) {
  const conditions = [];

  if (options.year !== undefined) {
    conditions.push(eq(hsaPlans.year, options.year));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(hsaPlans.isActive, options.isActive));
  }

  const where =
    conditions.length > 1
      ? and(...conditions)
      : conditions.length === 1
        ? conditions[0]
        : undefined;

  return db
    .select({
      id: hsaPlans.id,
      name: hsaPlans.name,
      accountId: hsaPlans.accountId,
      annualLimitCents: hsaPlans.annualLimitCents,
      ytdContributionsCents: hsaPlans.ytdContributionsCents,
      perPaycheckAmountCents: hsaPlans.perPaycheckAmountCents,
      cashBalanceCents: hsaPlans.cashBalanceCents,
      investmentBalanceCents: hsaPlans.investmentBalanceCents,
      year: hsaPlans.year,
      isActive: hsaPlans.isActive,
      createdAt: hsaPlans.createdAt,
      updatedAt: hsaPlans.updatedAt,
      accountName: accounts.name,
    })
    .from(hsaPlans)
    .leftJoin(accounts, eq(hsaPlans.accountId, accounts.id))
    .where(where)
    .orderBy(asc(hsaPlans.name));
}

/** Single HSA plan by ID with account name */
export async function getHsaPlanById(id: string) {
  const [plan] = await db
    .select({
      id: hsaPlans.id,
      name: hsaPlans.name,
      accountId: hsaPlans.accountId,
      annualLimitCents: hsaPlans.annualLimitCents,
      ytdContributionsCents: hsaPlans.ytdContributionsCents,
      perPaycheckAmountCents: hsaPlans.perPaycheckAmountCents,
      cashBalanceCents: hsaPlans.cashBalanceCents,
      investmentBalanceCents: hsaPlans.investmentBalanceCents,
      year: hsaPlans.year,
      isActive: hsaPlans.isActive,
      createdAt: hsaPlans.createdAt,
      updatedAt: hsaPlans.updatedAt,
      accountName: accounts.name,
    })
    .from(hsaPlans)
    .leftJoin(accounts, eq(hsaPlans.accountId, accounts.id))
    .where(eq(hsaPlans.id, id))
    .limit(1);

  return plan ?? null;
}

/** Active HSA plans for a given year (defaults to current year) */
export async function getActiveHsaPlans(year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  return getHsaPlans({ year: targetYear, isActive: true });
}

// ─── Aggregations ───────────────────────────────────────

/** Aggregate summary across all active 401k + HSA plans for a year */
export async function getRetirementSummary(
  year?: number,
): Promise<RetirementSummary> {
  const targetYear = year ?? new Date().getFullYear();

  const [retirement401k, hsaResults] = await Promise.all([
    getRetirementPlans({ year: targetYear, isActive: true }),
    getHsaPlans({ year: targetYear, isActive: true }),
  ]);

  let total401kContributionsCents = 0;
  let total401kLimitCents = 0;
  let totalEmployerMatchCents = 0;
  let totalVestedBalanceCents = 0;
  let totalBalanceCents = 0;

  for (const plan of retirement401k) {
    total401kContributionsCents += plan.ytdContributionsCents;
    total401kLimitCents += plan.annualLimitCents;
    totalVestedBalanceCents += plan.vestedBalanceCents ?? 0;
    totalBalanceCents += plan.totalBalanceCents ?? 0;

    // Estimate employer match: matchPct% of YTD contributions, capped at employerMatchCap cents
    if (plan.employerMatchPct) {
      const matchAmount = Math.round(
        (plan.ytdContributionsCents * plan.employerMatchPct) / 100,
      );
      const capped =
        plan.employerMatchCap != null
          ? Math.min(matchAmount, plan.employerMatchCap)
          : matchAmount;
      totalEmployerMatchCents += capped;
    }
  }

  let totalHsaContributionsCents = 0;
  let totalHsaLimitCents = 0;
  let totalHsaCashCents = 0;
  let totalHsaInvestmentCents = 0;

  for (const hsa of hsaResults) {
    totalHsaContributionsCents += hsa.ytdContributionsCents;
    totalHsaLimitCents += hsa.annualLimitCents;
    totalHsaCashCents += hsa.cashBalanceCents ?? 0;
    totalHsaInvestmentCents += hsa.investmentBalanceCents ?? 0;
  }

  // Add HSA totals to overall balance
  totalBalanceCents += totalHsaCashCents + totalHsaInvestmentCents;

  return {
    total401kContributionsCents,
    total401kLimitCents,
    totalHsaContributionsCents,
    totalHsaLimitCents,
    totalEmployerMatchCents,
    totalVestedBalanceCents,
    totalBalanceCents,
    totalHsaCashCents,
    totalHsaInvestmentCents,
  };
}

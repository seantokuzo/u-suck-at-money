import { eq, and, asc, desc, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { incomeSources, bonuses } from "@/db/schema";

// ─── Income Source Queries ─────────────────────────────

export interface GetIncomeSourcesOptions {
  isActive?: boolean;
  type?: "salary" | "bonus" | "side_income";
}

/** List all income sources with optional filters */
export async function getIncomeSources(
  options: GetIncomeSourcesOptions = {},
) {
  const conditions = [];

  if (options.isActive !== undefined) {
    conditions.push(eq(incomeSources.isActive, options.isActive));
  }
  if (options.type) {
    conditions.push(eq(incomeSources.type, options.type));
  }

  const where =
    conditions.length > 1
      ? and(...conditions)
      : conditions.length === 1
        ? conditions[0]
        : undefined;

  return db
    .select()
    .from(incomeSources)
    .where(where)
    .orderBy(asc(incomeSources.name));
}

/** Single income source by ID */
export async function getIncomeSourceById(id: string) {
  const [source] = await db
    .select()
    .from(incomeSources)
    .where(eq(incomeSources.id, id))
    .limit(1);

  if (!source) return null;

  const sourceBonuses = await db
    .select()
    .from(bonuses)
    .where(eq(bonuses.incomeSourceId, id))
    .orderBy(desc(bonuses.expectedDate));

  return { ...source, bonuses: sourceBonuses };
}

/** Active income sources only */
export async function getActiveIncomeSources() {
  return getIncomeSources({ isActive: true });
}

// ─── Bonus Queries ─────────────────────────────────────

/** All bonuses for a given income source */
export async function getBonusesByIncomeSource(incomeSourceId: string) {
  return db
    .select()
    .from(bonuses)
    .where(eq(bonuses.incomeSourceId, incomeSourceId))
    .orderBy(desc(bonuses.expectedDate));
}

/** Upcoming bonuses: expectedDate >= today AND no actualDate yet */
export async function getUpcomingBonuses() {
  const today = new Date().toISOString().split("T")[0];

  return db
    .select({
      id: bonuses.id,
      incomeSourceId: bonuses.incomeSourceId,
      name: bonuses.name,
      expectedDate: bonuses.expectedDate,
      expectedAmountCents: bonuses.expectedAmountCents,
      actualDate: bonuses.actualDate,
      actualAmountCents: bonuses.actualAmountCents,
      notes: bonuses.notes,
      createdAt: bonuses.createdAt,
      updatedAt: bonuses.updatedAt,
      sourceName: incomeSources.name,
    })
    .from(bonuses)
    .innerJoin(incomeSources, eq(bonuses.incomeSourceId, incomeSources.id))
    .where(and(gte(bonuses.expectedDate, today), isNull(bonuses.actualDate)))
    .orderBy(asc(bonuses.expectedDate));
}

/** All bonuses with source name joined — for the full list view */
export async function getAllBonuses() {
  return db
    .select({
      id: bonuses.id,
      incomeSourceId: bonuses.incomeSourceId,
      name: bonuses.name,
      expectedDate: bonuses.expectedDate,
      expectedAmountCents: bonuses.expectedAmountCents,
      actualDate: bonuses.actualDate,
      actualAmountCents: bonuses.actualAmountCents,
      notes: bonuses.notes,
      createdAt: bonuses.createdAt,
      updatedAt: bonuses.updatedAt,
      sourceName: incomeSources.name,
    })
    .from(bonuses)
    .innerJoin(incomeSources, eq(bonuses.incomeSourceId, incomeSources.id))
    .orderBy(desc(bonuses.expectedDate));
}

// ─── Aggregations ──────────────────────────────────────

/**
 * Calculate total monthly income from active sources.
 * Normalizes all pay schedules to monthly:
 *   biweekly    = net * 26 / 12
 *   semi_monthly = net * 2
 *   monthly      = net * 1
 */
export async function getTotalMonthlyIncome(): Promise<number> {
  const sources = await getActiveIncomeSources();

  let totalCents = 0;

  for (const source of sources) {
    const net = source.netPerPaycheckCents ?? 0;

    switch (source.paySchedule) {
      case "biweekly":
        totalCents += Math.round((net * 26) / 12);
        break;
      case "semi_monthly":
        totalCents += net * 2;
        break;
      case "monthly":
        totalCents += net;
        break;
      default:
        // If no pay schedule, treat as monthly
        totalCents += net;
        break;
    }
  }

  return totalCents;
}

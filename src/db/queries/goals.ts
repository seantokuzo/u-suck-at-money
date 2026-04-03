import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { goals, accounts } from "@/db/schema";

// ─── Types ────────────────────────────────────────────

export interface GetGoalsOptions {
  status?: "active" | "completed" | "abandoned";
  type?: "savings" | "checking_target" | "debt_payoff" | "investment";
}

export interface GoalsSummary {
  totalTargetCents: number;
  totalCurrentCents: number;
  countByStatus: { active: number; completed: number; abandoned: number };
  countByType: Record<string, number>;
}

// ─── Goal Queries ─────────────────────────────────────

/** List goals with optional filters, join account name */
export async function getGoals(options: GetGoalsOptions = {}) {
  const conditions = [];

  if (options.status) {
    conditions.push(eq(goals.status, options.status));
  }
  if (options.type) {
    conditions.push(eq(goals.type, options.type));
  }

  const where =
    conditions.length > 1
      ? and(...conditions)
      : conditions.length === 1
        ? conditions[0]
        : undefined;

  return db
    .select({
      id: goals.id,
      name: goals.name,
      targetAmountCents: goals.targetAmountCents,
      currentAmountCents: goals.currentAmountCents,
      targetDate: goals.targetDate,
      type: goals.type,
      status: goals.status,
      accountId: goals.accountId,
      notes: goals.notes,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
      accountName: accounts.name,
    })
    .from(goals)
    .leftJoin(accounts, eq(goals.accountId, accounts.id))
    .where(where)
    .orderBy(desc(goals.createdAt));
}

/** Single goal by ID with account name */
export async function getGoalById(id: string) {
  const [goal] = await db
    .select({
      id: goals.id,
      name: goals.name,
      targetAmountCents: goals.targetAmountCents,
      currentAmountCents: goals.currentAmountCents,
      targetDate: goals.targetDate,
      type: goals.type,
      status: goals.status,
      accountId: goals.accountId,
      notes: goals.notes,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
      accountName: accounts.name,
    })
    .from(goals)
    .leftJoin(accounts, eq(goals.accountId, accounts.id))
    .where(eq(goals.id, id))
    .limit(1);

  return goal ?? null;
}

/** Active goals shorthand */
export async function getActiveGoals() {
  return getGoals({ status: "active" });
}

/** Aggregate summary: total target, total current, counts by status & type */
export async function getGoalsSummary(): Promise<GoalsSummary> {
  const allGoals = await db
    .select({
      targetAmountCents: goals.targetAmountCents,
      currentAmountCents: goals.currentAmountCents,
      status: goals.status,
      type: goals.type,
    })
    .from(goals);

  let totalTargetCents = 0;
  let totalCurrentCents = 0;
  const countByStatus = { active: 0, completed: 0, abandoned: 0 };
  const countByType: Record<string, number> = {};

  for (const goal of allGoals) {
    totalTargetCents += goal.targetAmountCents;
    totalCurrentCents += goal.currentAmountCents;
    countByStatus[goal.status] = (countByStatus[goal.status] ?? 0) + 1;
    countByType[goal.type] = (countByType[goal.type] ?? 0) + 1;
  }

  return { totalTargetCents, totalCurrentCents, countByStatus, countByType };
}

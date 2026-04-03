import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/db";
import {
  transactions,
  accounts,
  categories,
  incomeSources,
  recurringExpenses,
  goals,
  events,
  wishlistItems,
  retirementPlans,
  hsaPlans,
} from "@/db/schema";
import { asc } from "drizzle-orm";

// ─── Auth Helper ────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

// ─── GET /api/export?type=transactions|accounts|all ─────

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type");

  if (type === "transactions") {
    return exportTransactions();
  }
  if (type === "accounts") {
    return exportAccounts();
  }
  if (type === "all") {
    return exportAllData();
  }

  return NextResponse.json(
    { error: 'Invalid export type. Use "transactions", "accounts", or "all".' },
    { status: 400 },
  );
}

// ─── Export Transactions CSV ────────────────────────────

async function exportTransactions() {
  const rows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      date: transactions.date,
      amountCents: transactions.amountCents,
      description: transactions.description,
      merchant: transactions.merchant,
      categoryId: transactions.categoryId,
      notes: transactions.notes,
      tags: transactions.tags,
      isSplit: transactions.isSplit,
      excludeFromTotals: transactions.excludeFromTotals,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .orderBy(asc(transactions.date));

  // Flatten tags array to semicolon-separated string for CSV
  const csvRows = rows.map((r) => ({
    ...r,
    tags: Array.isArray(r.tags) ? r.tags.join(";") : "",
    createdAt: r.createdAt?.toISOString() ?? "",
  }));

  const csv = toCsv(csvRows);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${date}.csv"`,
    },
  });
}

// ─── Export Accounts CSV ────────────────────────────────

async function exportAccounts() {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      institution: accounts.institution,
      currentBalanceCents: accounts.currentBalanceCents,
      isActive: accounts.isActive,
      notes: accounts.notes,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .orderBy(asc(accounts.name));

  const csvRows = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt?.toISOString() ?? "",
  }));

  const csv = toCsv(csvRows);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="accounts-${date}.csv"`,
    },
  });
}

// ─── Export All Data JSON ───────────────────────────────

async function exportAllData() {
  const [
    allTransactions,
    allAccounts,
    allCategories,
    allIncomeSources,
    allRecurringExpenses,
    allGoals,
    allEvents,
    allWishlistItems,
    allRetirementPlans,
    allHsaPlans,
  ] = await Promise.all([
    db.select().from(transactions).orderBy(asc(transactions.date)),
    db.select().from(accounts).orderBy(asc(accounts.name)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(incomeSources),
    db.select().from(recurringExpenses),
    db.select().from(goals),
    db.select().from(events),
    db.select().from(wishlistItems),
    db.select().from(retirementPlans),
    db.select().from(hsaPlans),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    version: "0.1.0",
    transactions: allTransactions,
    accounts: allAccounts,
    categories: allCategories,
    incomeSources: allIncomeSources,
    recurringExpenses: allRecurringExpenses,
    goals: allGoals,
    events: allEvents,
    wishlistItems: allWishlistItems,
    retirementPlans: allRetirementPlans,
    hsaPlans: allHsaPlans,
  };

  const json = JSON.stringify(data, null, 2);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="u-suck-at-money-export-${date}.json"`,
    },
  });
}

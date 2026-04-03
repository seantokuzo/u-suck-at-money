"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import {
  getInvestmentAccounts,
  getTotalInvestmentBalance,
  getInvestmentAllocation,
  getInvestmentBalanceHistoryByType,
} from "@/db/queries/investments";

// ─── Fetch Wrapper (for React Query on client) ────────

/** Fetch all data needed for the investments page */
export async function fetchInvestmentData() {
  const [investmentAccounts, totalBalanceCents, allocation, balanceHistory] =
    await Promise.all([
      getInvestmentAccounts(),
      getTotalInvestmentBalance(),
      getInvestmentAllocation(),
      getInvestmentBalanceHistoryByType(12),
    ]);

  return {
    investmentAccounts,
    totalBalanceCents,
    allocation,
    balanceHistory,
  };
}

// ─── Mutations ─────────────────────────────────────────

/** Quick-update an investment account's balance (for manual monthly updates) */
export async function updateInvestmentBalance(
  accountId: string,
  newBalanceCents: number,
) {
  if (!accountId) {
    throw new Error("Account ID is required");
  }

  if (typeof newBalanceCents !== "number" || isNaN(newBalanceCents)) {
    throw new Error("Valid balance amount is required");
  }

  // Verify the account exists and is an investment type
  const [account] = await db
    .select({ id: accounts.id, type: accounts.type })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account) {
    throw new Error("Account not found");
  }

  const investmentTypes = ["brokerage", "401k", "hsa"];
  if (!investmentTypes.includes(account.type)) {
    throw new Error("Account is not an investment account");
  }

  await db
    .update(accounts)
    .set({ currentBalanceCents: newBalanceCents })
    .where(eq(accounts.id, accountId));

  revalidatePath("/investments");
  revalidatePath("/accounts");
  revalidatePath("/");
}

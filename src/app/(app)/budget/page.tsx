import {
  getCategoryBudgetVsActual,
  getMonthlySnapshot,
} from "@/db/queries/dashboard";
import { currentMonth } from "@/lib/utils";
import { BudgetClient } from "./budget-client";

export const metadata = { title: "Budget" };

export default async function BudgetPage() {
  const month = currentMonth();

  const [categories, snapshot] = await Promise.all([
    getCategoryBudgetVsActual(month),
    getMonthlySnapshot(month),
  ]);

  return (
    <BudgetClient
      categories={categories}
      totalIncomeCents={snapshot?.totalIncomeCents ?? 0}
      totalExpensesCents={snapshot?.totalExpensesCents ?? 0}
    />
  );
}

import { getRecurringExpenses, getTotalMonthlyRecurring } from "@/db/queries/recurring-expenses";
import { getCategories } from "@/db/queries/categories";
import { getAccounts } from "@/db/queries/accounts";
import { ExpensesClient } from "./expenses-client";

export const metadata = { title: "Recurring Expenses" };

export default async function ExpensesPage() {
  const [expenses, totalMonthlyCents, allCategories, allAccounts] =
    await Promise.all([
      getRecurringExpenses(),
      getTotalMonthlyRecurring(),
      getCategories(),
      getAccounts(),
    ]);

  // Transform categories and accounts to select options for the client
  const categoryOptions = allCategories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const accountOptions = allAccounts.map((a) => ({
    label: a.name,
    value: a.id,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <ExpensesClient
        initialExpenses={expenses}
        initialTotalMonthlyCents={totalMonthlyCents}
        categories={categoryOptions}
        accounts={accountOptions}
      />
    </div>
  );
}

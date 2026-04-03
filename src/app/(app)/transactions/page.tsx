import { getTransactions, getTransactionCount } from "@/db/queries/transactions";
import { getCategoriesGrouped } from "@/db/queries/categories";
import { getAccounts } from "@/db/queries/accounts";
import { TransactionListClient } from "./transaction-list-client";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const [transactions, total, categoryGroups, accounts] = await Promise.all([
    getTransactions({ limit: 25, offset: 0, sortBy: "date", sortDir: "desc" }),
    getTransactionCount({}),
    getCategoriesGrouped(),
    getAccounts(),
  ]);

  // Flatten category groups into a flat list with "Parent > Child" labels
  const categories = categoryGroups.flatMap((group) => [
    { label: group.parent.name, value: group.parent.id },
    ...group.children.map((child) => ({
      label: `${group.parent.name} > ${child.name}`,
      value: child.id,
    })),
  ]);

  return (
    <TransactionListClient
      initialTransactions={transactions}
      initialTotal={total}
      accounts={accounts}
      categories={categories}
    />
  );
}

import { getAccounts } from "@/db/queries/accounts";
import { formatCents, cn } from "@/lib/utils";
import { AccountsList } from "./accounts-list";

export const metadata = { title: "Accounts" };

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  brokerage: "Brokerage",
  "401k": "401k",
  hsa: "HSA",
  credit_card: "Credit Card",
  other: "Other",
};

const TYPE_ORDER = [
  "checking",
  "savings",
  "credit_card",
  "brokerage",
  "401k",
  "hsa",
  "other",
];

export default async function AccountsPage() {
  const accounts = await getAccounts();

  // Group accounts by type
  const grouped = new Map<string, typeof accounts>();
  for (const account of accounts) {
    const list = grouped.get(account.type) ?? [];
    list.push(account);
    grouped.set(account.type, list);
  }

  // Total balance: all active accounts summed (credit cards are already negative)
  const totalBalanceCents = accounts.reduce(
    (sum, a) => sum + a.currentBalanceCents,
    0,
  );

  const isNegativeTotal = totalBalanceCents < 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Accounts</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {accounts.length} active account{accounts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-400">Net Worth</p>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              isNegativeTotal ? "text-red-400" : "text-green-400",
            )}
          >
            {formatCents(totalBalanceCents)}
          </p>
        </div>
      </div>

      {/* Accounts list — client component for interactivity */}
      <AccountsList
        accounts={accounts}
        grouped={Object.fromEntries(grouped)}
        typeOrder={TYPE_ORDER}
        typeLabels={TYPE_LABELS}
      />
    </div>
  );
}

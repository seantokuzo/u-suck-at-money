import {
  getInvestmentAccounts,
  getTotalInvestmentBalance,
  getInvestmentAllocation,
  getInvestmentBalanceHistoryByType,
} from "@/db/queries/investments";
import { InvestmentsClient } from "./investments-client";

export const metadata = { title: "Investments" };

export default async function InvestmentsPage() {
  const [investmentAccounts, totalBalanceCents, allocation, balanceHistory] =
    await Promise.all([
      getInvestmentAccounts(),
      getTotalInvestmentBalance(),
      getInvestmentAllocation(),
      getInvestmentBalanceHistoryByType(12),
    ]);

  return (
    <InvestmentsClient
      initialData={{
        investmentAccounts,
        totalBalanceCents,
        allocation,
        balanceHistory,
      }}
    />
  );
}

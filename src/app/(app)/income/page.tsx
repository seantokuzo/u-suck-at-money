import {
  getIncomeSources,
  getTotalMonthlyIncome,
  getUpcomingBonuses,
  getAllBonuses,
} from "@/db/queries/income";
import { getCashflowProjections } from "@/db/queries/dashboard";
import { IncomeClient } from "./income-client";

export const metadata = { title: "Income" };

export default async function IncomePage() {
  const [sources, allBonuses, upcomingBonuses, totalMonthlyIncomeCents, projections] =
    await Promise.all([
      getIncomeSources(),
      getAllBonuses(),
      getUpcomingBonuses(),
      getTotalMonthlyIncome(),
      getCashflowProjections(6),
    ]);

  const activeSources = sources.filter((s) => s.isActive);

  return (
    <IncomeClient
      initialData={{
        sources,
        activeSources,
        allBonuses,
        upcomingBonuses,
        totalMonthlyIncomeCents,
      }}
      projections={projections}
    />
  );
}

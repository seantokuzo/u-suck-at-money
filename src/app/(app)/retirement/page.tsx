import {
  getRetirementPlans,
  getHsaPlans,
  getRetirementSummary,
} from "@/db/queries/retirement";
import { getAccounts } from "@/db/queries/accounts";
import { RetirementClient } from "./retirement-client";

export const metadata = { title: "Retirement" };

const CURRENT_YEAR = 2026;

export default async function RetirementPage() {
  const [plans401k, hsaPlansResult, summary, accounts] = await Promise.all([
    getRetirementPlans({ year: CURRENT_YEAR }),
    getHsaPlans({ year: CURRENT_YEAR }),
    getRetirementSummary(CURRENT_YEAR),
    getAccounts(),
  ]);

  return (
    <RetirementClient
      initialData={{
        plans401k,
        hsaPlans: hsaPlansResult,
        summary,
        year: CURRENT_YEAR,
      }}
      accounts={accounts}
    />
  );
}

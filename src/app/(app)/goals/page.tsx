import { getGoals, getGoalsSummary } from "@/db/queries/goals";
import { getAccounts } from "@/db/queries/accounts";
import { GoalsClient } from "./goals-client";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const [goals, summary, accounts] = await Promise.all([
    getGoals(),
    getGoalsSummary(),
    getAccounts(),
  ]);

  const accountOptions = accounts.map((a) => ({
    label: a.name,
    value: a.id,
  }));

  return (
    <GoalsClient
      initialGoals={goals}
      initialSummary={summary}
      accountOptions={accountOptions}
    />
  );
}

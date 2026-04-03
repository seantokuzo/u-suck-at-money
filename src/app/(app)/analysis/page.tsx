import {
  getCategorySpend,
  getMonthlySnapshot,
  getMonthlySnapshots,
} from "@/db/queries/dashboard";
import { currentMonth } from "@/lib/utils";
import { AnalysisClient } from "./analysis-client";

export const metadata = { title: "Analysis" };

export default async function AnalysisPage() {
  const month = currentMonth();

  const [categorySpend, snapshots, snapshot] = await Promise.all([
    getCategorySpend(month),
    getMonthlySnapshots(12),
    getMonthlySnapshot(month),
  ]);

  return (
    <AnalysisClient
      initialCategorySpend={categorySpend}
      initialSnapshot={snapshot}
      snapshots={snapshots}
      initialMonth={month}
    />
  );
}

import { getCategoriesGrouped, getParentCategories } from "@/db/queries/categories";
import { getAllSettings } from "@/db/queries/settings";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [groups, parentCategories, settings] = await Promise.all([
    getCategoriesGrouped(),
    getParentCategories(),
    getAllSettings(),
  ]);

  return (
    <SettingsClient
      groups={groups}
      parentCategories={parentCategories}
      settings={settings}
    />
  );
}

import { getCategoriesGrouped, getParentCategories } from "@/db/queries/categories";
import { CategoryTree } from "@/components/features/category-tree";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [groups, parentCategories] = await Promise.all([
    getCategoriesGrouped(),
    getParentCategories(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <CategoryTree groups={groups} parentCategories={parentCategories} />
    </div>
  );
}

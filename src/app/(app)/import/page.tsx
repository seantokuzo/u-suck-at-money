import { getAccounts } from "@/db/queries/accounts";
import { getImportPatterns } from "@/db/queries/patterns";
import { getCategories } from "@/db/queries/categories";
import { ImportPageClient } from "./import-page-client";

export const metadata = { title: "Import" };

export default async function ImportPage() {
  const [accounts, patterns, allCategories] = await Promise.all([
    getAccounts(),
    getImportPatterns(),
    getCategories(),
  ]);

  // Serialize accounts for the client component
  const accountOptions = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    institution: a.institution,
  }));

  // Serialize patterns for client-side auto-categorization
  const patternList = patterns.map((p) => ({
    pattern: p.pattern,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
  }));

  // Build flat category options for pattern suggestion dropdowns
  // Only include child categories (ones with parentId) for granular matching
  const categoryOptions = allCategories
    .filter((c) => c.parentId !== null)
    .map((c) => ({ label: c.name, value: c.id }));

  return (
    <ImportPageClient
      accounts={accountOptions}
      patterns={patternList}
      categories={categoryOptions}
    />
  );
}

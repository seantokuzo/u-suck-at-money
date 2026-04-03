import { getImports } from "@/db/queries/imports";
import { getImportPatterns } from "@/db/queries/patterns";
import { getAllAccounts } from "@/db/queries/accounts";
import { ImportHistoryClient } from "./import-history-client";

export const metadata = { title: "Import History" };

export default async function ImportHistoryPage() {
  const [imports, patterns, accounts] = await Promise.all([
    getImports(),
    getImportPatterns(),
    getAllAccounts(),
  ]);

  // Build account name lookup
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  // Serialize imports — convert Date objects to ISO strings
  const serializedImports = imports.map((imp) => ({
    id: imp.id,
    fileName: imp.fileName,
    accountId: imp.accountId,
    accountName: accountMap.get(imp.accountId) ?? "Unknown Account",
    rowCount: imp.rowCount,
    importedCount: imp.importedCount,
    duplicateCount: imp.duplicateCount,
    status: imp.status,
    importedAt: imp.importedAt.toISOString(),
  }));

  // Serialize patterns — convert Date objects to ISO strings
  const serializedPatterns = patterns.map((p) => ({
    id: p.id,
    pattern: p.pattern,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <ImportHistoryClient
      imports={serializedImports}
      patterns={serializedPatterns}
    />
  );
}

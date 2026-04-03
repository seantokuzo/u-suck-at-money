"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useImportStore } from "@/stores/import";
import { parseFile } from "@/lib/import/parser";
import { hashFile } from "@/lib/import/hash";
import { detectColumns } from "@/lib/import/column-detection";
import { parseCents } from "@/lib/utils";
import { importTransactions } from "@/actions/imports";
import { FileDropzone } from "@/components/features/import/file-dropzone";
import { ColumnMapper } from "@/components/features/import/column-mapper";
import { TransactionPreview } from "@/components/features/import/transaction-preview";
import { ImportWizard } from "@/components/features/import/import-wizard";
import { PatternSuggestions } from "@/components/features/import/pattern-suggestions";
import { Select, Badge } from "@/components/ui";
import type { ImportWizardStep, PreviewTransaction } from "@/lib/import/types";

// ─── Props ─────────────────────────────────────────────

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
}

interface Pattern {
  pattern: string;
  categoryId: string;
  categoryName: string | null;
}

interface CategoryOption {
  label: string;
  value: string;
}

interface ImportPageClientProps {
  accounts: Account[];
  patterns: Pattern[];
  categories: CategoryOption[];
}

// ─── Date Parsing ──────────────────────────────────────

/** Try multiple date formats and return ISO date string (YYYY-MM-DD) or null */
function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try native Date.parse first (handles YYYY-MM-DD, ISO, etc.)
  const native = new Date(trimmed);
  if (!isNaN(native.getTime()) && trimmed.match(/^\d{4}[/\-]/)) {
    return toISODate(native);
  }

  // Try MM/DD/YYYY, MM-DD-YYYY
  const mdyFull = trimmed.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/,
  );
  if (mdyFull) {
    const [, month, day, year] = mdyFull;
    const d = new Date(+year, +month - 1, +day);
    if (!isNaN(d.getTime())) return toISODate(d);
  }

  // Try M/D/YY, MM/DD/YY
  const mdyShort = trimmed.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/,
  );
  if (mdyShort) {
    const [, month, day, shortYear] = mdyShort;
    // 2-digit year: 00-49 → 2000s, 50-99 → 1900s
    const fullYear = +shortYear < 50 ? 2000 + +shortYear : 1900 + +shortYear;
    const d = new Date(fullYear, +month - 1, +day);
    if (!isNaN(d.getTime())) return toISODate(d);
  }

  // Last resort: let JS parse it
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return toISODate(fallback);

  return null;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Client-side Pattern Matching ──────────────────────

function matchPatternsClient(
  descriptions: string[],
  patterns: Pattern[],
): Map<string, { categoryId: string; categoryName: string | null }> {
  const result = new Map<
    string,
    { categoryId: string; categoryName: string | null }
  >();

  for (const desc of descriptions) {
    const descLower = desc.toLowerCase();
    const match = patterns.find((p) =>
      descLower.includes(p.pattern.toLowerCase()),
    );
    if (match) {
      result.set(desc, {
        categoryId: match.categoryId,
        categoryName: match.categoryName,
      });
    }
  }

  return result;
}

// ─── Component ─────────────────────────────────────────

export function ImportPageClient({ accounts, patterns, categories }: ImportPageClientProps) {
  const store = useImportStore();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const accountOptions = accounts.map((a) => ({
    label: `${a.name}${a.institution ? ` (${a.institution})` : ""}`,
    value: a.id,
  }));

  const importCount =
    store.previewTransactions.length - store.excludedRows.size;

  // ─── File Drop Handler ─────────────────────────────

  const handleFileDrop = useCallback(
    async (file: File) => {
      setParseError(null);
      try {
        const [parsed, hash] = await Promise.all([
          parseFile(file),
          hashFile(file),
        ]);

        const detected = detectColumns(parsed.headers, parsed.rows);
        store.setFile(file, parsed, hash);
        store.setColumnMapping(detected);
      } catch (err: unknown) {
        setParseError(err instanceof Error ? err.message : "Failed to parse file");
      }
    },
    [store],
  );

  // ─── Build Preview Transactions ────────────────────

  const buildPreviewTransactions = useCallback((): PreviewTransaction[] => {
    const { parsedFile, columnMapping } = store;
    if (!parsedFile || !columnMapping) return [];

    const { rows } = parsedFile;
    const { date: dateCol, amount: amountCol, description: descCol } =
      columnMapping;
    const merchantCol = columnMapping.merchant;

    // Extract descriptions for batch pattern matching
    const descriptions = rows.map((row) => row[descCol] ?? "");
    const categoryMap = matchPatternsClient(descriptions, patterns);

    return rows
      .map((row, idx): PreviewTransaction | null => {
        const rawDate = row[dateCol] ?? "";
        const rawAmount = row[amountCol] ?? "";
        const description = (row[descCol] ?? "").trim();

        const date = parseDate(rawDate);
        if (!date) return null; // Skip rows with unparseable dates

        const amountCents = parseCents(rawAmount);
        if (isNaN(amountCents)) return null; // Skip rows with unparseable amounts

        const merchant =
          merchantCol !== undefined && merchantCol !== -1
            ? (row[merchantCol] ?? "").trim() || null
            : null;

        const catMatch = categoryMap.get(row[descCol] ?? "");

        return {
          date,
          amountCents,
          description,
          merchant,
          categoryId: catMatch?.categoryId ?? null,
          categoryName: catMatch?.categoryName ?? null,
          isDuplicate: false,
          rowIndex: idx,
        };
      })
      .filter((t): t is PreviewTransaction => t !== null);
  }, [store, patterns]);

  // ─── Step Change Handler ───────────────────────────

  const handleStepChange = useCallback(
    (nextStep: ImportWizardStep) => {
      setError(null);

      // Going backward is always allowed
      const stepOrder: ImportWizardStep[] = [
        "upload",
        "map",
        "preview",
        "importing",
        "complete",
      ];
      const currentIdx = stepOrder.indexOf(store.step);
      const nextIdx = stepOrder.indexOf(nextStep);

      if (nextIdx < currentIdx) {
        store.setStep(nextStep);
        return;
      }

      // ── Validate: upload → map ──
      if (store.step === "upload" && nextStep === "map") {
        if (!store.parsedFile) {
          setError("Please upload a file first");
          return;
        }
        if (!store.accountId) {
          setError("Please select an account");
          return;
        }
        store.setStep("map");
        return;
      }

      // ── Validate: map → preview ──
      if (store.step === "map" && nextStep === "preview") {
        const mapping = store.columnMapping;
        if (!mapping || mapping.date === -1 || mapping.amount === -1 || mapping.description === -1) {
          setError("Please map all required columns (Date, Amount, Description)");
          return;
        }

        // Build preview transactions
        const txns = buildPreviewTransactions();
        if (txns.length === 0) {
          setError("No valid transactions found. Check your column mappings and date/amount formats.");
          return;
        }

        store.setPreviewTransactions(txns);
        store.setStep("preview");
        return;
      }

      // ── Execute: preview → importing ──
      if (store.step === "preview" && nextStep === "importing") {
        const nonExcluded = store.previewTransactions.filter(
          (t) => !store.excludedRows.has(t.rowIndex),
        );

        if (nonExcluded.length === 0) {
          setError("No transactions selected for import");
          return;
        }

        store.setStep("importing");

        startTransition(async () => {
          const result = await importTransactions({
            fileName: store.fileName,
            fileHash: store.fileHash,
            accountId: store.accountId,
            transactions: nonExcluded.map((t) => ({
              date: t.date,
              amountCents: t.amountCents,
              description: t.description,
              merchant: t.merchant,
              categoryId: t.categoryId,
            })),
          });

          if (result.error) {
            setError(result.error);
            store.setStep("preview");
            return;
          }

          if (result.success) {
            store.setImportResult(
              result.importedCount ?? 0,
              result.duplicateCount ?? 0,
            );
            store.setStep("complete");
          }
        });
        return;
      }

      // ── Complete → reset ──
      if (store.step === "complete" && nextStep === "upload") {
        store.reset();
        setError(null);
        return;
      }
    },
    [store, buildPreviewTransactions, startTransition],
  );

  // ─── Step Content ──────────────────────────────────

  const renderStepContent = () => {
    switch (store.step) {
      case "upload":
        return (
          <div className="flex flex-col gap-6">
            <FileDropzone
              onFileDrop={handleFileDrop}
              fileName={store.fileName || undefined}
              disabled={isPending}
            />
            {parseError && (
              <Badge variant="danger" className="self-start">
                {parseError}
              </Badge>
            )}
            <Select
              label="Account *"
              options={accountOptions}
              placeholder="Select an account..."
              value={store.accountId}
              onChange={(e) => store.setAccountId(e.target.value)}
              aria-label="Select account for import"
            />
            {accounts.length === 0 && (
              <p className="text-sm text-zinc-500">
                No accounts found. Create an account first before importing
                transactions.
              </p>
            )}
          </div>
        );

      case "map":
        return store.parsedFile && store.columnMapping ? (
          <ColumnMapper
            headers={store.parsedFile.headers}
            sampleRows={store.parsedFile.rows.slice(0, 5)}
            mapping={store.columnMapping}
            onMappingChange={store.setColumnMapping}
          />
        ) : null;

      case "preview":
        return (
          <TransactionPreview
            transactions={store.previewTransactions}
            excludedRows={store.excludedRows}
            onToggleExclude={store.toggleExcludeRow}
          />
        );

      default:
        return null;
    }
  };

  // ─── Render ────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Transactions</h1>
          <p className="mt-1 text-zinc-400">
            Upload a bank statement to import transactions
          </p>
        </div>
        <Link
          href="/import/history"
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          View Import History &rarr;
        </Link>
      </div>

      <div className="mt-6">
        <ImportWizard
          step={store.step}
          onStepChange={handleStepChange}
          importCount={importCount}
          importedCount={store.importedCount}
        >
          {renderStepContent()}
        </ImportWizard>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        {store.step === "complete" && store.duplicateCount > 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            {store.duplicateCount} duplicate
            {store.duplicateCount !== 1 ? "s" : ""} skipped during import.
          </p>
        )}

        {store.step === "complete" && store.previewTransactions.length > 0 && (
          <div className="mt-6">
            <PatternSuggestions
              transactions={store.previewTransactions}
              categories={categories}
            />
          </div>
        )}
      </div>
    </div>
  );
}

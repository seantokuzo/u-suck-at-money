"use client";

import { useMemo } from "react";
import { cn, formatCents, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui";
import type { PreviewTransaction } from "@/lib/import/types";

interface TransactionPreviewProps {
  transactions: PreviewTransaction[];
  excludedRows: Set<number>;
  onToggleExclude: (rowIndex: number) => void;
}

export function TransactionPreview({
  transactions,
  excludedRows,
  onToggleExclude,
}: TransactionPreviewProps) {
  const summary = useMemo(() => {
    const duplicates = transactions.filter((t) => t.isDuplicate).length;
    const excluded = excludedRows.size;
    const toImport = transactions.length - excluded;
    return { toImport, duplicates, excluded };
  }, [transactions, excludedRows]);

  return (
    <div className="flex flex-col gap-4">
      {/* Scrollable table container */}
      <div className="overflow-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-2 text-center">
                <span className="sr-only">Include</span>
              </th>
              <th className="px-3 py-2 font-medium text-zinc-400">
                Date
              </th>
              <th className="px-3 py-2 font-medium text-zinc-400">
                Description
              </th>
              <th className="px-3 py-2 font-medium text-zinc-400">
                Merchant
              </th>
              <th className="px-3 py-2 text-right font-medium text-zinc-400">
                Amount
              </th>
              <th className="px-3 py-2 font-medium text-zinc-400">
                Category
              </th>
              <th className="px-3 py-2 font-medium text-zinc-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => {
              const isExcluded = excludedRows.has(txn.rowIndex);
              const isIncome = txn.amountCents > 0;

              return (
                <tr
                  key={txn.rowIndex}
                  className={cn(
                    "border-b border-zinc-800/50 last:border-b-0 transition-colors",
                    isExcluded && "opacity-50",
                  )}
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => onToggleExclude(txn.rowIndex)}
                      aria-label={`Include transaction: ${txn.description}`}
                      className="h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-800 text-zinc-100 accent-zinc-400"
                    />
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-zinc-100",
                      isExcluded && "line-through",
                    )}
                  >
                    {formatDate(txn.date)}
                  </td>
                  <td
                    className={cn(
                      "max-w-[200px] truncate px-3 py-2 text-zinc-100",
                      isExcluded && "line-through",
                    )}
                    title={txn.description}
                  >
                    {txn.description}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-zinc-400",
                      isExcluded && "line-through",
                    )}
                  >
                    {txn.merchant ?? "—"}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-right font-mono",
                      isExcluded
                        ? "text-zinc-500 line-through"
                        : isIncome
                          ? "text-green-400"
                          : "text-red-400",
                    )}
                  >
                    {formatCents(txn.amountCents)}
                  </td>
                  <td className="px-3 py-2">
                    {txn.categoryName ? (
                      <span className="text-zinc-100">
                        {txn.categoryName}
                      </span>
                    ) : (
                      <Badge variant="default">Uncategorized</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {txn.isDuplicate && (
                      <Badge variant="warning">Duplicate</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
        <span>
          <span className="font-medium text-zinc-100">
            {summary.toImport}
          </span>{" "}
          transactions to import
        </span>
        {summary.duplicates > 0 && (
          <span>
            <span className="font-medium text-yellow-400">
              {summary.duplicates}
            </span>{" "}
            duplicates
          </span>
        )}
        {summary.excluded > 0 && (
          <span>
            <span className="font-medium text-zinc-400">
              {summary.excluded}
            </span>{" "}
            excluded
          </span>
        )}
      </div>
    </div>
  );
}

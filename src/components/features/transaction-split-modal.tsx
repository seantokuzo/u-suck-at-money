"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTransactionDetail,
  splitTransaction,
  unsplitTransaction,
} from "@/actions/transactions";
import { Modal, Button, Input, Select } from "@/components/ui";
import { formatCents, parseCents, cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface CategoryOption {
  label: string;
  value: string;
}

interface SplitRow {
  categoryId: string;
  amount: string; // dollar string for input
  notes: string;
}

interface TransactionSplitModalProps {
  transactionId: string | null;
  onClose: () => void;
  categories: CategoryOption[];
}

// ─── Helpers ────────────────────────────────────────────

function emptyRow(): SplitRow {
  return { categoryId: "", amount: "", notes: "" };
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ─── Component ──────────────────────────────────────────

export function TransactionSplitModal({
  transactionId,
  onClose,
  categories,
}: TransactionSplitModalProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<SplitRow[]>([emptyRow(), emptyRow()]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["transaction-detail", transactionId],
    queryFn: () => fetchTransactionDetail(transactionId!),
    enabled: !!transactionId,
  });

  // Load existing splits into rows when data arrives
  useEffect(() => {
    if (!data) return;
    if (data.splits && data.splits.length >= 2) {
      setRows(
        data.splits.map((s) => ({
          categoryId: s.categoryId,
          amount: centsToDisplay(s.amountCents),
          notes: s.notes ?? "",
        })),
      );
    } else {
      setRows([emptyRow(), emptyRow()]);
    }
  }, [data]);

  const splitMutation = useMutation({
    mutationFn: splitTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["transaction-detail", transactionId],
      });
      onClose();
    },
  });

  const unsplitMutation = useMutation({
    mutationFn: unsplitTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({
        queryKey: ["transaction-detail", transactionId],
      });
      onClose();
    },
  });

  const txn = data?.transaction;
  const isAlreadySplit = txn?.isSplit ?? false;

  // Calculate totals
  const splitSumCents = rows.reduce((sum, r) => {
    const cents = r.amount ? parseCents(r.amount) : 0;
    return sum + (isNaN(cents) ? 0 : cents);
  }, 0);
  const parentAmountCents = txn?.amountCents ?? 0;
  const remainingCents = parentAmountCents - splitSumCents;

  const updateRow = useCallback(
    (index: number, field: keyof SplitRow, value: string) => {
      setRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
      );
      setValidationError(null);
    },
    [],
  );

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 2) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!transactionId) return;
    setValidationError(null);

    // Validate: all rows need a category and amount
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].categoryId) {
        setValidationError(`Split ${i + 1}: category is required.`);
        return;
      }
      if (!rows[i].amount || isNaN(parseCents(rows[i].amount))) {
        setValidationError(`Split ${i + 1}: valid amount is required.`);
        return;
      }
    }

    // Validate: sum must equal parent
    if (remainingCents !== 0) {
      setValidationError(
        `Split amounts must equal ${formatCents(parentAmountCents)}. Remaining: ${formatCents(remainingCents)}`,
      );
      return;
    }

    splitMutation.mutate({
      transactionId,
      splits: rows.map((r) => ({
        categoryId: r.categoryId,
        amountCents: parseCents(r.amount),
        notes: r.notes || undefined,
      })),
    });
  };

  const handleUnsplit = () => {
    if (!transactionId) return;
    unsplitMutation.mutate(transactionId);
  };

  const handleClose = () => {
    setValidationError(null);
    setRows([emptyRow(), emptyRow()]);
    onClose();
  };

  const isPending = splitMutation.isPending || unsplitMutation.isPending;

  return (
    <Modal
      open={!!transactionId}
      onClose={handleClose}
      title="Split Transaction"
      className="max-w-2xl"
    >
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      )}

      {txn && (
        <div className="space-y-4">
          {/* Parent transaction info */}
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">{txn.description}</span>
              <span
                className={cn(
                  "text-lg font-bold",
                  txn.amountCents >= 0 ? "text-green-400" : "text-red-400",
                )}
              >
                {formatCents(txn.amountCents)}
              </span>
            </div>
          </div>

          {/* Split rows */}
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label={idx === 0 ? "Category" : undefined}
                    options={categories}
                    placeholder="Select..."
                    value={row.categoryId}
                    onChange={(e) =>
                      updateRow(idx, "categoryId", e.target.value)
                    }
                  />
                </div>
                <div className="w-[120px]">
                  <Input
                    label={idx === 0 ? "Amount" : undefined}
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) => updateRow(idx, "amount", e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label={idx === 0 ? "Notes" : undefined}
                    placeholder="Optional"
                    value={row.notes}
                    onChange={(e) => updateRow(idx, "notes", e.target.value)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length <= 2}
                  aria-label="Remove split row"
                >
                  &times;
                </Button>
              </div>
            ))}
          </div>

          {/* Add row */}
          <Button variant="ghost" size="sm" onClick={addRow}>
            + Add split
          </Button>

          {/* Remaining amount */}
          <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
            <span className="text-sm text-zinc-400">Remaining</span>
            <span
              className={cn(
                "text-sm font-medium",
                remainingCents === 0
                  ? "text-green-400"
                  : "text-yellow-400",
              )}
            >
              {formatCents(remainingCents)}
            </span>
          </div>

          {/* Errors */}
          {validationError && (
            <p className="text-xs text-red-400">{validationError}</p>
          )}
          {(splitMutation.error || unsplitMutation.error) && (
            <p className="text-xs text-red-400">
              Operation failed. Please try again.
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {isAlreadySplit && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleUnsplit}
                  loading={unsplitMutation.isPending}
                  disabled={isPending}
                >
                  Remove Split
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                loading={splitMutation.isPending}
                disabled={isPending}
              >
                {isAlreadySplit ? "Update Split" : "Split Transaction"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

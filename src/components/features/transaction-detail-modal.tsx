"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTransactionDetail } from "@/actions/transactions";
import { updateTransaction } from "@/actions/transactions";
import { Modal, Button, Input, Select, Badge } from "@/components/ui";
import { formatCents, formatDate, cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface CategoryOption {
  label: string;
  value: string;
}

interface TransactionDetailModalProps {
  transactionId: string | null;
  onClose: () => void;
  categories: CategoryOption[];
}

interface EditFields {
  description: string;
  merchant: string;
  notes: string;
  categoryId: string;
}

// ─── Component ──────────────────────────────────────────

export function TransactionDetailModal({
  transactionId,
  onClose,
  categories,
}: TransactionDetailModalProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({
    description: "",
    merchant: "",
    notes: "",
    categoryId: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["transaction-detail", transactionId],
    queryFn: () => fetchTransactionDetail(transactionId!),
    enabled: !!transactionId,
  });

  const mutation = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transaction-detail", transactionId],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setIsEditing(false);
    },
  });

  const startEditing = useCallback(() => {
    if (!data?.transaction) return;
    const txn = data.transaction;
    setEditFields({
      description: txn.description,
      merchant: txn.merchant ?? "",
      notes: txn.notes ?? "",
      categoryId: txn.categoryId ?? "",
    });
    setIsEditing(true);
  }, [data]);

  const handleSave = () => {
    if (!transactionId) return;
    mutation.mutate({
      id: transactionId,
      description: editFields.description,
      merchant: editFields.merchant || null,
      notes: editFields.notes || null,
      categoryId: editFields.categoryId || null,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const txn = data?.transaction;
  const splits = data?.splits ?? [];

  return (
    <Modal
      open={!!transactionId}
      onClose={handleClose}
      title="Transaction Details"
      className="max-w-xl"
    >
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400">
          Failed to load transaction details.
        </div>
      )}

      {txn && !isEditing && (
        <div className="space-y-4">
          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Amount</span>
            <span
              className={cn(
                "text-xl font-bold",
                txn.amountCents >= 0 ? "text-green-400" : "text-red-400",
              )}
            >
              {formatCents(txn.amountCents)}
            </span>
          </div>

          {/* Fields */}
          <DetailRow label="Date" value={formatDate(txn.date)} />
          <DetailRow label="Description" value={txn.description} />
          <DetailRow label="Merchant" value={txn.merchant ?? "--"} />
          <DetailRow
            label="Category"
            value={
              txn.isSplit ? (
                <Badge variant="info">Split</Badge>
              ) : (
                txn.categoryName ?? "Uncategorized"
              )
            }
          />
          <DetailRow label="Notes" value={txn.notes ?? "--"} />

          {/* Tags */}
          {txn.tags && txn.tags.length > 0 && (
            <div className="flex items-start justify-between">
              <span className="text-sm text-zinc-400">Tags</span>
              <div className="flex flex-wrap gap-1">
                {txn.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Splits */}
          {txn.isSplit && splits.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-zinc-300">
                Split Breakdown
              </h4>
              <div className="space-y-1 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                {splits.map((split) => (
                  <div
                    key={split.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-300">
                      {split.categoryName ?? "Uncategorized"}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        split.amountCents >= 0
                          ? "text-green-400"
                          : "text-red-400",
                      )}
                    >
                      {formatCents(split.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
            <Button variant="secondary" size="sm" onClick={startEditing}>
              Edit
            </Button>
          </div>
        </div>
      )}

      {txn && isEditing && (
        <div className="space-y-4">
          <Input
            label="Description"
            value={editFields.description}
            onChange={(e) =>
              setEditFields((f) => ({ ...f, description: e.target.value }))
            }
          />
          <Input
            label="Merchant"
            value={editFields.merchant}
            onChange={(e) =>
              setEditFields((f) => ({ ...f, merchant: e.target.value }))
            }
          />
          <Select
            label="Category"
            options={categories}
            placeholder="Select category..."
            value={editFields.categoryId}
            onChange={(e) =>
              setEditFields((f) => ({ ...f, categoryId: e.target.value }))
            }
          />
          <Input
            label="Notes"
            value={editFields.notes}
            onChange={(e) =>
              setEditFields((f) => ({ ...f, notes: e.target.value }))
            }
          />

          {mutation.error && (
            <p className="text-xs text-red-400">
              Failed to save changes. Please try again.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={mutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Detail Row ─────────────────────────────────────────

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-right text-sm text-zinc-100">{value}</span>
    </div>
  );
}

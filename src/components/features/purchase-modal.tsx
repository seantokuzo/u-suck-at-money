"use client";

import { useState, useTransition } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { markPurchased } from "@/actions/wishlist";
import { parseCents } from "@/lib/utils";

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    estimatedCostCents: number | null;
  } | null;
}

export function PurchaseModal({ open, onClose, item }: PurchaseModalProps) {
  const [isPending, startTransition] = useTransition();
  const [actualCost, setActualCost] = useState("");

  // Pre-fill with estimated cost when item changes
  const defaultCost = item?.estimatedCostCents
    ? (item.estimatedCostCents / 100).toFixed(2)
    : "";

  const handleConfirm = () => {
    if (!item) return;

    startTransition(async () => {
      const costValue = actualCost || defaultCost;
      const cents = costValue ? parseCents(costValue) : undefined;
      await markPurchased(item.id, cents);
      setActualCost("");
      onClose();
    });
  };

  const handleClose = () => {
    setActualCost("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Mark as Purchased"
      className="max-w-sm"
    >
      {item && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-400">
            Mark <strong className="text-zinc-100">{item.name}</strong> as
            purchased?
          </p>

          <Input
            label="Actual Cost"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={actualCost || defaultCost}
            onChange={(e) => setActualCost(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} loading={isPending}>
              Confirm Purchase
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

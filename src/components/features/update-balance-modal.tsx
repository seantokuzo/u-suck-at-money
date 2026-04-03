"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCents, parseCents } from "@/lib/utils";

interface UpdateBalanceModalProps {
  open: boolean;
  onClose: () => void;
  accountName: string;
  currentBalanceCents: number;
  onSave: (newBalanceCents: number) => void;
  isSaving: boolean;
}

export function UpdateBalanceModal({
  open,
  onClose,
  accountName,
  currentBalanceCents,
  onSave,
  isSaving,
}: UpdateBalanceModalProps) {
  const [value, setValue] = useState(
    (currentBalanceCents / 100).toFixed(2),
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);

    if (isNaN(parsed)) {
      setError("Please enter a valid dollar amount");
      return;
    }

    setError(null);
    onSave(parseCents(parsed));
  };

  const handleClose = () => {
    setError(null);
    setValue((currentBalanceCents / 100).toFixed(2));
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Update Balance">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-zinc-400">
            <span className="font-medium text-zinc-200">{accountName}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Current balance:{" "}
            <span className="font-medium tabular-nums text-zinc-300">
              {formatCents(currentBalanceCents)}
            </span>
          </p>
        </div>

        <Input
          label="New Balance"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          error={error ?? undefined}
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} loading={isSaving}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { useRef, useTransition } from "react";
import { Button, Input, Select, Modal } from "@/components/ui";
import { createBonus, updateBonus } from "@/actions/income";

interface IncomeSourceOption {
  label: string;
  value: string;
}

interface Bonus {
  id: string;
  incomeSourceId: string;
  name: string;
  expectedDate: string | null;
  expectedAmountCents: number | null;
  actualDate: string | null;
  actualAmountCents: number | null;
  notes: string | null;
}

interface BonusFormProps {
  open: boolean;
  onClose: () => void;
  incomeSources: IncomeSourceOption[];
  bonus?: Bonus;
}

export function BonusForm({
  open,
  onClose,
  incomeSources,
  bonus,
}: BonusFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!bonus;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateBonus(formData);
      } else {
        await createBonus(formData);
      }
      formRef.current?.reset();
      onClose();
    });
  };

  const defaultExpected = bonus?.expectedAmountCents
    ? (bonus.expectedAmountCents / 100).toFixed(2)
    : "";
  const defaultActual = bonus?.actualAmountCents
    ? (bonus.actualAmountCents / 100).toFixed(2)
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Bonus" : "Add Bonus"}
    >
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={bonus.id} />}

        <Input
          label="Name"
          name="name"
          placeholder="e.g. Annual Bonus, Q1 Commission"
          defaultValue={bonus?.name ?? ""}
          required
        />

        <Select
          label="Income Source"
          name="incomeSourceId"
          options={incomeSources}
          placeholder="Select source..."
          defaultValue={bonus?.incomeSourceId ?? ""}
          required
        />

        <Input
          label="Expected Date"
          name="expectedDate"
          type="date"
          defaultValue={bonus?.expectedDate ?? ""}
        />

        <Input
          label="Expected Amount"
          name="expectedAmount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaultExpected}
        />

        <Input
          label="Actual Date"
          name="actualDate"
          type="date"
          defaultValue={bonus?.actualDate ?? ""}
        />

        <Input
          label="Actual Amount"
          name="actualAmount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaultActual}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="bonus-notes"
            className="text-sm font-medium text-zinc-300"
          >
            Notes
          </label>
          <textarea
            id="bonus-notes"
            name="notes"
            rows={3}
            placeholder="Optional notes..."
            defaultValue={bonus?.notes ?? ""}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Add Bonus"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

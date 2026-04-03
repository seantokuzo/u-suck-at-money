"use client";

import { useRef, useTransition } from "react";
import { Button, Input, Select, Modal } from "@/components/ui";
import { createGoal, updateGoal } from "@/actions/goals";

const GOAL_TYPE_OPTIONS = [
  { label: "Savings", value: "savings" },
  { label: "Checking Target", value: "checking_target" },
  { label: "Debt Payoff", value: "debt_payoff" },
  { label: "Investment", value: "investment" },
];

interface GoalData {
  id: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string | null;
  type: string;
  accountId: string | null;
  notes: string | null;
}

interface AccountOption {
  label: string;
  value: string;
}

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  goal?: GoalData;
  accounts: AccountOption[];
}

export function GoalForm({ open, onClose, goal, accounts }: GoalFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!goal;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateGoal(formData);
      } else {
        await createGoal(formData);
      }
      formRef.current?.reset();
      onClose();
    });
  };

  const defaultTarget = goal?.targetAmountCents
    ? (goal.targetAmountCents / 100).toFixed(2)
    : "";
  const defaultCurrent = goal?.currentAmountCents
    ? (goal.currentAmountCents / 100).toFixed(2)
    : "";

  const accountOptions = [
    { label: "None", value: "" },
    ...accounts,
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Goal" : "Add Goal"}
    >
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={goal.id} />}

        <Input
          label="Name"
          name="name"
          placeholder="e.g. Emergency Fund, Pay Off CC"
          defaultValue={goal?.name ?? ""}
          required
        />

        <Select
          label="Type"
          name="type"
          options={GOAL_TYPE_OPTIONS}
          placeholder="Select type..."
          defaultValue={goal?.type ?? ""}
          required
        />

        <Input
          label="Target Amount"
          name="targetAmount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaultTarget}
          required
        />

        <Input
          label="Current Amount"
          name="currentAmount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaultCurrent}
        />

        <Input
          label="Target Date"
          name="targetDate"
          type="date"
          defaultValue={goal?.targetDate ?? ""}
        />

        <Select
          label="Linked Account"
          name="accountId"
          options={accountOptions}
          defaultValue={goal?.accountId ?? ""}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="notes"
            className="text-sm font-medium text-zinc-300"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Optional notes..."
            defaultValue={goal?.notes ?? ""}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Add Goal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

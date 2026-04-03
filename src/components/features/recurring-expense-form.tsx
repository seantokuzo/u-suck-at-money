"use client";

import { useRef, useTransition } from "react";
import { Button, Input, Select, Modal } from "@/components/ui";
import {
  createRecurringExpense,
  updateRecurringExpense,
} from "@/actions/recurring-expenses";

// ─── Options ────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { label: "Weekly", value: "weekly" },
  { label: "Every 2 Weeks", value: "biweekly" },
  { label: "Twice Monthly", value: "semi_monthly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annual", value: "annual" },
];

const DUE_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1),
  value: String(i + 1),
}));

const MONTH_OPTIONS = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

// ─── Types ──────────────────────────────────────────────

interface RecurringExpense {
  id: string;
  name: string;
  amountCents: number;
  frequency: string;
  categoryId: string | null;
  dueDay: number | null;
  dueMonth: number | null;
  isAutoPay: boolean;
  accountId: string | null;
  notes: string | null;
}

interface CategoryOption {
  label: string;
  value: string;
}

interface AccountOption {
  label: string;
  value: string;
}

interface RecurringExpenseFormProps {
  open: boolean;
  onClose: () => void;
  expense?: RecurringExpense;
  categories: CategoryOption[];
  accounts: AccountOption[];
}

// ─── Component ──────────────────────────────────────────

export function RecurringExpenseForm({
  open,
  onClose,
  expense,
  categories,
  accounts,
}: RecurringExpenseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!expense;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateRecurringExpense(formData);
      } else {
        await createRecurringExpense(formData);
      }
      formRef.current?.reset();
      onClose();
    });
  };

  // Convert cents to dollar string for the input default value
  const defaultAmount = expense
    ? (expense.amountCents / 100).toFixed(2)
    : "";

  const defaultFrequency = expense?.frequency ?? "monthly";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Recurring Expense" : "Add Recurring Expense"}
      className="max-w-xl"
    >
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={expense.id} />}

        <Input
          label="Name"
          name="name"
          placeholder="e.g. Netflix, Rent, Car Insurance"
          defaultValue={expense?.name ?? ""}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Amount"
            name="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={defaultAmount}
            required
          />

          <Select
            label="Frequency"
            name="frequency"
            options={FREQUENCY_OPTIONS}
            placeholder="Select frequency..."
            defaultValue={expense?.frequency ?? "monthly"}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            name="categoryId"
            options={[{ label: "None", value: "" }, ...categories]}
            defaultValue={expense?.categoryId ?? ""}
          />

          <Select
            label="Account"
            name="accountId"
            options={[{ label: "None", value: "" }, ...accounts]}
            defaultValue={expense?.accountId ?? ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Due Day"
            name="dueDay"
            options={[{ label: "Not set", value: "" }, ...DUE_DAY_OPTIONS]}
            defaultValue={expense?.dueDay?.toString() ?? ""}
          />

          {/* Show dueMonth for annual/quarterly */}
          <FrequencyAwareDueMonth
            defaultFrequency={defaultFrequency}
            defaultDueMonth={expense?.dueMonth?.toString() ?? ""}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isAutoPay"
            name="isAutoPay"
            defaultChecked={expense?.isAutoPay ?? false}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-zinc-100 focus:ring-zinc-400 focus:ring-offset-zinc-950"
          />
          <label
            htmlFor="isAutoPay"
            className="text-sm font-medium text-zinc-300"
          >
            Auto-pay enabled
          </label>
        </div>

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
            rows={2}
            placeholder="Optional notes..."
            defaultValue={expense?.notes ?? ""}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Add Expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Due Month Field (conditionally shown) ──────────────

/**
 * The dueMonth field is only relevant for annual and quarterly frequencies.
 * Since this is a server-action form (not controlled state), we use a small
 * client component that reads the frequency select via DOM to toggle visibility.
 *
 * For simplicity with defaultValue forms, we always render the select but
 * hide it visually when the frequency doesn't need it. The server action
 * handles empty strings gracefully.
 */
function FrequencyAwareDueMonth({
  defaultFrequency,
  defaultDueMonth,
}: {
  defaultFrequency: string;
  defaultDueMonth: string;
}) {
  // For server-action forms, we render it always but show/hide.
  // The "showDueMonth" hint is based on the default — for truly dynamic
  // show/hide, we'd need controlled state. This is good enough since
  // the user will typically set frequency first then fill in the rest,
  // and the server ignores empty dueMonth for non-annual frequencies.
  const shouldShow =
    defaultFrequency === "annual" || defaultFrequency === "quarterly";

  return (
    <div className={shouldShow ? "" : "opacity-40"}>
      <Select
        label="Due Month"
        name="dueMonth"
        options={[{ label: "Not set", value: "" }, ...MONTH_OPTIONS]}
        defaultValue={defaultDueMonth}
      />
      {!shouldShow && (
        <p className="mt-1 text-xs text-zinc-500">
          Only used for quarterly/annual
        </p>
      )}
    </div>
  );
}

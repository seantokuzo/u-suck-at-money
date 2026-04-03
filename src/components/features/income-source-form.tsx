"use client";

import { useRef, useTransition } from "react";
import { Button, Input, Select, Modal } from "@/components/ui";
import { createIncomeSource, updateIncomeSource } from "@/actions/income";

const INCOME_TYPE_OPTIONS = [
  { label: "Salary", value: "salary" },
  { label: "Bonus", value: "bonus" },
  { label: "Side Income", value: "side_income" },
];

const PAY_SCHEDULE_OPTIONS = [
  { label: "Biweekly (every 2 weeks)", value: "biweekly" },
  { label: "Semi-Monthly (2x/month)", value: "semi_monthly" },
  { label: "Monthly", value: "monthly" },
];

interface IncomeSource {
  id: string;
  name: string;
  type: string;
  paySchedule: string | null;
  grossPerPaycheckCents: number | null;
  netPerPaycheckCents: number | null;
  employerName: string | null;
  notes: string | null;
}

interface IncomeSourceFormProps {
  open: boolean;
  onClose: () => void;
  source?: IncomeSource;
}

export function IncomeSourceForm({
  open,
  onClose,
  source,
}: IncomeSourceFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!source;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateIncomeSource(formData);
      } else {
        await createIncomeSource(formData);
      }
      formRef.current?.reset();
      onClose();
    });
  };

  const defaultGross = source?.grossPerPaycheckCents
    ? (source.grossPerPaycheckCents / 100).toFixed(2)
    : "";
  const defaultNet = source?.netPerPaycheckCents
    ? (source.netPerPaycheckCents / 100).toFixed(2)
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Income Source" : "Add Income Source"}
    >
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={source.id} />}

        <Input
          label="Name"
          name="name"
          placeholder="e.g. Day Job, Freelance Work"
          defaultValue={source?.name ?? ""}
          required
        />

        <Select
          label="Type"
          name="type"
          options={INCOME_TYPE_OPTIONS}
          placeholder="Select type..."
          defaultValue={source?.type ?? ""}
          required
        />

        <Input
          label="Employer Name"
          name="employerName"
          placeholder="e.g. Acme Corp"
          defaultValue={source?.employerName ?? ""}
        />

        <Select
          label="Pay Schedule"
          name="paySchedule"
          options={PAY_SCHEDULE_OPTIONS}
          placeholder="Select schedule..."
          defaultValue={source?.paySchedule ?? ""}
        />

        <Input
          label="Gross Per Paycheck"
          name="grossPerPaycheck"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaultGross}
        />

        <Input
          label="Net Per Paycheck"
          name="netPerPaycheck"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaultNet}
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
            defaultValue={source?.notes ?? ""}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Add Income Source"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useRef, useTransition } from "react";
import { Button, Input, Select, Modal } from "@/components/ui";
import { createHsaPlan, updateHsaPlan } from "@/actions/retirement";

interface AccountOption {
  label: string;
  value: string;
}

interface HsaPlan {
  id: string;
  name: string;
  accountId: string | null;
  annualLimitCents: number;
  ytdContributionsCents: number;
  perPaycheckAmountCents: number | null;
  cashBalanceCents: number | null;
  investmentBalanceCents: number | null;
  year: number;
  isActive: boolean;
}

interface HsaPlanFormProps {
  open: boolean;
  onClose: () => void;
  plan?: HsaPlan;
  accounts: AccountOption[];
  currentYear: number;
}

function centsToDisplay(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return "";
  return (cents / 100).toFixed(2);
}

export function HsaPlanForm({
  open,
  onClose,
  plan,
  accounts,
  currentYear,
}: HsaPlanFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!plan;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateHsaPlan(formData);
      } else {
        await createHsaPlan(formData);
      }
      formRef.current?.reset();
      onClose();
    });
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return { label: String(y), value: String(y) };
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit HSA Plan" : "Add HSA Plan"}
    >
      <form
        ref={formRef}
        action={handleSubmit}
        className="flex flex-col gap-4"
      >
        {isEdit && <input type="hidden" name="id" value={plan.id} />}

        <Input
          label="Plan Name"
          name="name"
          placeholder="e.g. Company HSA"
          defaultValue={plan?.name ?? ""}
          required
        />

        <Select
          label="Linked Account"
          name="accountId"
          options={accounts}
          placeholder="Select account (optional)..."
          defaultValue={plan?.accountId ?? ""}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Annual Limit ($)"
            name="annualLimit"
            type="text"
            inputMode="decimal"
            placeholder="4300.00"
            defaultValue={centsToDisplay(plan?.annualLimitCents)}
            required
          />

          <Input
            label="YTD Contributions ($)"
            name="ytdContributions"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={centsToDisplay(plan?.ytdContributionsCents)}
          />
        </div>

        <Input
          label="Per Paycheck Amount ($)"
          name="perPaycheckAmount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={centsToDisplay(plan?.perPaycheckAmountCents)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cash Balance ($)"
            name="cashBalance"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={centsToDisplay(plan?.cashBalanceCents)}
          />

          <Input
            label="Investment Balance ($)"
            name="investmentBalance"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={centsToDisplay(plan?.investmentBalanceCents)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Year"
            name="year"
            options={yearOptions}
            defaultValue={plan?.year?.toString() ?? String(currentYear)}
            required
          />

          <Select
            label="Status"
            name="isActive"
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" },
            ]}
            defaultValue={plan?.isActive === false ? "false" : "true"}
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Add HSA Plan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

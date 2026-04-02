"use client";

import { useRef, useTransition } from "react";
import { Button, Input, Select, Modal } from "@/components/ui";
import { createAccount, updateAccount } from "@/actions/accounts";

const ACCOUNT_TYPE_OPTIONS = [
  { label: "Checking", value: "checking" },
  { label: "Savings", value: "savings" },
  { label: "Brokerage", value: "brokerage" },
  { label: "401k", value: "401k" },
  { label: "HSA", value: "hsa" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Other", value: "other" },
];

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currentBalanceCents: number;
  notes: string | null;
}

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  account?: Account;
}

export function AccountForm({ open, onClose, account }: AccountFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!account;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateAccount(formData);
      } else {
        await createAccount(formData);
      }
      formRef.current?.reset();
      onClose();
    });
  };

  // Convert cents to dollar string for the input default value
  const defaultBalance = account
    ? (account.currentBalanceCents / 100).toFixed(2)
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Account" : "Add Account"}
    >
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={account.id} />}

        <Input
          label="Account Name"
          name="name"
          placeholder="e.g. Chase Checking"
          defaultValue={account?.name ?? ""}
          required
        />

        <Select
          label="Account Type"
          name="type"
          options={ACCOUNT_TYPE_OPTIONS}
          placeholder="Select type..."
          defaultValue={account?.type ?? ""}
          required
        />

        <Input
          label="Institution"
          name="institution"
          placeholder="e.g. Chase, Fidelity"
          defaultValue={account?.institution ?? ""}
        />

        <Input
          label="Current Balance"
          name="currentBalance"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaultBalance}
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
            defaultValue={account?.notes ?? ""}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Add Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

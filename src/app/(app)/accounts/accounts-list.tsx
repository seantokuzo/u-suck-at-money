"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { AccountCard } from "@/components/features/account-card";
import { AccountForm } from "@/components/features/account-form";

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currentBalanceCents: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AccountsListProps {
  accounts: Account[];
  grouped: Record<string, Account[]>;
  typeOrder: string[];
  typeLabels: Record<string, string>;
}

export function AccountsList({
  accounts,
  grouped,
  typeOrder,
  typeLabels,
}: AccountsListProps) {
  const [addOpen, setAddOpen] = useState(false);

  // Only show type groups that have accounts
  const visibleTypes = typeOrder.filter((type) => grouped[type]?.length);

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>Add Account</Button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="text-zinc-400">
            No accounts yet. Add your first account to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleTypes.map((type) => (
            <section key={type}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                {typeLabels[type] ?? type}
              </h2>
              <div className="space-y-2">
                {grouped[type].map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AccountForm open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}

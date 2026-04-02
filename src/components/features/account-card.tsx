"use client";

import { useState, useTransition } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { formatCents, cn } from "@/lib/utils";
import { deleteAccount, reactivateAccount } from "@/actions/accounts";
import { AccountForm } from "./account-form";

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currentBalanceCents: number;
  isActive: boolean;
  notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  brokerage: "Brokerage",
  "401k": "401k",
  hsa: "HSA",
  credit_card: "Credit Card",
  other: "Other",
};

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isNegative = account.currentBalanceCents < 0;

  const handleDeactivate = () => {
    startTransition(async () => {
      await deleteAccount(account.id);
    });
  };

  const handleReactivate = () => {
    startTransition(async () => {
      await reactivateAccount(account.id);
    });
  };

  return (
    <>
      <Card className="flex items-center justify-between gap-4 p-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-100 truncate">
              {account.name}
            </span>
            <Badge variant="default">
              {TYPE_LABELS[account.type] ?? account.type}
            </Badge>
            {!account.isActive && (
              <Badge variant="warning">Inactive</Badge>
            )}
          </div>
          {account.institution && (
            <span className="text-sm text-zinc-400 truncate">
              {account.institution}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              isNegative ? "text-red-400" : "text-green-400",
            )}
          >
            {formatCents(account.currentBalanceCents)}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
            {account.isActive ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeactivate}
                loading={isPending}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReactivate}
                loading={isPending}
              >
                Reactivate
              </Button>
            )}
          </div>
        </div>
      </Card>

      <AccountForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        account={account}
      />
    </>
  );
}

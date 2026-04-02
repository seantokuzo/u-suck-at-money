"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Badge, Modal, Card } from "@/components/ui";
import { PatternManager } from "@/components/features/import/pattern-manager";
import { deleteImport } from "@/actions/imports";
import { formatDate } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface SerializedImport {
  id: string;
  fileName: string;
  accountId: string;
  accountName: string;
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  status: "pending" | "completed" | "failed";
  importedAt: string;
}

interface SerializedPattern {
  id: string;
  pattern: string;
  categoryId: string;
  categoryName: string | null;
  createdAt: string;
}

interface ImportHistoryClientProps {
  imports: SerializedImport[];
  patterns: SerializedPattern[];
}

// ─── Status Badge Mapping ───────────────────────────────

const STATUS_VARIANT: Record<
  SerializedImport["status"],
  "success" | "warning" | "danger"
> = {
  completed: "success",
  pending: "warning",
  failed: "danger",
};

const STATUS_LABEL: Record<SerializedImport["status"], string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
};

// ─── Component ──────────────────────────────────────────

export function ImportHistoryClient({
  imports,
  patterns,
}: ImportHistoryClientProps) {
  const [rollbackTarget, setRollbackTarget] =
    useState<SerializedImport | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Convert serialized patterns back to the shape PatternManager expects
  const patternRows = patterns.map((p) => ({
    id: p.id,
    pattern: p.pattern,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    createdAt: new Date(p.createdAt),
  }));

  const handleRollback = () => {
    if (!rollbackTarget) return;
    setError(null);

    const targetId = rollbackTarget.id;

    startTransition(async () => {
      const result = await deleteImport(targetId);

      if (result.error) {
        setError(result.error);
        setRollbackTarget(null);
        return;
      }

      setRollbackTarget(null);
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import History</h1>
          <p className="mt-1 text-zinc-400">
            View past imports and manage patterns
          </p>
        </div>
        <Link
          href="/import"
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          &larr; Back to Import
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* Import List */}
      <div className="mt-6 flex flex-col gap-4">
        {imports.length === 0 ? (
          <Card className="text-center">
            <p className="text-zinc-400">
              No imports yet.{" "}
              <Link
                href="/import"
                className="text-zinc-100 underline underline-offset-4 transition-colors hover:text-white"
              >
                Go to Import
              </Link>{" "}
              to upload your first bank statement.
            </p>
          </Card>
        ) : (
          imports.map((imp) => (
            <Card key={imp.id} className="flex flex-col gap-3 p-5">
              {/* Top row: file name + status badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100">
                    {imp.fileName}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    {imp.accountName}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[imp.status]}>
                  {STATUS_LABEL[imp.status]}
                </Badge>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                <span>{formatDate(imp.importedAt)}</span>
                <span className="hidden sm:inline text-zinc-700">|</span>
                <span>
                  Imported {imp.importedCount} of {imp.rowCount} row
                  {imp.rowCount !== 1 ? "s" : ""}
                  {imp.duplicateCount > 0 && (
                    <>
                      {" "}
                      ({imp.duplicateCount} duplicate
                      {imp.duplicateCount !== 1 ? "s" : ""})
                    </>
                  )}
                </span>
              </div>

              {/* Rollback button */}
              {imp.status === "completed" && imp.importedCount > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRollbackTarget(imp)}
                    disabled={isPending}
                    aria-label={`Rollback import: ${imp.fileName}`}
                  >
                    Rollback
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Rollback Confirmation Modal */}
      <Modal
        open={rollbackTarget !== null}
        onClose={() => !isPending && setRollbackTarget(null)}
        title="Confirm Rollback"
      >
        {rollbackTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-300">
              Are you sure you want to rollback this import? This will delete{" "}
              <span className="font-semibold text-zinc-100">
                {rollbackTarget.importedCount}
              </span>{" "}
              imported transaction
              {rollbackTarget.importedCount !== 1 ? "s" : ""} from{" "}
              <span className="font-semibold text-zinc-100">
                {rollbackTarget.fileName}
              </span>
              .
            </p>
            <p className="text-xs text-zinc-500">
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRollbackTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRollback}
                loading={isPending}
                aria-label="Confirm rollback"
              >
                Delete Import
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Pattern Manager Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">
          Auto-categorization Patterns
        </h2>
        <PatternManager patterns={patternRows} />
      </div>
    </div>
  );
}

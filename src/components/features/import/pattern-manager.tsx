"use client";

import { useState, useTransition } from "react";
import { Button, Badge } from "@/components/ui";
import { deleteImportPattern } from "@/actions/imports";
import { formatDate } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface PatternRow {
  id: string;
  pattern: string;
  categoryId: string;
  categoryName: string | null;
  createdAt: Date;
}

interface PatternManagerProps {
  patterns: PatternRow[];
  onPatternDeleted?: () => void;
}

// ─── Component ──────────────────────────────────────────

export function PatternManager({
  patterns,
  onPatternDeleted,
}: PatternManagerProps) {
  // Track which pattern is currently being deleted
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setError(null);
    setDeletingId(id);

    startTransition(async () => {
      const result = await deleteImportPattern(id);
      setDeletingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }
      onPatternDeleted?.();
    });
  };

  // Empty state
  if (patterns.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">
          No patterns yet. Patterns are created when you import transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="overflow-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-2 font-medium text-zinc-400">
                Pattern
              </th>
              <th className="px-3 py-2 font-medium text-zinc-400">
                Category
              </th>
              <th className="px-3 py-2 font-medium text-zinc-400">
                Created
              </th>
              <th className="px-3 py-2 text-right font-medium text-zinc-400">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((p) => (
              <tr
                key={p.id}
                className="border-b border-zinc-800/50 last:border-b-0 transition-colors"
              >
                <td className="px-3 py-2">
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-100">
                    {p.pattern}
                  </code>
                </td>
                <td className="px-3 py-2">
                  {p.categoryName ? (
                    <Badge variant="info">{p.categoryName}</Badge>
                  ) : (
                    <span className="text-zinc-500">Unknown</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                  {formatDate(p.createdAt.toISOString())}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                    loading={isPending && deletingId === p.id}
                    disabled={isPending}
                    aria-label={`Delete pattern: ${p.pattern}`}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

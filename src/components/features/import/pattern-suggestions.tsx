"use client";

import { useState, useMemo, useTransition } from "react";
import { Button, Select, Card, Badge } from "@/components/ui";
import { createImportPattern } from "@/actions/imports";
import type { PreviewTransaction } from "@/lib/import/types";

// ─── Types ──────────────────────────────────────────────

interface CategoryOption {
  label: string;
  value: string;
}

interface PatternSuggestionsProps {
  transactions: PreviewTransaction[];
  categories: CategoryOption[];
  onPatternCreated?: () => void;
}

interface MerchantGroup {
  key: string; // normalized merchant name used as the pattern
  count: number;
}

// ─── Helpers ────────────────────────────────────────────

/** Common prefixes to strip when extracting a merchant name from a description */
const NOISE_PREFIXES = new Set([
  "POS",
  "DEBIT",
  "CREDIT",
  "CARD",
  "PURCHASE",
  "PAYMENT",
  "ACH",
  "WIRE",
  "CHECK",
  "ATM",
  "WITHDRAWAL",
  "DEPOSIT",
  "TRANSFER",
  "RECURRING",
  "AUTOPAY",
  "ONLINE",
]);

/** Returns true if a token looks like a date fragment or pure number */
function isNoiseToken(token: string): boolean {
  // Pure digits, or date-like patterns (MM/DD, YYYY, etc.)
  return /^\d+([/-]\d+)*$/.test(token) || /^#\d+$/.test(token);
}

/**
 * Best-effort extraction of a merchant name from a transaction description.
 * Takes the first 2-3 meaningful words after stripping noise prefixes, numbers,
 * and date fragments.
 */
function extractMerchantKey(description: string): string | null {
  const tokens = description
    .toUpperCase()
    .replace(/[*#]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const meaningful = tokens.filter(
    (t) => !NOISE_PREFIXES.has(t) && !isNoiseToken(t) && t.length > 1,
  );

  if (meaningful.length === 0) return null;
  return meaningful.slice(0, 3).join(" ").trim();
}

/**
 * Normalize a merchant string into a consistent key.
 * If `merchant` is present on the transaction, use it directly.
 * Otherwise fall back to heuristic extraction from description.
 */
function getMerchantKey(txn: PreviewTransaction): string | null {
  if (txn.merchant) return txn.merchant.toUpperCase().trim();
  return extractMerchantKey(txn.description);
}

// ─── Component ──────────────────────────────────────────

export function PatternSuggestions({
  transactions,
  categories,
  onPatternCreated,
}: PatternSuggestionsProps) {
  // Compute merchant groups from uncategorized transactions
  const merchantGroups = useMemo<MerchantGroup[]>(() => {
    const uncategorized = transactions.filter((t) => t.categoryId === null);
    const counts = new Map<string, number>();

    for (const txn of uncategorized) {
      const key = getMerchantKey(txn);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [transactions]);

  // Track which suggestions have been dismissed (saved or skipped)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const activeSuggestions = merchantGroups.filter(
    (g) => !dismissed.has(g.key),
  );

  // No suggestions to show
  if (merchantGroups.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        All transactions are already categorized.
      </p>
    );
  }

  // All suggestions handled
  if (activeSuggestions.length === 0) {
    return (
      <p className="text-sm text-green-400">
        All done! Pattern suggestions have been handled.
      </p>
    );
  }

  const dismissAll = () => {
    setDismissed(new Set(merchantGroups.map((g) => g.key)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">
          Learn patterns from this import
        </h3>
        <Button variant="ghost" size="sm" onClick={dismissAll}>
          Skip all
        </Button>
      </div>

      {activeSuggestions.map((group) => (
        <SuggestionCard
          key={group.key}
          merchantKey={group.key}
          count={group.count}
          categories={categories}
          onSaved={() => {
            setDismissed((prev) => new Set(prev).add(group.key));
            onPatternCreated?.();
          }}
          onSkipped={() => {
            setDismissed((prev) => new Set(prev).add(group.key));
          }}
        />
      ))}
    </div>
  );
}

// ─── Suggestion Card ────────────────────────────────────

interface SuggestionCardProps {
  merchantKey: string;
  count: number;
  categories: CategoryOption[];
  onSaved: () => void;
  onSkipped: () => void;
}

function SuggestionCard({
  merchantKey,
  count,
  categories,
  onSaved,
  onSkipped,
}: SuggestionCardProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!selectedCategoryId) return;
    setError(null);

    startTransition(async () => {
      const result = await createImportPattern(merchantKey, selectedCategoryId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Merchant info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm text-zinc-300">
            Always categorize transactions matching{" "}
            <span className="font-semibold text-zinc-100">
              &lsquo;{merchantKey}&rsquo;
            </span>{" "}
            as:
          </p>
          <span className="text-xs text-zinc-500">
            Found in{" "}
            <Badge variant="info">{count}</Badge>{" "}
            transaction{count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Category select + actions */}
        <div className="flex items-center gap-2">
          <Select
            options={categories}
            placeholder="Select category..."
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            aria-label={`Category for ${merchantKey}`}
            className="w-44"
          />
          <Button
            size="sm"
            onClick={handleSave}
            loading={isPending}
            disabled={!selectedCategoryId}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipped}
            disabled={isPending}
          >
            Skip
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </Card>
  );
}

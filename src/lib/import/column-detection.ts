import type { ColumnMapping } from "./types";

// ─── Header keyword patterns ────────────────────────────

const DATE_KEYWORDS = [
  "date",
  "time",
  "posted",
  "transaction date",
  "trans date",
  "post date",
  "posting date",
];

const AMOUNT_KEYWORDS = [
  "amount",
  "total",
  "debit",
  "credit",
  "sum",
  "charge",
  "payment",
  "balance",
];

const DESCRIPTION_KEYWORDS = [
  "description",
  "memo",
  "narrative",
  "details",
  "payee",
  "name",
  "reference",
  "transaction",
];

const MERCHANT_KEYWORDS = [
  "merchant",
  "vendor",
  "store",
  "payee",
  "retailer",
  "company",
];

// ─── Content heuristics ─────────────────────────────────

const DATE_PATTERN =
  /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$|^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}$/;

const CURRENCY_PATTERN = /^[($\-+]?\$?\d[\d,]*\.?\d*\)?$/;

/** Auto-detect which columns map to date, amount, description, and merchant */
export function detectColumns(
  headers: string[],
  sampleRows: string[][],
): ColumnMapping {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  const samples = sampleRows.slice(0, 10); // use first 10 rows max

  // Try header-based detection first, then fall back to content heuristics
  const dateIdx =
    findByHeader(lowerHeaders, DATE_KEYWORDS) ??
    findByContent(samples, isDateLike);

  const amountIdx =
    findByHeader(lowerHeaders, AMOUNT_KEYWORDS) ??
    findByContent(samples, isCurrencyLike);

  const descIdx =
    findByHeader(lowerHeaders, DESCRIPTION_KEYWORDS) ??
    findByContent(samples, (values) => isLongText(values), [
      dateIdx,
      amountIdx,
    ]);

  // Merchant is optional — only detect if it's a different column than description
  const merchantIdx =
    findByHeader(lowerHeaders, MERCHANT_KEYWORDS, [descIdx]) ?? undefined;

  return {
    date: dateIdx ?? -1,
    amount: amountIdx ?? -1,
    description: descIdx ?? -1,
    ...(merchantIdx != null && { merchant: merchantIdx }),
  };
}

// ─── Header matching ────────────────────────────────────

/** Find first header index matching any keyword, excluding already-used indices */
function findByHeader(
  headers: string[],
  keywords: string[],
  exclude: (number | null | undefined)[] = [],
): number | null {
  const excludeSet = new Set(exclude.filter((i): i is number => i != null));

  for (const keyword of keywords) {
    const idx = headers.findIndex(
      (h, i) => !excludeSet.has(i) && h.includes(keyword),
    );
    if (idx !== -1) return idx;
  }
  return null;
}

// ─── Content-based fallbacks ────────────────────────────

/** Find first column where the predicate matches most sample values */
function findByContent(
  samples: string[][],
  predicate: (values: string[]) => boolean,
  exclude: (number | null | undefined)[] = [],
): number | null {
  if (samples.length === 0) return null;
  const excludeSet = new Set(exclude.filter((i): i is number => i != null));
  const colCount = samples[0]?.length ?? 0;

  for (let col = 0; col < colCount; col++) {
    if (excludeSet.has(col)) continue;
    const values = samples.map((row) => row[col] ?? "").filter(Boolean);
    if (values.length > 0 && predicate(values)) return col;
  }
  return null;
}

/** Check if most values look like dates */
function isDateLike(values: string[]): boolean {
  const matches = values.filter(
    (v) => DATE_PATTERN.test(v.trim()) || !isNaN(Date.parse(v.trim())),
  );
  return matches.length / values.length >= 0.7;
}

/** Check if most values look like currency/numbers */
function isCurrencyLike(values: string[]): boolean {
  const matches = values.filter((v) => CURRENCY_PATTERN.test(v.trim()));
  return matches.length / values.length >= 0.7;
}

/** Check if values are generally long strings (description-like) */
function isLongText(values: string[]): boolean {
  const avgLength =
    values.reduce((sum, v) => sum + v.trim().length, 0) / values.length;
  return avgLength > 10;
}

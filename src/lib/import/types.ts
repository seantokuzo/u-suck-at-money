// ─── Import Pipeline Types ──────────────────────────────

/** Result of parsing a CSV/XLSX file */
export interface ParsedFile {
  headers: string[];
  rows: string[][]; // raw string rows (no transformation yet)
}

/** Which CSV columns map to transaction fields (by column index) */
export interface ColumnMapping {
  date: number;
  amount: number;
  description: number;
  merchant?: number;
}

/** A parsed row ready for preview in the import wizard */
export interface PreviewTransaction {
  date: string; // ISO date string
  amountCents: number; // integer cents (negative = expense, positive = income)
  description: string;
  merchant: string | null;
  categoryId: string | null; // auto-matched from patterns
  categoryName: string | null; // display name for preview
  isDuplicate: boolean; // flagged by dedup check
  rowIndex: number; // original row index for reference
}

/** Steps in the import wizard flow */
export type ImportWizardStep =
  | "upload"
  | "map"
  | "preview"
  | "importing"
  | "complete";

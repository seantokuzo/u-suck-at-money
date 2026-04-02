import { create } from "zustand";
import type {
  ColumnMapping,
  ImportWizardStep,
  ParsedFile,
  PreviewTransaction,
} from "@/lib/import/types";

// ─── State Shape ────────────────────────────────────────

interface ImportState {
  // Step management
  step: ImportWizardStep;

  // File data
  file: File | null;
  fileName: string;
  fileHash: string;
  parsedFile: ParsedFile | null;

  // Account selection
  accountId: string;

  // Column mapping
  columnMapping: ColumnMapping | null;

  // Preview
  previewTransactions: PreviewTransaction[];
  excludedRows: Set<number>;

  // Import result
  importedCount: number;
  duplicateCount: number;

  // Actions
  setFile: (file: File, parsed: ParsedFile, hash: string) => void;
  setAccountId: (id: string) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  setStep: (step: ImportWizardStep) => void;
  setPreviewTransactions: (txns: PreviewTransaction[]) => void;
  toggleExcludeRow: (rowIndex: number) => void;
  setImportResult: (imported: number, duplicates: number) => void;
  reset: () => void;
}

// ─── Initial State ──────────────────────────────────────

const initialState = {
  step: "upload" as ImportWizardStep,
  file: null,
  fileName: "",
  fileHash: "",
  parsedFile: null,
  accountId: "",
  columnMapping: null,
  previewTransactions: [],
  excludedRows: new Set<number>(),
  importedCount: 0,
  duplicateCount: 0,
};

// ─── Store ──────────────────────────────────────────────

export const useImportStore = create<ImportState>()((set) => ({
  ...initialState,

  setFile: (file, parsed, hash) =>
    set({ file, parsedFile: parsed, fileName: file.name, fileHash: hash }),

  setAccountId: (id) => set({ accountId: id }),

  setColumnMapping: (mapping) => set({ columnMapping: mapping }),

  setStep: (step) => set({ step }),

  setPreviewTransactions: (txns) => set({ previewTransactions: txns }),

  toggleExcludeRow: (rowIndex) =>
    set((state) => {
      const next = new Set(state.excludedRows);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return { excludedRows: next };
    }),

  setImportResult: (imported, duplicates) =>
    set({ importedCount: imported, duplicateCount: duplicates }),

  reset: () => set({ ...initialState, excludedRows: new Set<number>() }),
}));

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchTransactions,
  updateTransaction,
  deleteTransaction,
} from "@/actions/transactions";
import { Card, Button, Select, Badge } from "@/components/ui";
import {
  TransactionFilters,
  type TransactionFilterValues,
} from "@/components/features/transaction-filters";
import { TransactionDetailModal } from "@/components/features/transaction-detail-modal";
import { TransactionSplitModal } from "@/components/features/transaction-split-modal";
import { formatCents, formatDate, cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface TransactionRow {
  id: string;
  accountId: string;
  date: string;
  amountCents: number;
  description: string;
  merchant: string | null;
  categoryId: string | null;
  categoryName: string | null;
  notes: string | null;
  tags: string[];
  isSplit: boolean;
  importId: string | null;
  excludeFromTotals: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
}

interface CategoryOption {
  label: string;
  value: string;
}

interface TransactionListClientProps {
  initialTransactions: TransactionRow[];
  initialTotal: number;
  accounts: Account[];
  categories: CategoryOption[];
}

// ─── Page Size ──────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 25;

// ─── Component ──────────────────────────────────────────

export function TransactionListClient({
  initialTransactions,
  initialTotal,
  accounts,
  categories,
}: TransactionListClientProps) {
  const queryClient = useQueryClient();

  // ── Filter state ──────────────────────────────────────
  const [filters, setFilters] = useState<TransactionFilterValues>({
    search: "",
    accountId: "",
    categoryId: "",
    dateFrom: "",
    dateTo: "",
  });

  // ── Pagination state ──────────────────────────────────
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  // ── Sorting state ─────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  // ── Modal state ───────────────────────────────────────
  const [detailId, setDetailId] = useState<string | null>(null);
  const [splitId, setSplitId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Inline edit state ─────────────────────────────────
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  // ── Build query options ───────────────────────────────
  const sortBy = (sorting[0]?.id as "date" | "amountCents" | "description") ?? "date";
  const sortDir = sorting[0]?.desc ? "desc" : "asc";

  const queryOptions = useMemo(
    () => ({
      accountId: filters.accountId || undefined,
      categoryId: filters.categoryId || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      search: filters.search || undefined,
      sortBy,
      sortDir: sortDir as "asc" | "desc",
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
    }),
    [filters, sortBy, sortDir, pagination],
  );

  // ── Has user changed anything from defaults? ──────────
  const isInitialState =
    !filters.search &&
    !filters.accountId &&
    !filters.categoryId &&
    !filters.dateFrom &&
    !filters.dateTo &&
    sorting.length === 1 &&
    sorting[0]?.id === "date" &&
    sorting[0]?.desc === true &&
    pagination.pageIndex === 0 &&
    pagination.pageSize === DEFAULT_PAGE_SIZE;

  // ── Data query ────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["transactions", queryOptions],
    queryFn: () => fetchTransactions(queryOptions),
    placeholderData: keepPreviousData,
    initialData: isInitialState
      ? { transactions: initialTransactions, total: initialTotal }
      : undefined,
  });

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / pagination.pageSize);

  // ── Mutations ─────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setConfirmDeleteId(null);
    },
  });

  // ── Inline category change ────────────────────────────
  const handleCategoryChange = useCallback(
    (txnId: string, categoryId: string) => {
      updateMutation.mutate({ id: txnId, categoryId: categoryId || null });
      setEditingCategoryId(null);
    },
    [updateMutation],
  );

  // ── Handle filter changes (reset to page 0) ──────────
  const handleFiltersChange = useCallback(
    (newFilters: TransactionFilterValues) => {
      setFilters(newFilters);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    [],
  );

  // ── Column definitions ────────────────────────────────
  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-zinc-300">
            {formatDate(row.original.date)}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-zinc-100">{row.original.description}</p>
            {row.original.merchant && (
              <p className="truncate text-xs text-zinc-500">
                {row.original.merchant}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "categoryName",
        header: "Category",
        enableSorting: false,
        cell: ({ row }) => {
          const txn = row.original;

          if (txn.isSplit) {
            return <Badge variant="info">Split</Badge>;
          }

          if (editingCategoryId === txn.id) {
            return (
              <Select
                options={categories}
                placeholder="Select..."
                value={txn.categoryId ?? ""}
                onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                onBlur={() => setEditingCategoryId(null)}
                className="w-[160px]"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            );
          }

          return (
            <button
              type="button"
              onClick={() => setEditingCategoryId(txn.id)}
              className="rounded px-1.5 py-0.5 text-left text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              title="Click to change category"
            >
              {txn.categoryName ?? (
                <span className="text-zinc-500">Uncategorized</span>
              )}
            </button>
          );
        },
      },
      {
        accessorKey: "amountCents",
        header: () => <span className="block text-right">Amount</span>,
        enableSorting: true,
        cell: ({ row }) => (
          <span
            className={cn(
              "block text-right font-medium tabular-nums",
              row.original.amountCents >= 0
                ? "text-green-400"
                : "text-red-400",
            )}
          >
            {formatCents(row.original.amountCents)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const txn = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailId(txn.id)}
                className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
              >
                View
              </Button>
              {!txn.isSplit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSplitId(txn.id)}
                  className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
                >
                  Split
                </Button>
              )}
              {txn.isSplit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSplitId(txn.id)}
                  className="px-2 text-xs text-zinc-400 hover:text-zinc-100"
                >
                  Edit Split
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteId(txn.id)}
                className="px-2 text-xs text-red-400/70 hover:text-red-400"
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    [categories, editingCategoryId, handleCategoryChange],
  );

  // ── Table instance ────────────────────────────────────
  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount,
  });

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold">Transactions</h2>
      <p className="mt-2 text-zinc-400">
        View, filter, and manage your transactions.
      </p>

      {/* Filters */}
      <div className="mt-6">
        <TransactionFilters
          filters={filters}
          onChange={handleFiltersChange}
          accounts={accounts}
          categories={categories}
        />
      </div>

      {/* Table */}
      <Card className="mt-6 overflow-hidden p-0">
        {isLoading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-zinc-400">Loading transactions...</p>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-400">
              Failed to load transactions. Please try again.
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-zinc-400">
              No transactions found. Try adjusting your filters or import some
              transactions.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-zinc-800"
                    >
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={cn(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400",
                            header.column.getCanSort() &&
                              "cursor-pointer select-none hover:text-zinc-200",
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                            {header.column.getIsSorted() === "asc" && (
                              <SortAscIcon />
                            )}
                            {header.column.getIsSorted() === "desc" && (
                              <SortDescIcon />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-800 transition-colors hover:bg-zinc-800/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
              <p className="text-xs text-zinc-500">
                Showing{" "}
                {pagination.pageIndex * pagination.pageSize + 1}
                {" - "}
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  total,
                )}{" "}
                of {total} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <span className="text-xs text-zinc-400">
                  Page {pagination.pageIndex + 1} of {pageCount || 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <ConfirmDeleteDialog
          onConfirm={() => deleteMutation.mutate(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      {/* Detail modal */}
      <TransactionDetailModal
        transactionId={detailId}
        onClose={() => setDetailId(null)}
        categories={categories}
      />

      {/* Split modal */}
      <TransactionSplitModal
        transactionId={splitId}
        onClose={() => setSplitId(null)}
        categories={categories}
      />
    </div>
  );
}

// ─── Sort Icons ─────────────────────────────────────────

function SortAscIcon() {
  return (
    <svg
      className="h-3 w-3 text-zinc-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function SortDescIcon() {
  return (
    <svg
      className="h-3 w-3 text-zinc-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Confirm Delete Dialog ──────────────────────────────

function ConfirmDeleteDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirm delete"
        className="relative z-10 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-zinc-100">
          Delete Transaction
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          Are you sure you want to delete this transaction? This action cannot
          be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={isPending}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

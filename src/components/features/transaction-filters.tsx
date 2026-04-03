"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Select, Button } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────

export interface TransactionFilterValues {
  search: string;
  accountId: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
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

interface TransactionFiltersProps {
  filters: TransactionFilterValues;
  onChange: (filters: TransactionFilterValues) => void;
  accounts: Account[];
  categories: CategoryOption[];
}

// ─── Component ──────────────────────────────────────────

export function TransactionFilters({
  filters,
  onChange,
  accounts,
  categories,
}: TransactionFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const accountOptions = accounts.map((a) => ({
    label: `${a.name}${a.institution ? ` (${a.institution})` : ""}`,
    value: a.id,
  }));

  const hasActiveFilters =
    filters.search ||
    filters.accountId ||
    filters.categoryId ||
    filters.dateFrom ||
    filters.dateTo;

  const clearFilters = () => {
    setSearchInput("");
    onChange({
      search: "",
      accountId: "",
      categoryId: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <Input
          label="Search"
          placeholder="Search description or merchant..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search transactions"
        />
      </div>

      <div className="w-[180px]">
        <Select
          label="Account"
          options={accountOptions}
          placeholder="All accounts"
          value={filters.accountId}
          onChange={(e) =>
            onChange({ ...filters, accountId: e.target.value })
          }
          aria-label="Filter by account"
        />
      </div>

      <div className="w-[180px]">
        <Select
          label="Category"
          options={categories}
          placeholder="All categories"
          value={filters.categoryId}
          onChange={(e) =>
            onChange({ ...filters, categoryId: e.target.value })
          }
          aria-label="Filter by category"
        />
      </div>

      <div className="w-[150px]">
        <Input
          label="From"
          type="date"
          value={filters.dateFrom}
          onChange={(e) =>
            onChange({ ...filters, dateFrom: e.target.value })
          }
          aria-label="Filter from date"
        />
      </div>

      <div className="w-[150px]">
        <Input
          label="To"
          type="date"
          value={filters.dateTo}
          onChange={(e) =>
            onChange({ ...filters, dateTo: e.target.value })
          }
          aria-label="Filter to date"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

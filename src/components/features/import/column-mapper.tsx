"use client";

import { useMemo } from "react";
import { Select, Badge } from "@/components/ui";
import type { ColumnMapping } from "@/lib/import/types";

interface ColumnMapperProps {
  headers: string[];
  sampleRows: string[][];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

const REQUIRED_FIELDS: {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
}[] = [
  { key: "date", label: "Date", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "description", label: "Description", required: true },
  { key: "merchant", label: "Merchant", required: false },
];

export function ColumnMapper({
  headers,
  sampleRows,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  const headerOptions = useMemo(
    () =>
      headers.map((header, index) => ({
        label: header,
        value: String(index),
      })),
    [headers],
  );

  const handleFieldChange = (
    field: keyof ColumnMapping,
    value: string,
  ) => {
    const index = value === "" ? -1 : parseInt(value, 10);
    onMappingChange({
      ...mapping,
      [field]: field === "merchant" && value === "" ? undefined : index,
    });
  };

  const previewRows = sampleRows.slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      {/* Field mapping selects */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REQUIRED_FIELDS.map(({ key, label, required }) => {
          const currentValue =
            key === "merchant"
              ? mapping.merchant !== undefined && mapping.merchant !== -1
                ? String(mapping.merchant)
                : ""
              : mapping[key] !== -1
                ? String(mapping[key])
                : "";

          const isUnmapped =
            key === "merchant"
              ? false
              : mapping[key] === -1;

          return (
            <div key={key} className="flex flex-col gap-1.5">
              <Select
                label={
                  required ? `${label} *` : label
                }
                options={headerOptions}
                placeholder="Select column..."
                value={currentValue}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                aria-label={`Map ${label} column`}
              />
              {isUnmapped && (
                <Badge variant="warning">
                  Not detected — please select
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview table */}
      {previewRows.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-300">
            Mapped data preview
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-3 py-2 font-medium text-zinc-400">
                    Date
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-400">
                    Amount
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-400">
                    Description
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-400">
                    Merchant
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-zinc-800/50 last:border-b-0"
                  >
                    <td className="px-3 py-2 text-zinc-100">
                      {mapping.date !== -1
                        ? (row[mapping.date] ?? "—")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-100">
                      {mapping.amount !== -1
                        ? (row[mapping.amount] ?? "—")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-100">
                      {mapping.description !== -1
                        ? (row[mapping.description] ?? "—")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {mapping.merchant !== undefined && mapping.merchant !== -1
                        ? (row[mapping.merchant] ?? "—")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

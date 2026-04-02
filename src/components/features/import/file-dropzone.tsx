"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface FileDropzoneProps {
  onFileDrop: (file: File) => void;
  fileName?: string;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  return ACCEPTED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
}

const UploadIcon = () => (
  <svg
    className="h-10 w-10 text-zinc-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
  </svg>
);

const FileIcon = () => (
  <svg
    className="h-6 w-6 text-zinc-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

export function FileDropzone({
  onFileDrop,
  fileName,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!isValidFile(file)) return;
      setFileSize(file.size);
      onFileDrop(file);
    },
    [onFileDrop],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile],
  );

  const openFilePicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFilePicker();
      }
    },
    [openFilePicker],
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload CSV or XLSX file"
      aria-disabled={disabled}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors",
        isDragOver && !disabled
          ? "border-zinc-600 bg-zinc-800/50"
          : "border-zinc-800 bg-zinc-900",
        disabled && "cursor-not-allowed opacity-50",
        !disabled &&
          !isDragOver &&
          "hover:border-zinc-700 hover:bg-zinc-900/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={handleInputChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
      />

      {fileName ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <FileIcon />
          <p className="text-sm font-medium text-zinc-100">{fileName}</p>
          {fileSize !== null && (
            <p className="text-xs text-zinc-500">
              {formatFileSize(fileSize)}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              openFilePicker();
            }}
          >
            Change file
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <UploadIcon />
          <p className="text-sm font-medium text-zinc-300">
            Drop a file here or click to browse
          </p>
          <p className="text-xs text-zinc-500">
            Supports CSV and XLSX files
          </p>
        </div>
      )}
    </div>
  );
}

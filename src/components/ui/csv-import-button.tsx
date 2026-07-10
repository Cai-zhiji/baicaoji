"use client";

import { Upload, Loader2 } from "lucide-react";

interface CsvImportButtonProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
  label?: string;
}

export function CsvImportButton({
  onUpload,
  loading,
  label = "批量导入",
}: CsvImportButtonProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-[var(--accent-soft)] disabled:pointer-events-none disabled:opacity-60"
      style={{
        borderColor: "var(--border)",
        color: "var(--fg-secondary)",
      }}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
      <span>{loading ? "导入中…" : label}</span>
      <input
        type="file"
        accept=".csv"
        onChange={onUpload}
        disabled={loading}
        className="hidden"
      />
    </label>
  );
}

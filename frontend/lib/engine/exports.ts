import { utils, write } from "xlsx";
import type { ResultRecord } from "../types";
import type { ExportType, ExportFormat } from "../services/contracts";
export const exportColumns: Record<ExportType, string[]> = {
  valid: ["email"],
  corrected: ["original_email", "corrected_email", "reason"],
  removed: ["original_email", "category", "reason", "domain"],
  review: ["original_email", "final_email", "reason", "domain"],
  clean: ["email"],
  full: [
    "original_email",
    "normalized_email",
    "final_email",
    "status",
    "category",
    "reason",
    "domain",
    "was_corrected",
    "correction_type",
    "row_number",
  ],
};
const text = (value: unknown) =>
  typeof value === "boolean" ? (value ? "True" : "False") : String(value);
export function exportRow(
  record: ResultRecord,
  kind: ExportType,
): string[] | null {
  if (kind === "clean" || kind === "valid")
    return record.status === "VALID" ||
      (kind === "clean" && record.status === "CORRECTED")
      ? [record.final_email]
      : null;
  if (kind !== "full" && record.status.toLowerCase() !== kind) return null;
  return exportColumns[kind].map((key) =>
    text(
      record[
        (key === "corrected_email" ? "final_email" : key) as keyof ResultRecord
      ],
    ),
  );
}
export function createExport(
  records: ResultRecord[],
  kind: ExportType,
  format: ExportFormat,
): Blob {
  if (!exportColumns[kind] || !["csv", "xlsx"].includes(format))
    throw new Error("Unsupported export type or format");
  const rows: string[][] = [exportColumns[kind]],
    seen = new Set<string>();
  for (const record of records) {
    const row = exportRow(record, kind);
    if (!row) continue;
    if (kind === "clean") {
      if (seen.has(row[0])) continue;
      seen.add(row[0]);
    }
    rows.push(row);
  }
  if (format === "csv") {
    const escape = (value: string) => {
      const safe = /^[=+\-@\t\r\n]/.test(value.trimStart())
        ? "'" + value
        : value;
      return /[",\r\n]/.test(safe)
        ? '"' + safe.replaceAll('"', '""') + '"'
        : safe;
    };
    return new Blob(
      [
        "\ufeff",
        rows.map((row) => row.map(escape).join(",") + "\r\n").join(""),
      ],
      { type: "text/csv;charset=utf-8" },
    );
  }
  const book = utils.book_new();
  utils.book_append_sheet(book, utils.aoa_to_sheet(rows), "VeriForge");
  return new Blob(
    [write(book, { type: "array", bookType: "xlsx", compression: true })],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );
}

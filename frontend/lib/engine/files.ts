import Papa from "papaparse";
import { read, utils } from "xlsx";
import type { FileMetadata } from "../services/contracts";

export interface ParsedFile {
  metadata: FileMetadata;
  rows: string[][];
}
export const MAX_ROWS = 100000,
  MAX_BYTES = 25 * 1024 * 1024;
function checkArchive(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let end = -1;
  for (
    let i = view.byteLength - 22;
    i >= Math.max(0, view.byteLength - 65557);
    i--
  )
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("Use a valid XLSX workbook.");
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true),
    size = 0;
  if (count > 10000)
    throw new Error("Spreadsheet contains too many archive entries");
  for (let i = 0; i < count; i++) {
    if (pos + 46 > view.byteLength || view.getUint32(pos, true) !== 0x02014b50)
      throw new Error("Invalid spreadsheet archive");
    if (view.getUint16(pos + 8, true) & 1)
      throw new Error("Encrypted spreadsheets are not supported");
    size += view.getUint32(pos + 24, true);
    if (size > 128 * 1024 * 1024)
      throw new Error("Expanded spreadsheet exceeds 128 MB");
    pos +=
      46 +
      view.getUint16(pos + 28, true) +
      view.getUint16(pos + 30, true) +
      view.getUint16(pos + 32, true);
  }
}
function cellText(value: unknown): string {
  const text =
    value == null
      ? ""
      : typeof value === "boolean"
        ? value
          ? "True"
          : "False"
        : String(value);
  if ([...text].length > 4096)
    throw new Error("A cell exceeds the 4096-character limit");
  return text;
}
export function inspectRows(
  rows: string[][],
  filename: string,
  header?: boolean,
): ParsedFile {
  if (!rows.length) throw new Error("The file is empty");
  const txt = filename.toLowerCase().endsWith(".txt");
  const first = rows[0];
  if (first.length > 256) throw new Error("Input exceeds 256 columns");
  const has_header = txt
    ? false
    : (header ?? !first.some((value) => value.includes("@")));
  const columns: string[] = [];
  first.forEach((value, i) => {
    let name =
      (has_header ? value.trim().slice(0, 100) : "") ||
      (first.length === 1 ? "Email" : `Column ${i + 1}`);
    if (columns.includes(name)) name += ` (${i + 1})`;
    columns.push(name);
  });
  if (has_header) rows = rows.slice(1);
  if (!rows.length)
    throw new Error("The file contains a header but no data rows");
  if (rows.length > MAX_ROWS)
    throw new Error("Input exceeds the 100,000-row limit");
  for (const row of rows) {
    if (row.length > 256) throw new Error("Input exceeds 256 columns");
    while (columns.length < row.length)
      columns.push(`Column ${columns.length + 1}`);
  }
  const sample = rows.slice(0, 20);
  const named = columns
    .map((name, i) =>
      ["email", "email address", "e-mail"].includes(
        name.toLowerCase().replaceAll("_", " "),
      )
        ? i
        : -1,
    )
    .filter((i) => i >= 0);
  let suggested_column: number | null = named.length === 1 ? named[0] : null;
  if (suggested_column === null) {
    const winners = columns
      .map((_, i) =>
        sample.filter((row) => row[i]?.includes("@")).length / sample.length >=
        0.8
          ? i
          : -1,
      )
      .filter((i) => i >= 0);
    if (winners.length === 1) suggested_column = winners[0];
  }
  return {
    metadata: {
      filename,
      columns,
      row_count: rows.length,
      suggested_column,
      has_header,
      sample,
      sheet: filename.toLowerCase().endsWith(".xlsx")
        ? "First worksheet"
        : null,
    },
    rows,
  };
}
export async function parseFile(
  file: File,
  header?: boolean,
): Promise<ParsedFile> {
  if (file.size > MAX_BYTES)
    throw new Error("The file must be 25 MB or smaller.");
  const suffix = file.name.toLowerCase().split(".").at(-1);
  if (!["csv", "txt", "xlsx"].includes(suffix!))
    throw new Error("Choose a CSV, TXT or XLSX file.");
  const buffer = await file.arrayBuffer();
  let rows: string[][];
  if (suffix === "xlsx") {
    checkArchive(buffer);
    const book = read(buffer, {
      type: "array",
      cellFormula: true,
      sheets: 0,
      cellDates: false,
      sheetRows: MAX_ROWS + 2,
    });
    const sheet = book.Sheets[book.SheetNames[0]];
    if (!sheet) throw new Error("The workbook has no worksheet");
    // Inspect real cells instead of trusting a possibly misleading worksheet dimension.
    let maxRow = -1,
      maxCol = -1;
    for (const key of Object.keys(sheet))
      if (!key.startsWith("!")) {
        const coord = utils.decode_cell(key);
        maxRow = Math.max(maxRow, coord.r);
        maxCol = Math.max(maxCol, coord.c);
      }
    if (maxCol >= 256) throw new Error("Input exceeds 256 columns");
    if (maxRow > MAX_ROWS)
      throw new Error("Input exceeds the 100,000-row limit");
    rows = [];
    for (let r = 0; r <= maxRow; r++) {
      const row: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const cell = sheet[utils.encode_cell({ r, c })];
        row.push(cellText(cell?.f ? "=" + cell.f : cell?.v));
      }
      rows.push(row);
    }
  } else {
    const bom = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
    const encoding =
      bom[0] === 255 && bom[1] === 254
        ? "utf-16le"
        : bom[0] === 254 && bom[1] === 255
          ? "utf-16be"
          : "utf-8";
    let text: string;
    try {
      text = new TextDecoder(encoding, { fatal: true }).decode(buffer);
    } catch {
      throw new Error("Use a valid UTF-8/UTF-16 CSV or TXT file.");
    }
    if (suffix === "txt") {
      const lines = text ? text.split(/\r\n|\r|\n/) : [];
      if (/[\r\n]$/.test(text)) lines.pop();
      rows = lines.map((line) => [cellText(line)]);
    } else {
      if (!text) throw new Error("The file is empty");
      const probe = Papa.parse<string[]>(text, {
        delimitersToGuess: [",", ";", "\t", "|"],
        skipEmptyLines: true,
        preview: 20,
      });
      const parsed = Papa.parse<string[]>(text, {
        delimiter: probe.meta.delimiter || ",",
        skipEmptyLines: false,
      });
      if (parsed.errors.some((error) => error.type !== "Delimiter"))
        throw new Error(
          "Could not read this CSV. Check its quotes and delimiters.",
        );
      rows = parsed.data;
      if (
        /[\r\n]$/.test(text) &&
        rows.at(-1)?.length === 1 &&
        rows.at(-1)?.[0] === ""
      )
        rows.pop();
      rows = rows.map((row) => row.map(cellText));
    }
  }
  return inspectRows(rows, file.name, header);
}

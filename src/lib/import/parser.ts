import Papa from "papaparse";
import { read, utils } from "xlsx";
import type { ParsedFile } from "./types";

/** Parse a CSV or XLSX file into headers + string rows */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return parseCsv(file);
  }

  if (ext === "xlsx") {
    return parseXlsx(file);
  }

  throw new Error(
    `Unsupported file type: .${ext ?? "unknown"}. Use .csv or .xlsx`,
  );
}

/** Parse CSV via PapaParse */
function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const [headers, ...rows] = results.data;
        if (!headers?.length) {
          reject(new Error("CSV file is empty or has no headers"));
          return;
        }
        resolve({
          headers: headers.map((h) => h.trim()),
          rows: rows.filter((row) => row.some((cell) => cell.trim() !== "")),
        });
      },
      error: (error) => {
        reject(new Error(`CSV parse error: ${error.message}`));
      },
    });
  });
}

/** Parse XLSX via SheetJS */
async function parseXlsx(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("XLSX file has no sheets");
  }

  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    rawNumbers: false,
  });

  const [headers, ...rows] = data;
  if (!headers?.length) {
    throw new Error("XLSX file is empty or has no headers");
  }

  return {
    headers: headers.map((h) => String(h).trim()),
    rows: rows
      .map((row) => row.map((cell) => String(cell)))
      .filter((row) => row.some((cell) => cell.trim() !== "")),
  };
}

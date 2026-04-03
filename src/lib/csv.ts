/** CSV formula injection prefixes — spreadsheet apps treat these as formulas */
const FORMULA_PREFIXES = ["=", "+", "-", "@"];

/** Sanitize a string value to prevent CSV injection (only for string-origin values) */
function sanitize(str: string): string {
  const trimmed = str.trimStart();
  if (FORMULA_PREFIXES.some((p) => trimmed.startsWith(p))) {
    return `'${str}`;
  }
  return str;
}

/** Convert an array of records to a CSV string */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      // Only sanitize string-origin values — numbers, booleans etc. are safe
      const str = typeof val === "string" ? sanitize(val) : String(val);
      // Escape fields that contain commas, quotes, or newlines
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(","));
  }
  return lines.join("\n");
}

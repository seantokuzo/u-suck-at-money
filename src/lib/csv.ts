/** CSV formula injection prefixes — spreadsheet apps treat these as formulas */
const FORMULA_PREFIXES = ["=", "+", "-", "@"];

/** Sanitize a string value to prevent CSV injection */
function sanitize(str: string): string {
  if (FORMULA_PREFIXES.some((p) => str.startsWith(p))) {
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
      const str = sanitize(String(val));
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

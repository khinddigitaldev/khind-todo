// CSV that opens cleanly in Excel. Cells starting with = + - @ (except plain
// numbers) are prefixed with ' so Excel never runs them as formulas.

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (typeof value !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.map(cell).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(row[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}

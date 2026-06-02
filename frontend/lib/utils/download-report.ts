/**
 * download-report.ts
 * Lightweight, dependency-free helper that converts an array of plain objects
 * into a CSV file and triggers a browser download.
 *
 * For XLS/XLSX compatibility we encode the CSV with a UTF-8 BOM so Excel on
 * Windows opens it correctly without a conversion dialog.
 */

export type ReportRow = Record<string, string | number | null | undefined>;

/**
 * Escape a single CSV cell value:
 *   - Wrap in quotes if the value contains a comma, quote, or newline.
 *   - Double any embedded quote characters.
 */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of row objects to a CSV string.
 * Column order follows the order of keys in the first row (or `columns` if
 * supplied).
 */
function rowsToCsv(rows: ReportRow[], columns?: string[]): string {
  if (rows.length === 0) return "";

  const headers = columns ?? Object.keys(rows[0]);
  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((row) =>
    headers.map((col) => escapeCell(row[col])).join(",")
  );

  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Trigger a browser file-download for the given content.
 */
function triggerDownload(content: string, filename: string, mimeType: string) {
  // UTF-8 BOM so Excel opens the file without encoding issues.
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Download `rows` as a CSV file.
 *
 * @param rows     Array of plain objects (all rows should share the same keys).
 * @param filename Desired file name without extension (extension is appended).
 * @param columns  Optional explicit column order / subset. Defaults to all keys
 *                 of the first row.
 */
export function downloadCsvReport(
  rows: ReportRow[],
  filename: string,
  columns?: string[]
): void {
  const csv = rowsToCsv(rows, columns);
  triggerDownload(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Convenience wrapper: same as downloadCsvReport but names the file with a
 * timestamp suffix so repeated downloads don't overwrite each other.
 */
export function downloadTimestampedReport(
  rows: ReportRow[],
  baseName: string,
  columns?: string[]
): void {
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  downloadCsvReport(rows, `${baseName}_${ts}`, columns);
}

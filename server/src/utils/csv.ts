/**
 * Lightweight CSV / Excel export helpers (Phase 11). No external dependency:
 * `buildCsv` produces a standards-compliant CSV (Excel opens it directly), and
 * `buildExcelHtml` produces an HTML `<table>` served as `.xls` which Excel
 * opens natively without the format-mismatch warning a CSV-renamed-to-xls
 * would trigger.
 */

type Cell = string | number | null | undefined;

/** UTF-8 BOM so Excel detects the encoding when opening the CSV. */
const BOM = "﻿";

/** Render a single CSV cell, quoting only when the value needs it. */
export function escapeCsvCell(v: Cell): string {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV document from `headers` + `rows`. Prefixed with a UTF-8 BOM so
 * Excel detects the encoding, with `\r\n` line terminators (RFC 4180).
 */
export function buildCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

/** HTML-escape a cell value for the Excel HTML-table export. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build a minimal HTML table Excel opens as `.xls` without a warning. Numbers
 * are emitted bare (so Excel treats them as numeric); everything else is
 * HTML-escaped text.
 */
export function buildExcelHtml(headers: string[], rows: Cell[][]): string {
  const th = headers.map((h) => `    <th>${escapeHtml(h)}</th>`).join("\n");
  const trs = rows
    .map(
      (row) =>
        "    <tr>" +
        row
          .map((c) => {
            if (typeof c === "number") return `<td>${c}</td>`;
            return `<td>${escapeHtml(c == null ? "" : String(c))}</td>`;
          })
          .join("") +
        "</tr>",
    )
    .join("\n");
  return (
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">\n' +
    "<head><meta charset=\"utf-8\" /></head>\n<body>\n" +
    "<table border=\"1\">\n  <thead>\n  <tr>\n" +
    th +
    "\n  </tr>\n  </thead>\n  <tbody>\n" +
    trs +
    "\n  </tbody>\n</table>\n</body>\n</html>"
  );
}
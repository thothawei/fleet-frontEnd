/** 前端產生 CSV 下載，不需後端端點。 */

/** 依 RFC 4180 逸出單一欄位：含逗號／雙引號／換行時包引號，內部引號成對。 */
function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 把表頭與資料列組成 CSV 字串（CRLF 換行，Excel 相容）。 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/**
 * 觸發瀏覽器下載 CSV。
 *
 * 開頭補 UTF-8 BOM，否則 Excel 會用系統編碼開檔，中文欄位變亂碼。
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

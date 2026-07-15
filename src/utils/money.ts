/**
 * 金額顯示：後端一律以「分」儲存，且金額皆為整數元（分為 100 的倍數，台幣無小數）。
 * 顯示與匯出一律取整數元、不帶小數點——避免出現 NT$XX.XX 這種不可支付的金額。
 */

/** 分 → 整數元。防禦性四捨五入，即使遇到殘留小數也收斂為整數元。 */
export function centsToYuan(cents: number): number {
  return Math.round((cents ?? 0) / 100);
}

/** 分 → 整數元顯示字串（千分位、無小數，前綴 NT$）。 */
export function fmtYuan(cents: number): string {
  return `NT$ ${centsToYuan(cents).toLocaleString('zh-TW', {
    maximumFractionDigits: 0,
  })}`;
}

/** 分 → 整數元的純數字字串（無千分位、無小數），供 CSV 使用避免逗號污染分隔。 */
export function yuanForCsv(cents: number): string {
  return String(centsToYuan(cents));
}

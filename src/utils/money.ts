/** 金額顯示：後端一律以「分」儲存，前端顯示除 100。 */

/** 分 → 元（數值）。 */
export function centsToYuan(cents: number): number {
  return (cents ?? 0) / 100;
}

/** 分 → 元顯示字串（千分位、2 位小數，前綴 NT$）。 */
export function fmtYuan(cents: number): string {
  return `NT$ ${centsToYuan(cents).toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** 分 → 元的純數字字串（2 位小數、無千分位），供 CSV 使用避免逗號污染分隔。 */
export function yuanForCsv(cents: number): string {
  return centsToYuan(cents).toFixed(2);
}

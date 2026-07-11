import axios, { type AxiosError } from 'axios';

/**
 * 把任意錯誤轉成給使用者看的訊息，統一各頁 mutation／非同步 callback 的錯誤呈現。
 * 優先序：後端回傳的 `error` 欄位 → 逾時／連線／伺服器錯誤的分類訊息 → 呼叫端提供的 fallback。
 *
 * 只處理「訊息文字」，不負責導頁；401 由 axios interceptor 統一清 session 並導回登入。
 */
export function apiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ error?: string }>;
    // 後端明確回的錯誤訊息最優先（例：「帳號可能已存在」）
    const backendMsg = ax.response?.data?.error;
    if (backendMsg) return backendMsg;
    // 逾時（axios timeout）
    if (ax.code === 'ECONNABORTED') return '請求逾時，請稍後再試';
    // 有送出但完全沒有回應：斷網或後端未啟動
    if (!ax.response) return '無法連線到伺服器，請檢查網路';
    // 有回應但沒帶 error 欄位：依狀態碼粗分
    if (ax.response.status >= 500) return '伺服器發生錯誤，請稍後再試';
  }
  return fallback;
}

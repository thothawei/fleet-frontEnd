import { QueryCache, QueryClient, type Query } from '@tanstack/react-query';
import axios from 'axios';

import { apiError } from './utils/apiError';
import { getGlobalMessage } from './utils/globalMessage';

/**
 * query（讀取）失敗的全域提示：mutation 錯誤各頁已用 apiError 呈現，
 * 但多數頁的讀取失敗原本是靜默的。統一在 QueryCache onError 出 message。
 *
 * 不提示的情況：
 * - 頁面自己有 inline 錯誤 UI（Reports／Monthly 的 Alert）→ useQuery 加
 *   `meta: { suppressGlobalError: true }` 退出，避免雙重提示。
 * - 401 → axios interceptor 已清 session 並導回登入，再提示只是噪音。
 */
export function handleQueryError(err: unknown, query: Query<unknown, unknown, unknown>): void {
  if (query.meta?.suppressGlobalError) return;
  if (axios.isAxiosError(err) && err.response?.status === 401) return;
  // 固定 key：多個 query 同時失敗（如後端整個掛掉）只顯示一則，不洗版
  getGlobalMessage()?.error({
    content: apiError(err, '資料載入失敗，請稍後再試'),
    key: 'global-query-error',
  });
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleQueryError }),
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  });
}

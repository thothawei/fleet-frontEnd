import axios from 'axios';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { apiError } from './apiError';

/**
 * 寫入操作「結果不明」的判準：請求送出去了，但我們沒有拿到後端對這次操作的答案。
 *
 * - **連線類**（逾時、斷線、後端沒回應）：後端很可能**已經執行完了**，只是回應在路上遺失。
 * - **409**：後端明說「當下狀態不允許」——在重試的情境下，多半正是**上一次其實已經生效**。
 *
 * 兩者的共同點是「畫面上的狀態已經不可信」，該做的事一樣：重讀後端、如實說明。
 */
export function isUncertainWrite(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  return !err.response || err.response.status === 409;
}

/** 只需要 message.warning／error 兩支；用結構型別避免把 antd 的型別帶進 utils。 */
type Notifier = {
  warning: (content: string) => void;
  error: (content: string) => void;
};

/**
 * 寫入失敗的統一出口：**結果不明時一定要重讀後端，並且不能說「失敗了」**。
 *
 * 為什麼把「顯示訊息」與「重新整理」綁在同一支函式：這兩件事分開寫，遲早會出現
 * 「訊息說畫面已重新整理、但其實沒有」的謊。綁在一起就沒有那個失敗模式。
 *
 * 明確的失敗（400／403／500…）維持原本行為：顯示原因、不動畫面，讓操作者自己重試。
 */
export function handleWriteError(
  err: unknown,
  fallback: string,
  ctx: { notify: Notifier; queryClient: QueryClient; invalidate: QueryKey[] },
): void {
  if (!isUncertainWrite(err)) {
    ctx.notify.error(apiError(err, fallback));
    return;
  }
  for (const queryKey of ctx.invalidate) {
    void ctx.queryClient.invalidateQueries({ queryKey });
  }
  const conflict = axios.isAxiosError(err) && err.response?.status === 409;
  ctx.notify.warning(
    conflict
      ? `${apiError(err, fallback)}（可能上一次已經生效，畫面已重新整理，請確認結果）`
      : '沒有收到後端回應，這次操作可能已經生效——畫面已重新整理，請確認結果後再決定是否重試',
  );
}

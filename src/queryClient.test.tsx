import { QueryClientProvider, useQuery, type Query } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import type { MessageInstance } from 'antd/es/message/interface';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient, handleQueryError } from './queryClient';
import { setGlobalMessage } from './utils/globalMessage';

function fakeMessage() {
  const error = vi.fn();
  setGlobalMessage({ error } as unknown as MessageInstance);
  return { error };
}

function queryStub(meta?: Record<string, unknown>): Query<unknown, unknown, unknown> {
  return { meta } as unknown as Query<unknown, unknown, unknown>;
}

function axiosErrorWithStatus(status: number, backendMsg?: string): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = {
    status,
    data: backendMsg ? { error: backendMsg } : {},
    statusText: '',
    headers: {},
    config: {},
  } as AxiosError['response'];
  return err;
}

afterEach(() => setGlobalMessage(null));

describe('handleQueryError（全域 query 讀取錯誤提示）', () => {
  it('一般錯誤 → 以 apiError 訊息出 message.error（固定 key 防洗版）', () => {
    const { error } = fakeMessage();
    handleQueryError(new Error('boom'), queryStub());

    expect(error).toHaveBeenCalledWith({
      content: '資料載入失敗，請稍後再試',
      key: 'global-query-error',
    });
  });

  it('後端帶 error 欄位 → 顯示後端訊息', () => {
    const { error } = fakeMessage();
    handleQueryError(axiosErrorWithStatus(400, '查詢區間不可超過 31 天'), queryStub());

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ content: '查詢區間不可超過 31 天' }),
    );
  });

  it('meta.suppressGlobalError → 不提示（頁面自有 inline Alert）', () => {
    const { error } = fakeMessage();
    handleQueryError(new Error('boom'), queryStub({ suppressGlobalError: true }));

    expect(error).not.toHaveBeenCalled();
  });

  it('401 → 不提示（interceptor 已導回登入）', () => {
    const { error } = fakeMessage();
    handleQueryError(axiosErrorWithStatus(401), queryStub());

    expect(error).not.toHaveBeenCalled();
  });
});

describe('createQueryClient', () => {
  it('useQuery 讀取失敗會觸發全域提示', async () => {
    const { error } = fakeMessage();

    function Boom() {
      useQuery({
        queryKey: ['boom'],
        queryFn: () => Promise.reject(new Error('讀取掛了')),
        retry: false,
      });
      return null;
    }

    render(
      <QueryClientProvider client={createQueryClient()}>
        <Boom />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(error).toHaveBeenCalledTimes(1));
  });
});

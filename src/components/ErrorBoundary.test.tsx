import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import ErrorBoundary from './ErrorBoundary';

function Boom(): never {
  throw new Error('炸了');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('沒有錯誤時原樣渲染 children', () => {
    render(
      <ErrorBoundary>
        <div>正常內容</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('正常內容')).toBeInTheDocument();
  });

  it('子元件拋錯時顯示錯誤頁而非白屏', () => {
    // React 會把攔截到的錯誤再 console.error 一次，測試中壓掉噪音
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('頁面發生錯誤')).toBeInTheDocument();
    expect(screen.getByText('炸了')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新載入' })).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
  });
});

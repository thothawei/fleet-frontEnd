import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result, Typography } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 全域錯誤邊界：攔截 render / lifecycle 期間的例外，避免整頁白屏。
 *
 * React 沒有 hook 版的 error boundary，必須用 class component。
 * 攔不到的情況：事件處理器、非同步 callback、SSR——那些交給 axios/Query 的錯誤處理層。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] 未攔截的錯誤', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Result
        status="error"
        title="頁面發生錯誤"
        subTitle="請重新載入頁面；若問題持續發生，請聯絡系統管理員。"
        extra={[
          <Button type="primary" key="reload" onClick={() => window.location.reload()}>
            重新載入
          </Button>,
          <Button key="home" onClick={() => (window.location.href = '/')}>
            回首頁
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          <code>{error.message}</code>
        </Typography.Paragraph>
      </Result>
    );
  }
}

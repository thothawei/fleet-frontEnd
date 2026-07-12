import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { antdTheme } from './theme/tokens';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhTW} theme={antdTheme}>
        {/* antd App：讓 message／Modal 透過 App.useApp() 取得能吃主題 context 的實例 */}
        <AntdApp>
          <ErrorBoundary>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ErrorBoundary>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
);

import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  path?: string;
}

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { route = '/', path, ...renderOptions } = options;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    const content = path ? (
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    ) : (
      children
    );

    return (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={zhTW}>
          <MemoryRouter initialEntries={[route]}>{content}</MemoryRouter>
        </ConfigProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

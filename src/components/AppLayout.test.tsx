import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import AppLayout from './AppLayout';
import { renderWithProviders } from '../test/render';
import { clearSession, saveSession } from '../auth/auth';

describe('AppLayout 選單分級', () => {
  afterEach(() => {
    clearSession();
  });

  it('superadmin 才看得到「使用者管理」選單', async () => {
    saveSession('tok', '王小明', 'superadmin');

    renderWithProviders(<AppLayout />);

    expect(await screen.findByText('使用者管理')).toBeInTheDocument();
  });

  it('非 superadmin（dispatcher）看不到「使用者管理」選單', async () => {
    saveSession('tok', '王小明', 'dispatcher');

    renderWithProviders(<AppLayout />);

    // 先等 Sider 的 responsive breakpoint 副作用跑完，再斷言選單內容
    expect(await screen.findByText('營運總覽')).toBeInTheDocument();
    expect(screen.getByText('即時車隊')).toBeInTheDocument();
    expect(screen.getByText('Fleet 派遣後台')).toBeInTheDocument();
    expect(screen.queryByText('使用者管理')).not.toBeInTheDocument();
  });
});

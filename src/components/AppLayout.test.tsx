import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppLayout from './AppLayout';
import { renderWithProviders } from '../test/render';
import { clearSession, isLoggedIn, saveSession } from '../auth/auth';

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

// 登出鈕就在 Header 右上角、緊鄰使用者名稱，誤觸成本是整個 session 重登。
// 這兩案的重點是「取消真的什麼都沒發生」——只驗確認路徑會讓誤觸防護形同虛設。
describe('AppLayout 登出確認', () => {
  afterEach(() => {
    clearSession();
  });

  // ⚠️ antd 會在「剛好兩個中文字」的按鈕中間插入空格（DOM 實際是「登 出」「取 消」），
  // 所以 name 一律用寬鬆的 /登\s*出/，精確字串比對會查不到元素。
  // 標題同時出現在 ant-modal-title 與 ant-modal-confirm-title 兩處，
  // 因此斷言走 dialog 的 textContent 而非 getByText（後者會 Found multiple）。
  it('按登出先跳確認框，按取消不清 session', async () => {
    const user = userEvent.setup();
    saveSession('tok', '王小明', 'dispatcher');

    renderWithProviders(<AppLayout />);

    await user.click(await screen.findByRole('button', { name: /登\s*出/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('確定要登出？');

    await user.click(await within(dialog).findByRole('button', { name: /取\s*消/ }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(isLoggedIn()).toBe(true);
  });

  it('確認後才清 session', async () => {
    const user = userEvent.setup();
    saveSession('tok', '王小明', 'dispatcher');

    renderWithProviders(<AppLayout />);

    await user.click(await screen.findByRole('button', { name: /登\s*出/ }));
    // 確認框的主鈕文案也是「登出」，取 dialog 內那顆以免點回 Header 上的原鈕
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: /登\s*出/ }));

    await waitFor(() => {
      expect(isLoggedIn()).toBe(false);
    });
  });
});

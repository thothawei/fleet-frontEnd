import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DriverDetailPage from './DriverDetailPage';
import { renderWithProviders } from '../test/render';

const mockFetchDrivers = vi.fn();

vi.mock('../api/admin', () => ({
  fetchDrivers: (...args: unknown[]) => mockFetchDrivers(...args),
}));

const driver = {
  ID: 7,
  Name: '王大明',
  Phone: '0912345678',
  LineUserID: 'line-7',
  Status: 1,
  VehicleType: 'sedan',
  PlateNumber: 'ABC-1234',
  VehicleReviewStatus: 'approved',
  VehicleReviewNote: '',
  RatingAvg: 4.5,
  RatingCount: 2,
  CreatedAt: '2026-07-20T01:02:03Z',
  UpdatedAt: '2026-07-21T04:05:06Z',
};

describe('DriverDetailPage', () => {
  beforeEach(() => {
    mockFetchDrivers.mockReset();
    mockFetchDrivers.mockResolvedValue([driver]);
  });

  it('從列表資料取出對應司機並顯示明細', async () => {
    renderWithProviders(<DriverDetailPage />, { route: '/drivers/7', path: '/drivers/:id' });

    // 標題用姓名，代表確實比對到了 id 而不是只印路由參數
    expect(await screen.findByText('司機：王大明')).toBeInTheDocument();
    expect(screen.getByText('0912345678')).toBeInTheDocument();
    expect(screen.getByText('line-7')).toBeInTheDocument();
    expect(screen.getByText('待命')).toBeInTheDocument();
  });

  // 直接開網址（沒經過列表）時本頁會自己抓一次；這是它能單獨被連結的前提，
  // 例如即時車隊地圖 popup 的「查看司機 →」。
  it('直接進入時自行呼叫 fetchDrivers', async () => {
    renderWithProviders(<DriverDetailPage />, { route: '/drivers/7', path: '/drivers/:id' });

    expect(await screen.findByText('司機：王大明')).toBeInTheDocument();
    expect(mockFetchDrivers).toHaveBeenCalled();
  });

  // 後端無單筆端點，找不到只可能是「列表裡沒有這個 id」——要說清楚是哪個 id，
  // 並留一條回列表的路，不能只給一個空白 Card。
  it('列表中沒有該 id 時顯示找不到並提供返回', async () => {
    renderWithProviders(<DriverDetailPage />, { route: '/drivers/999', path: '/drivers/:id' });

    expect(await screen.findByText('找不到司機 #999')).toBeInTheDocument();
    // 兩顆：PageHeader 右側固定有一顆，Empty 裡再給一顆——空狀態的視線焦點在中間，
    // 只留右上角那顆會讓人以為沒有出路。
    expect(screen.getAllByRole('button', { name: /返回司機列表/ })).toHaveLength(2);
  });

  it('麵包屑可回到司機管理', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DriverDetailPage />, { route: '/drivers/7', path: '/drivers/:id' });

    expect(await screen.findByText('司機：王大明')).toBeInTheDocument();
    const crumb = screen.getByRole('link', { name: '司機管理' });
    expect(crumb).toHaveAttribute('href', '/drivers');
    await user.click(crumb); // 不該丟例外（路由存在於 MemoryRouter）
  });
});

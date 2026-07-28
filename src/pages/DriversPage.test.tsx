import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DriversPage from './DriversPage';
import { setRole } from '../auth/auth';
import { renderWithProviders } from '../test/render';

const mockFetchDrivers = vi.fn();

vi.mock('../api/admin', () => ({
  fetchDrivers: (...args: unknown[]) => mockFetchDrivers(...args),
  patchDriverStatus: vi.fn(),
}));

describe('DriversPage', () => {
  beforeEach(() => {
    mockFetchDrivers.mockReset();
    mockFetchDrivers.mockResolvedValue([
      { ID: 1, Name: '煙霧測試司機', Phone: '0912', LineUserID: 'line-1', Status: 1 },
    ]);
  });

  it('載入並顯示司機列表與狀態 Tag', async () => {
    renderWithProviders(<DriversPage />);

    expect(screen.getByText('司機管理')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('煙霧測試司機')).toBeInTheDocument();
    });

    expect(screen.getByText('待命')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(mockFetchDrivers).toHaveBeenCalled();
  });

  it('viewer 角色時帳號 Switch 停用', async () => {
    setRole('viewer');
    renderWithProviders(<DriversPage />);

    await waitFor(() => {
      expect(screen.getByText('煙霧測試司機')).toBeInTheDocument();
    });

    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('車種篩選：選寵物用車只留寵物車司機，選「未填車輛」只留沒填的', async () => {
    const user = userEvent.setup();
    mockFetchDrivers.mockResolvedValue([
      { ID: 1, Name: '轎車司機', Phone: '0911', LineUserID: 'l1', Status: 1, VehicleType: 'sedan', PlateNumber: 'AAA-1111', VehicleReviewStatus: 'approved', VehicleReviewNote: '' },
      { ID: 2, Name: '寵物車司機', Phone: '0922', LineUserID: 'l2', Status: 1, VehicleType: 'pet', PlateNumber: 'PET-0001', VehicleReviewStatus: 'approved', VehicleReviewNote: '' },
      // 沒填車輛的司機接不了單（O3/O5 gate），是實際會被找的一群，不能只給五個車種而漏掉
      { ID: 3, Name: '未填車輛司機', Phone: '0933', LineUserID: 'l3', Status: 0, VehicleType: '', PlateNumber: '', VehicleReviewStatus: '', VehicleReviewNote: '' },
    ]);

    renderWithProviders(<DriversPage />);
    await waitFor(() => {
      expect(screen.getByText('轎車司機')).toBeInTheDocument();
    });

    // 兩個 Select：第一個是狀態、第二個是車種
    const vehicleSelect = () => screen.getAllByRole('combobox')[1];

    await user.click(vehicleSelect());
    await user.click(await screen.findByTitle('寵物用車'));
    await waitFor(() => {
      expect(screen.queryByText('轎車司機')).not.toBeInTheDocument();
    });
    expect(screen.getByText('寵物車司機')).toBeInTheDocument();

    await user.click(vehicleSelect());
    await user.click(await screen.findByTitle('未填車輛'));
    await waitFor(() => {
      expect(screen.getByText('未填車輛司機')).toBeInTheDocument();
    });
    expect(screen.queryByText('寵物車司機')).not.toBeInTheDocument();
  });

  // 搜尋框寫著「搜尋姓名／電話／車牌」——**三個欄位都要真的能搜**。
  // placeholder 承諾了卻搜不到比沒有搜尋更糟：使用者會以為查無此人。
  it('關鍵字搜尋：姓名／電話／車牌三個欄位都命中', async () => {
    const user = userEvent.setup();
    mockFetchDrivers.mockResolvedValue([
      { ID: 1, Name: '王大明', Phone: '0911111111', LineUserID: 'l1', Status: 1, VehicleType: 'sedan', PlateNumber: 'AAA-1111', VehicleReviewStatus: 'approved', VehicleReviewNote: '' },
      { ID: 2, Name: '李小美', Phone: '0922222222', LineUserID: 'l2', Status: 1, VehicleType: 'pet', PlateNumber: 'PET-0002', VehicleReviewStatus: 'approved', VehicleReviewNote: '' },
    ]);

    renderWithProviders(<DriversPage />);
    await waitFor(() => {
      expect(screen.getByText('王大明')).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText('搜尋姓名／電話／車牌');

    await user.type(search, '李小');
    await waitFor(() => {
      expect(screen.queryByText('王大明')).not.toBeInTheDocument();
    });
    expect(screen.getByText('李小美')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, '0911');
    await waitFor(() => {
      expect(screen.queryByText('李小美')).not.toBeInTheDocument();
    });
    expect(screen.getByText('王大明')).toBeInTheDocument();

    // 車牌大小寫不該影響命中——路邊比對車牌時沒人在意大小寫
    await user.clear(search);
    await user.type(search, 'pet-0002');
    await waitFor(() => {
      expect(screen.queryByText('王大明')).not.toBeInTheDocument();
    });
    expect(screen.getByText('李小美')).toBeInTheDocument();
  });
});

describe('DriversPage 評價欄（B5）', () => {
  beforeEach(() => {
    setRole('superadmin');
    mockFetchDrivers.mockReset();
    mockFetchDrivers.mockResolvedValue([
      { ID: 1, Name: '高分司機', Phone: '', LineUserID: 'l1', Status: 1, RatingAvg: 4.8, RatingCount: 25 },
      { ID: 2, Name: '低分司機', Phone: '', LineUserID: 'l2', Status: 1, RatingAvg: 2.5, RatingCount: 4 },
      { ID: 3, Name: '新司機', Phone: '', LineUserID: 'l3', Status: 1, RatingAvg: 0, RatingCount: 0 },
    ]);
  });

  it('有評分顯示「平均(則數)」，沒評分顯示「尚無評分」而非 0.0', async () => {
    renderWithProviders(<DriversPage />);
    await waitFor(() => expect(screen.getByText('高分司機')).toBeInTheDocument());

    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('(25)')).toBeInTheDocument();
    expect(screen.getByText('2.5')).toBeInTheDocument();
    expect(screen.getByText('尚無評分')).toBeInTheDocument();
    // 0 則不該被渲染成 0.0 顆星——那看起來像「被評成 0 分」
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  it('依評價排序：低分在前，沒評分的排最後（0 則不代表差）', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DriversPage />);
    await waitFor(() => expect(screen.getByText('高分司機')).toBeInTheDocument());

    await user.click(screen.getByText('評價'));

    await waitFor(() => {
      const names = screen
        .getAllByRole('row')
        .slice(1)
        .map((r) => r.querySelector('a')?.textContent ?? '');
      expect(names).toEqual(['低分司機', '高分司機', '新司機']);
    });
  });
});

describe('DriversPage 評價排序方向', () => {
  beforeEach(() => {
    setRole('superadmin');
    mockFetchDrivers.mockReset();
    mockFetchDrivers.mockResolvedValue([
      { ID: 1, Name: '高分司機', Phone: '', LineUserID: 'l1', Status: 1, RatingAvg: 4.8, RatingCount: 25 },
      { ID: 2, Name: '低分司機', Phone: '', LineUserID: 'l2', Status: 1, RatingAvg: 2.5, RatingCount: 4 },
      { ID: 3, Name: '新司機', Phone: '', LineUserID: 'l3', Status: 1, RatingAvg: 0, RatingCount: 0 },
    ]);
  });

  // 迴歸：antd 做降序是把比較結果整個反轉，特例不跟著反轉的話沒評分的會浮到最前面。
  it('降序時沒評分的仍排最後（antd 會反轉比較結果）', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DriversPage />);
    await waitFor(() => expect(screen.getByText('高分司機')).toBeInTheDocument());

    await user.click(screen.getByText('評價')); // 升序
    await user.click(screen.getByText('評價')); // 降序

    await waitFor(() => {
      const names = screen.getAllByRole('row').slice(1).map((r) => r.querySelector('a')?.textContent ?? '');
      expect(names).toEqual(['高分司機', '低分司機', '新司機']);
    });
  });
});

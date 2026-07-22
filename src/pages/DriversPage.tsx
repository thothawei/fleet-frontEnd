import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Empty, Input, Select, Space, Switch, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

import { fetchDrivers, patchDriverStatus, reviewDriverVehicle, type Driver } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { canDispatch } from '../auth/auth';
import {
  DRIVER_STATUS,
  DRIVER_STATUS_DISABLED,
  VEHICLE_REVIEW_STATUS,
  VEHICLE_TYPE_LABEL,
} from '../constants';
import { apiError } from '../utils/apiError';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部狀態' },
  { value: 'review', label: '待審核車輛' },
  ...Object.entries(DRIVER_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
];

// 車種篩選（O1）。'none' 是「還沒填車輛」——這群人接不了單（O3/O5 gate），
// 是實際會被找的一群，不能只給五個車種而漏掉他們。
const VEHICLE_TYPE_OPTIONS = [
  { value: 'all', label: '全部車種' },
  ...Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => ({ value, label })),
  { value: 'none', label: '未填車輛' },
];

export default function DriversPage() {
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return drivers.filter((d) => {
      if (statusFilter === 'review') {
        if (d.VehicleReviewStatus !== 'pending') return false;
      } else if (statusFilter !== 'all' && String(d.Status) !== statusFilter) {
        return false;
      }
      if (vehicleFilter === 'none') {
        if (d.VehicleType) return false;
      } else if (vehicleFilter !== 'all' && d.VehicleType !== vehicleFilter) {
        return false;
      }
      if (!kw) return true;
      return (
        d.Name.toLowerCase().includes(kw) ||
        d.Phone.toLowerCase().includes(kw) ||
        d.PlateNumber.toLowerCase().includes(kw)
      );
    });
  }, [drivers, keyword, statusFilter, vehicleFilter]);

  const pendingCount = useMemo(
    () => drivers.filter((d) => d.VehicleReviewStatus === 'pending').length,
    [drivers],
  );

  const mutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      patchDriverStatus(id, enabled),
    onSuccess: () => {
      message.success('已更新司機狀態');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (err) => message.error(apiError(err, '操作失敗')),
  });

  // 車輛審核（O5）：核准/退回。退回必附原因（後端也擋）。
  const reviewMutation = useMutation({
    mutationFn: ({ id, approve, note }: { id: number; approve: boolean; note?: string }) =>
      reviewDriverVehicle(id, approve, note),
    onSuccess: (_data, vars) => {
      message.success(vars.approve ? '已核准車輛' : '已退回車輛');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (err) => message.error(apiError(err, '審核失敗')),
  });

  const approveVehicle = (driver: Driver) => {
    modal.confirm({
      title: `核准「${driver.Name || `司機 #${driver.ID}`}」的車輛？`,
      content: `車種 ${VEHICLE_TYPE_LABEL[driver.VehicleType] ?? driver.VehicleType}／車牌 ${driver.PlateNumber}。核准後即可開始接單。`,
      okText: '核准',
      cancelText: '取消',
      onOk: () => reviewMutation.mutateAsync({ id: driver.ID, approve: true }),
    });
  };

  const rejectVehicle = (driver: Driver) => {
    let note = '';
    modal.confirm({
      title: `退回「${driver.Name || `司機 #${driver.ID}`}」的車輛`,
      content: (
        <Input.TextArea
          placeholder="退回原因（司機會看到，請說明哪裡需要修正）"
          autoSize={{ minRows: 2 }}
          onChange={(e) => {
            note = e.target.value;
          }}
        />
      ),
      okText: '退回',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        if (!note.trim()) {
          message.error('退回必須填寫原因');
          return Promise.reject(new Error('note required'));
        }
        return reviewMutation.mutateAsync({ id: driver.ID, approve: false, note: note.trim() });
      },
    });
  };

  const toggleEnabled = (driver: Driver, enabled: boolean) => {
    const action = () => mutation.mutate({ id: driver.ID, enabled });

    if (!enabled) {
      modal.confirm({
        title: `停用司機「${driver.Name}」？`,
        content: '停用後司機無法上線，且會從派單池移除。載客中不可停用。',
        okText: '停用',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: action,
      });
      return;
    }

    action();
  };

  const columns: ColumnsType<Driver> = [
    { title: 'ID', dataIndex: 'ID', width: 80 },
    {
      title: '姓名',
      dataIndex: 'Name',
      render: (name: string, driver: Driver) => (
        <Link to={`/drivers/${driver.ID}`}>{name || `司機 #${driver.ID}`}</Link>
      ),
    },
    { title: '電話', dataIndex: 'Phone', render: (p: string) => p || '—' },
    { title: 'LINE User ID', dataIndex: 'LineUserID', ellipsis: true },
    {
      title: '狀態',
      dataIndex: 'Status',
      width: 120,
      render: (s: number) => {
        const meta = DRIVER_STATUS[s] ?? { label: String(s), color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '車輛',
      width: 160,
      render: (_: unknown, driver: Driver) =>
        driver.VehicleType ? (
          <Space direction="vertical" size={0}>
            <span>{VEHICLE_TYPE_LABEL[driver.VehicleType] ?? driver.VehicleType}</span>
            <span style={{ fontFamily: 'monospace' }}>{driver.PlateNumber}</span>
          </Space>
        ) : (
          <span style={{ color: '#999' }}>未填</span>
        ),
    },
    {
      title: '審核',
      dataIndex: 'VehicleReviewStatus',
      width: 110,
      render: (s: string, driver: Driver) => {
        const meta = VEHICLE_REVIEW_STATUS[s] ?? { label: s, color: 'default' };
        const tag = <Tag color={meta.color}>{meta.label}</Tag>;
        // 已退回時把原因掛在 tooltip，方便 admin 回想退了什麼。
        return s === 'rejected' && driver.VehicleReviewNote ? (
          <Tooltip title={`原因：${driver.VehicleReviewNote}`}>{tag}</Tooltip>
        ) : (
          tag
        );
      },
    },
    {
      title: '車輛審核',
      width: 150,
      render: (_: unknown, driver: Driver) => {
        if (driver.VehicleReviewStatus !== 'pending') return <span style={{ color: '#ccc' }}>—</span>;
        if (!canDispatch()) return <Tooltip title="權限不足">—</Tooltip>;
        const busy = reviewMutation.isPending && reviewMutation.variables?.id === driver.ID;
        return (
          <Space>
            <Button size="small" type="primary" loading={busy} onClick={() => approveVehicle(driver)}>
              核准
            </Button>
            <Button size="small" danger loading={busy} onClick={() => rejectVehicle(driver)}>
              退回
            </Button>
          </Space>
        );
      },
    },
    {
      title: '帳號',
      width: 100,
      render: (_: unknown, driver: Driver) => {
        const canWrite = canDispatch();
        const control = (
          <Switch
            checked={driver.Status !== DRIVER_STATUS_DISABLED}
            loading={mutation.isPending && mutation.variables?.id === driver.ID}
            checkedChildren="啟用"
            unCheckedChildren="停用"
            disabled={!canWrite}
            onChange={(checked) => toggleEnabled(driver, checked)}
          />
        );
        return canWrite ? control : <Tooltip title="權限不足">{control}</Tooltip>;
      },
    },
  ];

  return (
    <>
      <PageHeader title="司機管理" />
      <Card>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜尋姓名／電話／車牌"
          style={{ width: 260 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {pendingCount > 0 && (
          <Tag
            color="warning"
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFilter('review')}
          >
            {pendingCount} 台車輛待審核
          </Tag>
        )}
        <Select
          value={statusFilter}
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
        />
        <Select
          value={vehicleFilter}
          style={{ width: 140 }}
          options={VEHICLE_TYPE_OPTIONS}
          onChange={setVehicleFilter}
        />
      </Space>
      <Table
        rowKey="ID"
        loading={isLoading}
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 位` }}
        size="middle"
        locale={{
          emptyText: (
            <Empty description={drivers.length ? '沒有符合條件的司機' : '目前沒有資料'} />
          ),
        }}
      />
      </Card>
    </>
  );
}

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Card, Empty, Input, Select, Space, Switch, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

import { fetchDrivers, patchDriverStatus, type Driver } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { canDispatch } from '../auth/auth';
import { DRIVER_STATUS, DRIVER_STATUS_DISABLED } from '../constants';
import { apiError } from '../utils/apiError';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部狀態' },
  ...Object.entries(DRIVER_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
];

export default function DriversPage() {
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return drivers.filter((d) => {
      if (statusFilter !== 'all' && String(d.Status) !== statusFilter) return false;
      if (!kw) return true;
      return d.Name.toLowerCase().includes(kw) || d.Phone.toLowerCase().includes(kw);
    });
  }, [drivers, keyword, statusFilter]);

  const mutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      patchDriverStatus(id, enabled),
    onSuccess: () => {
      message.success('已更新司機狀態');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (err) => message.error(apiError(err, '操作失敗')),
  });

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
          placeholder="搜尋姓名或電話"
          style={{ width: 240 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          value={statusFilter}
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
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

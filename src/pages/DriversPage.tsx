import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Modal, Switch, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';

import { fetchDrivers, patchDriverStatus, type Driver } from '../api/admin';
import { DRIVER_STATUS, DRIVER_STATUS_DISABLED } from '../constants';

function apiError(err: unknown, fallback: string): string {
  const ax = err as AxiosError<{ error?: string }>;
  return ax.response?.data?.error ?? fallback;
}

export default function DriversPage() {
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });

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
      Modal.confirm({
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
    { title: '姓名', dataIndex: 'Name' },
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
      render: (_: unknown, driver: Driver) => (
        <Switch
          checked={driver.Status !== DRIVER_STATUS_DISABLED}
          loading={mutation.isPending && mutation.variables?.id === driver.ID}
          checkedChildren="啟用"
          unCheckedChildren="停用"
          onChange={(checked) => toggleEnabled(driver, checked)}
        />
      ),
    },
  ];

  return (
    <Card title="司機管理">
      <Table
        rowKey="ID"
        loading={isLoading}
        columns={columns}
        dataSource={drivers}
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 位` }}
        size="middle"
        locale={{ emptyText: '尚無司機' }}
      />
    </Card>
  );
}

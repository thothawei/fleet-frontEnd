import { useQuery } from '@tanstack/react-query';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { fetchDrivers, type Driver } from '../api/admin';
import { DRIVER_STATUS } from '../constants';

export default function DriversPage() {
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });

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
  ];

  return (
    <Card title="司機管理">
      <Table
        rowKey="ID"
        loading={isLoading}
        columns={columns}
        dataSource={drivers}
        pagination={{ pageSize: 20 }}
        size="middle"
      />
    </Card>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Select, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { fetchRides, type RideRow } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { RIDE_STATUS } from '../constants';

const statusOptions = [
  { value: -1, label: '全部狀態' },
  ...Object.entries(RIDE_STATUS).map(([k, v]) => ({ value: Number(k), label: v.label })),
];

function fmtTime(t: string | null): string {
  return t ? new Date(t).toLocaleString('zh-TW') : '—';
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<number>(-1);
  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['rides', status],
    queryFn: () => fetchRides(status === -1 ? undefined : status),
  });

  const columns: ColumnsType<RideRow> = [
    { title: '訂單', dataIndex: 'id', width: 80 },
    {
      title: '狀態',
      dataIndex: 'status',
      width: 120,
      render: (s: number) => {
        const meta = RIDE_STATUS[s] ?? { label: String(s), color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: '上車點', dataIndex: 'pickup_address', ellipsis: true },
    { title: '司機', dataIndex: 'driver_id', width: 100, render: (d: number | null) => d ?? '—' },
    {
      title: '里程(m)',
      dataIndex: 'distance_m',
      width: 110,
      render: (m: number | null) => m ?? '—',
    },
    {
      title: '叫車時間',
      dataIndex: 'requested_at',
      width: 180,
      render: fmtTime,
    },
    {
      title: '完成時間',
      dataIndex: 'completed_at',
      width: 180,
      render: fmtTime,
    },
  ];

  return (
    <>
      <PageHeader
        title="訂單管理"
        extra={
          <Select value={status} options={statusOptions} onChange={setStatus} style={{ width: 140 }} />
        }
      />
      <Card>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={rides}
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 筆` }}
        size="middle"
        locale={{ emptyText: <Empty description="目前沒有資料" /> }}
        onRow={(record) => ({
          onClick: () => navigate(`/orders/${record.id}`),
          style: { cursor: 'pointer' },
        })}
      />
      </Card>
    </>
  );
}

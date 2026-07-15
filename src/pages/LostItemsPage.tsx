import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { fetchLostItems, type LostItem, type LostItemStatus } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { fmtYuan } from '../utils/money';

// 協尋單狀態 → 顯示標籤與顏色（狀態機：open→found→paid→returned；open/found 可 closed）
const LOST_ITEM_STATUS: Record<LostItemStatus, { label: string; color: string }> = {
  open: { label: '待尋找', color: 'processing' },
  found: { label: '已尋獲', color: 'warning' },
  paid: { label: '已付款', color: 'cyan' },
  returned: { label: '已歸還', color: 'success' },
  closed: { label: '已結案', color: 'default' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: '全部狀態' },
  ...Object.entries(LOST_ITEM_STATUS).map(([value, m]) => ({ value, label: m.label })),
];

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('zh-TW') : '—';
}

const columns: ColumnsType<LostItem> = [
  { title: '單號', dataIndex: 'id', width: 70 },
  {
    title: '行程',
    dataIndex: 'ride_id',
    width: 90,
    render: (rideId: number) => <Link to={`/orders/${rideId}`}>#{rideId}</Link>,
  },
  { title: '乘客', dataIndex: 'customer_name', render: (n: string, r) => n || `乘客 #${r.customer_id}` },
  { title: '司機', dataIndex: 'driver_name', render: (n: string, r) => n || `司機 #${r.driver_id}` },
  { title: '遺失物描述', dataIndex: 'description', ellipsis: true },
  {
    title: '處理費',
    dataIndex: 'fee_cents',
    width: 130,
    align: 'right',
    render: (c: number, r) => (
      <Typography.Text>
        {fmtYuan(c)} <Typography.Text type="secondary">({r.fee_bps / 100}%)</Typography.Text>
      </Typography.Text>
    ),
  },
  {
    title: '狀態',
    dataIndex: 'status',
    width: 100,
    render: (s: LostItemStatus) => {
      const meta = LOST_ITEM_STATUS[s] ?? { label: s, color: 'default' };
      return <Tag color={meta.color}>{meta.label}</Tag>;
    },
  },
  { title: '建立時間', dataIndex: 'created_at', width: 180, render: fmtTime },
  { title: '付款時間', dataIndex: 'paid_at', width: 180, render: fmtTime },
];

export default function LostItemsPage() {
  const [status, setStatus] = useState<'all' | LostItemStatus>('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['lost-items', status],
    queryFn: () => fetchLostItems(status === 'all' ? undefined : status),
  });

  const activeCount = items.filter((i) => i.status === 'open' || i.status === 'found').length;

  return (
    <>
      <PageHeader
        title="遺失物協尋"
        extra={
          <Select
            value={status}
            style={{ width: 130 }}
            options={STATUS_OPTIONS}
            onChange={(v) => setStatus(v as typeof status)}
          />
        }
      />
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Tag color="processing">進行中 {activeCount}</Tag>
          <Tag>總計 {items.length}</Tag>
        </Space>
        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 筆` }}
          size="middle"
          locale={{ emptyText: <Empty description="尚無協尋單" /> }}
        />
      </Card>
    </>
  );
}

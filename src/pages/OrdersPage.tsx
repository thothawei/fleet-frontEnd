import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Empty, Input, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

import { fetchRides, type RideRow } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { RIDE_STATUS } from '../constants';

const statusOptions = [
  { value: -1, label: '全部狀態' },
  ...Object.entries(RIDE_STATUS).map(([k, v]) => ({ value: Number(k), label: v.label })),
];

const PAGE_SIZE = 20;

function fmtTime(t: string | null): string {
  return t ? new Date(t).toLocaleString('zh-TW') : '—';
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<number>(-1);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [page, setPage] = useState(1);

  // 關鍵字打字防抖：停止輸入 400ms 才送查詢，避免每個按鍵打一次後端
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword.trim()), 400);
    return () => clearTimeout(t);
  }, [keyword]);

  // 任一篩選條件變動就回到第一頁
  useEffect(() => {
    setPage(1);
  }, [status, range, debouncedKw]);

  const from = range ? range[0].format('YYYY-MM-DD') : undefined;
  const to = range ? range[1].format('YYYY-MM-DD') : undefined;

  const { data, isFetching } = useQuery({
    queryKey: ['rides', { status, from, to, q: debouncedKw, page }],
    queryFn: () =>
      fetchRides({
        status: status === -1 ? undefined : status,
        from,
        to,
        q: debouncedKw || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const rides = data?.rides ?? [];
  const total = data?.total ?? 0;

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
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜尋訂單 ID / 上車點"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 220 }}
            />
            <DatePicker.RangePicker
              value={range}
              onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
            />
            <Select value={status} options={statusOptions} onChange={setStatus} style={{ width: 140 }} />
          </Space>
        }
      />
      <Card>
      <Table
        rowKey="id"
        loading={isFetching}
        columns={columns}
        dataSource={rides}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 筆`,
          onChange: setPage,
        }}
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

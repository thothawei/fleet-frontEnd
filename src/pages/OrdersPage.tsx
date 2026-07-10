import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Empty, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

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

/** 後端 `/admin/rides` 只吃 status + limit（無 offset／日期／關鍵字），故日期與搜尋在前端過濾。 */
const RIDES_LIMIT = 100;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<number>(-1);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [keyword, setKeyword] = useState('');
  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['rides', status],
    queryFn: () => fetchRides(status === -1 ? undefined : status, RIDES_LIMIT),
  });

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rides.filter((r) => {
      if (range) {
        const t = new Date(r.requested_at).getTime();
        if (t < range[0].startOf('day').valueOf() || t > range[1].endOf('day').valueOf()) {
          return false;
        }
      }
      if (!kw) return true;
      return String(r.id).includes(kw) || (r.pickup_address ?? '').toLowerCase().includes(kw);
    });
  }, [rides, range, keyword]);

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
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        日期與關鍵字在最近 {RIDES_LIMIT} 筆訂單內篩選（後端尚未支援分頁查詢）。
      </Typography.Text>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={filtered}
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

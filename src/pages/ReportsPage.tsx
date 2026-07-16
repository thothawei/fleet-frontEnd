import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Empty, Space, Table } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

import { fetchDailyReport, type DailyReportRow } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { downloadCsv, toCsv } from '../utils/csv';
import { fmtYuan, yuanForCsv } from '../utils/money';

export default function ReportsPage() {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const dateStr = date.format('YYYY-MM-DD');

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['daily-report', dateStr],
    queryFn: () => fetchDailyReport(dateStr),
    // 本頁有 inline Alert 呈現讀取失敗，退出全域 query 錯誤提示避免雙重訊息
    meta: { suppressGlobalError: true },
  });

  const summary = useMemo(
    () => ({
      trips: rows.reduce((s, r) => s + r.trip_count, 0),
      distanceKm: rows.reduce((s, r) => s + r.total_distance_m, 0) / 1000,
      revenueCents: rows.reduce((s, r) => s + (r.total_revenue_cents ?? 0), 0),
    }),
    [rows],
  );

  function handleExport() {
    const csv = toCsv(
      ['司機ID', '司機', '趟數', '總里程(km)', '平均接客(分)', '營業額(元)', '手續費(元)', '司機實得(元)'],
      rows.map((r) => [
        r.driver_id,
        r.driver_name,
        r.trip_count,
        (r.total_distance_m / 1000).toFixed(2),
        (r.avg_pickup_sec / 60).toFixed(1),
        yuanForCsv(r.total_revenue_cents),
        yuanForCsv(r.total_commission_cents),
        yuanForCsv(r.driver_net_cents),
      ]),
    );
    downloadCsv(`日報表-${dateStr}.csv`, csv);
  }

  const columns: ColumnsType<DailyReportRow> = [
    { title: '司機', dataIndex: 'driver_name' },
    { title: '趟數', dataIndex: 'trip_count', width: 90 },
    {
      title: '總里程(km)',
      dataIndex: 'total_distance_m',
      width: 120,
      render: (m: number) => (m / 1000).toFixed(2),
    },
    {
      title: '平均接客(分)',
      dataIndex: 'avg_pickup_sec',
      width: 120,
      render: (s: number) => (s / 60).toFixed(1),
    },
    {
      title: '營業額',
      dataIndex: 'total_revenue_cents',
      width: 140,
      align: 'right',
      render: (c: number) => fmtYuan(c),
    },
    {
      title: '手續費',
      dataIndex: 'total_commission_cents',
      width: 140,
      align: 'right',
      render: (c: number) => fmtYuan(c),
    },
    {
      title: '司機實得',
      dataIndex: 'driver_net_cents',
      width: 140,
      align: 'right',
      render: (c: number) => fmtYuan(c),
    },
  ];

  return (
    <>
      <PageHeader
        title="日報表"
        extra={
          <Space>
            <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} />
            <Button icon={<DownloadOutlined />} disabled={rows.length === 0} onClick={handleExport}>
              匯出 CSV
            </Button>
          </Space>
        }
      />
      <Card>
      {isError && (
        <Alert type="error" title="日報表載入失敗，請稍後再試" showIcon style={{ marginBottom: 16 }} />
      )}
      {!isLoading && rows.length > 0 && (
        <Alert
          type="info"
          showIcon
          title={`${dateStr} 合計：${summary.trips} 趟 · ${summary.distanceKm.toFixed(2)} km · 營業額 ${fmtYuan(summary.revenueCents)}`}
          style={{ marginBottom: 16 }}
        />
      )}
      <Table
        rowKey="driver_id"
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description="目前沒有資料" /> }}
      />
      </Card>
    </>
  );
}

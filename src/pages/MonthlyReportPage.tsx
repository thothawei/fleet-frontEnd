import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Empty, Space, Table } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

import { fetchMonthlyReport, type MonthlyReportRow } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { downloadCsv, toCsv } from '../utils/csv';
import { fmtYuan, yuanForCsv } from '../utils/money';

export default function MonthlyReportPage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const monthStr = month.format('YYYY-MM');

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['monthly-report', monthStr],
    queryFn: () => fetchMonthlyReport(monthStr),
    // 本頁有 inline Alert 呈現讀取失敗，退出全域 query 錯誤提示避免雙重訊息
    meta: { suppressGlobalError: true },
  });

  const totals = useMemo(
    () => ({
      trips: rows.reduce((s, r) => s + r.trip_count, 0),
      revenue: rows.reduce((s, r) => s + (r.total_revenue_cents ?? 0), 0),
      commission: rows.reduce((s, r) => s + (r.total_commission_cents ?? 0), 0),
      cleaning: rows.reduce((s, r) => s + (r.total_cleaning_fee_cents ?? 0), 0),
      membership: rows.reduce((s, r) => s + (r.membership_fee_cents ?? 0), 0),
      owed: rows.reduce((s, r) => s + (r.owed_to_hq_cents ?? 0), 0),
      net: rows.reduce((s, r) => s + (r.driver_net_cents ?? 0), 0),
    }),
    [rows],
  );

  function handleExport() {
    const csv = toCsv(
      ['司機ID', '司機', '趟數', '營業額(元)', '手續費(元)', '清潔費(元)', '月會費(元)', '應付總公司(元)', '司機實得(元)'],
      rows.map((r) => [
        r.driver_id,
        r.driver_name,
        r.trip_count,
        yuanForCsv(r.total_revenue_cents),
        yuanForCsv(r.total_commission_cents),
        yuanForCsv(r.total_cleaning_fee_cents ?? 0),
        yuanForCsv(r.membership_fee_cents),
        yuanForCsv(r.owed_to_hq_cents),
        yuanForCsv(r.driver_net_cents),
      ]),
    );
    downloadCsv(`月報表-${monthStr}.csv`, csv);
  }

  const columns: ColumnsType<MonthlyReportRow> = [
    { title: '司機', dataIndex: 'driver_name', fixed: 'left' },
    { title: '趟數', dataIndex: 'trip_count', width: 90 },
    { title: '營業額', dataIndex: 'total_revenue_cents', width: 140, align: 'right', render: (c: number) => fmtYuan(c) },
    { title: '手續費', dataIndex: 'total_commission_cents', width: 140, align: 'right', render: (c: number) => fmtYuan(c) },
    // O6：清潔費不計入營業額與抽成（故不影響「應付總公司」），但含在司機實得裡。
    { title: '清潔費', dataIndex: 'total_cleaning_fee_cents', width: 130, align: 'right', render: (c: number) => fmtYuan(c ?? 0) },
    { title: '月會費', dataIndex: 'membership_fee_cents', width: 140, align: 'right', render: (c: number) => fmtYuan(c) },
    {
      title: '應付總公司',
      dataIndex: 'owed_to_hq_cents',
      width: 150,
      align: 'right',
      render: (c: number) => <strong>{fmtYuan(c)}</strong>,
    },
    { title: '司機實得', dataIndex: 'driver_net_cents', width: 140, align: 'right', render: (c: number) => fmtYuan(c) },
  ];

  return (
    <>
      <PageHeader
        title="月營運報表"
        extra={
          <Space>
            <DatePicker picker="month" value={month} onChange={(d) => d && setMonth(d)} allowClear={false} />
            <Button icon={<DownloadOutlined />} disabled={rows.length === 0} onClick={handleExport}>
              匯出 CSV
            </Button>
          </Space>
        }
      />
      <Card>
        {isError && (
          <Alert type="error" title="月報表載入失敗，請稍後再試" showIcon style={{ marginBottom: 16 }} />
        )}
        {!isLoading && rows.length > 0 && (
          <Alert
            type="info"
            showIcon
            title={`${monthStr} 合計：${totals.trips} 趟 · 營業額 ${fmtYuan(totals.revenue)} · 應付總公司 ${fmtYuan(totals.owed)}`}
            description="會費以「會費帳單」頁產生的金額為準（快照，不受日後費率調整影響）；尚未產生帳單的月份會費顯示為 NT$ 0，可至該頁按「產生本月帳單」。"
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
          summary={(data) =>
            data.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>合計</Table.Summary.Cell>
                <Table.Summary.Cell index={1}>{totals.trips}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">{fmtYuan(totals.revenue)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">{fmtYuan(totals.commission)}</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">{fmtYuan(totals.cleaning)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">{fmtYuan(totals.membership)}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right"><strong>{fmtYuan(totals.owed)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">{fmtYuan(totals.net)}</Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          }
        />
      </Card>
    </>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, DatePicker, Empty, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { FileAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

import {
  fetchMembershipInvoices,
  generateMembershipInvoices,
  setMembershipInvoicePaid,
  type MembershipInvoice,
} from '../api/admin';
import PageHeader from '../components/PageHeader';
import { isSuperadmin } from '../auth/auth';
import { apiError } from '../utils/apiError';
import { fmtYuan } from '../utils/money';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部狀態' },
  { value: 'unpaid', label: '未繳' },
  { value: 'paid', label: '已繳' },
];

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('zh-TW') : '—';
}

export default function MembershipInvoicesPage() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const canWrite = isSuperadmin();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [status, setStatus] = useState<'all' | 'unpaid' | 'paid'>('all');
  const monthStr = month.format('YYYY-MM');

  const queryKey = ['membership-invoices', monthStr, status];
  const { data: invoices = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchMembershipInvoices(monthStr, status === 'all' ? undefined : status),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['membership-invoices', monthStr] });

  const generateMutation = useMutation({
    mutationFn: () => generateMembershipInvoices(monthStr),
    onSuccess: ({ created }) => {
      message.success(created > 0 ? `已產生 ${created} 筆會費帳單` : '本月無新帳單可產生（已是最新）');
      invalidate();
    },
    onError: (err) => message.error(apiError(err, '產生帳單失敗')),
  });

  const paidMutation = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) => setMembershipInvoicePaid(id, paid),
    onSuccess: (_data, { paid }) => {
      message.success(paid ? '已標記為已繳' : '已改為未繳');
      invalidate();
    },
    onError: (err) => message.error(apiError(err, '更新失敗')),
  });

  const columns: ColumnsType<MembershipInvoice> = [
    { title: '司機', dataIndex: 'driver_name', render: (n: string, r) => n || `司機 #${r.driver_id}` },
    { title: '期別', dataIndex: 'period', width: 110 },
    {
      title: '會費金額',
      dataIndex: 'amount_cents',
      width: 150,
      align: 'right',
      render: (c: number) => fmtYuan(c),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      width: 100,
      render: (s: string) =>
        s === 'paid' ? <Tag color="success">已繳</Tag> : <Tag color="warning">未繳</Tag>,
    },
    { title: '繳費時間', dataIndex: 'paid_at', width: 190, render: fmtTime },
  ];

  if (canWrite) {
    columns.push({
      title: '操作',
      width: 120,
      render: (_: unknown, r: MembershipInvoice) => {
        const toPaid = r.status !== 'paid';
        return (
          <Popconfirm
            title={toPaid ? `標記「${r.driver_name}」${r.period} 為已繳？` : '改回未繳？'}
            okText="確定"
            cancelText="取消"
            onConfirm={() => paidMutation.mutate({ id: r.id, paid: toPaid })}
          >
            <Button
              size="small"
              type={toPaid ? 'primary' : 'default'}
              loading={paidMutation.isPending && paidMutation.variables?.id === r.id}
            >
              {toPaid ? '標記已繳' : '改未繳'}
            </Button>
          </Popconfirm>
        );
      },
    });
  }

  const unpaidCount = invoices.filter((i) => i.status === 'unpaid').length;

  return (
    <>
      <PageHeader
        title="會費帳單"
        extra={
          <Space wrap>
            <DatePicker
              picker="month"
              value={month}
              allowClear={false}
              onChange={(v) => v && setMonth(v)}
            />
            <Select
              value={status}
              style={{ width: 130 }}
              options={STATUS_OPTIONS}
              onChange={(v) => setStatus(v as typeof status)}
            />
            {canWrite && (
              <Popconfirm
                title={`為 ${monthStr} 有完成行程的司機產生會費帳單？`}
                description="冪等操作：重跑只補新活躍司機、不會重複開帳。"
                okText="確定"
                cancelText="取消"
                onConfirm={() => generateMutation.mutate()}
              >
                <Button type="primary" icon={<FileAddOutlined />} loading={generateMutation.isPending}>
                  產生本月帳單
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      />
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Tag color="warning">未繳 {unpaidCount}</Tag>
          <Tag color="success">已繳 {invoices.length - unpaidCount}</Tag>
        </Space>
        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={invoices}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 筆` }}
          size="middle"
          locale={{
            emptyText: <Empty description={`${monthStr} 尚無會費帳單，可按「產生本月帳單」`} />,
          }}
        />
      </Card>
    </>
  );
}

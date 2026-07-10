import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Empty, Row, Skeleton, Statistic, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';

import { fetchDrivers, fetchFleet, fetchRides, type RideRow } from '../api/admin';
import { RIDE_STATUS, DRIVER_STATUS_DISABLED } from '../constants';
import { SEMANTIC } from '../theme/tokens';

/** requested_at 是否為今天（本地時區） */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const recentColumns = [
  { title: '編號', dataIndex: 'id', render: (id: number) => <Link to={`/orders/${id}`}>#{id}</Link> },
  { title: '上車地址', dataIndex: 'pickup_address', ellipsis: true },
  {
    title: '狀態',
    dataIndex: 'status',
    render: (s: number) => {
      const meta = RIDE_STATUS[s];
      return meta ? <Tag color={meta.color}>{meta.label}</Tag> : s;
    },
  },
  {
    title: '叫車時間',
    dataIndex: 'requested_at',
    render: (t: string) => new Date(t).toLocaleTimeString('zh-TW'),
  },
];

export default function DashboardPage() {
  const { data: rides = [], isLoading: ridesLoading } = useQuery({ queryKey: ['rides', 'dashboard'], queryFn: () => fetchRides(undefined, 200) });
  const { data: drivers = [], isLoading: driversLoading } = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers });
  const { data: fleet = [] } = useQuery({ queryKey: ['fleet'], queryFn: fetchFleet });

  const kpi = useMemo(() => {
    const todayRides = rides.filter((r: RideRow) => isToday(r.requested_at));
    return {
      today: todayRides.length,
      done: todayRides.filter((r) => r.status === 4).length,
      cancelled: todayRides.filter((r) => r.status === 9).length,
      active: rides.filter((r) => r.status >= 1 && r.status <= 3).length,
      online: drivers.filter((d) => d.Status !== 0 && d.Status !== DRIVER_STATUS_DISABLED).length,
    };
  }, [rides, drivers]);

  const loading = ridesLoading || driversLoading;
  const recent = useMemo(() => rides.slice(0, 10), [rides]);

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>營運總覽</Typography.Title>
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={8} lg={4}>
              <Card>
                <div data-testid="kpi-today">
                  <Statistic title="今日訂單" value={kpi.today} />
                </div>
              </Card>
            </Col>
            <Col xs={12} md={8} lg={4}>
              <Card>
                <div data-testid="kpi-done">
                  <Statistic title="今日完成" value={kpi.done} styles={{ content: { color: SEMANTIC.done } }} />
                </div>
              </Card>
            </Col>
            <Col xs={12} md={8} lg={4}>
              <Card>
                <div data-testid="kpi-cancelled">
                  <Statistic title="今日取消" value={kpi.cancelled} styles={{ content: { color: SEMANTIC.danger } }} />
                </div>
              </Card>
            </Col>
            <Col xs={12} md={8} lg={4}>
              <Card>
                <div data-testid="kpi-online">
                  <Statistic title="在線司機" value={kpi.online} styles={{ content: { color: SEMANTIC.active } }} />
                </div>
              </Card>
            </Col>
            <Col xs={12} md={8} lg={4}>
              <Card>
                <div data-testid="kpi-active">
                  <Statistic title="進行中行程" value={kpi.active} styles={{ content: { color: SEMANTIC.waiting } }} />
                </div>
              </Card>
            </Col>
            <Col xs={12} md={8} lg={4}>
              <Card>
                <Statistic title="回報位置車輛" value={fleet.length} />
              </Card>
            </Col>
          </Row>
          <Card
            title="最近訂單"
            extra={<Link to="/orders">全部訂單 →</Link>}
            style={{ marginTop: 16 }}
          >
            <Table
              rowKey="id"
              size="small"
              columns={recentColumns}
              dataSource={recent}
              pagination={false}
              locale={{ emptyText: <Empty description="今天還沒有訂單" /> }}
            />
          </Card>
        </>
      )}
    </div>
  );
}

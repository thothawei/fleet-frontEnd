import { useQuery } from '@tanstack/react-query';
import { Breadcrumb, Button, Card, Descriptions, Empty, Skeleton, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { fetchDrivers } from '../api/admin';
import PageHeader from '../components/PageHeader';
import { DRIVER_STATUS } from '../constants';

function fmtTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-TW');
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const driverId = Number(id);

  // 後端無單筆司機端點，沿用列表資料（列表快取命中則免再打；直接開此頁則自動抓一次）
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: fetchDrivers,
  });

  const driver = drivers.find((d) => d.ID === driverId);

  const backButton = (
    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/drivers')}>
      返回司機列表
    </Button>
  );

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: <Link to="/drivers">司機管理</Link> }, { title: `司機 #${driverId}` }]}
      />
      <PageHeader title={driver ? `司機：${driver.Name}` : `司機 #${driverId}`} extra={backButton} />
      <Card>
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : driver ? (
          <Descriptions
            column={1}
            bordered
            size="middle"
            styles={{ label: { width: 160 } }}
            items={[
              { key: 'id', label: 'ID', children: driver.ID },
              { key: 'name', label: '姓名', children: driver.Name || '—' },
              { key: 'phone', label: '電話', children: driver.Phone || '—' },
              { key: 'line', label: 'LINE User ID', children: driver.LineUserID || '—' },
              {
                key: 'status',
                label: '狀態',
                children: (() => {
                  const meta = DRIVER_STATUS[driver.Status] ?? {
                    label: String(driver.Status),
                    color: 'default',
                  };
                  return <Tag color={meta.color}>{meta.label}</Tag>;
                })(),
              },
              { key: 'created', label: '建立時間', children: fmtTime(driver.CreatedAt) },
              { key: 'updated', label: '更新時間', children: fmtTime(driver.UpdatedAt) },
            ]}
          />
        ) : (
          <Empty description={`找不到司機 #${driverId}`}>{backButton}</Empty>
        )}
      </Card>
    </>
  );
}

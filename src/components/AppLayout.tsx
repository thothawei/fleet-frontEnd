import { BarChartOutlined, CarOutlined, DashboardOutlined, DollarOutlined, EnvironmentOutlined, LogoutOutlined, OrderedListOutlined, ScheduleOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import { App, Layout, Menu, Typography, Button } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearSession, getAdminName, getRole } from '../auth/auth';
import { BRAND_PRIMARY } from '../theme/tokens';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '營運總覽' },
  { key: '/fleet', icon: <EnvironmentOutlined />, label: '即時車隊' },
  { key: '/orders', icon: <OrderedListOutlined />, label: '訂單管理' },
  { key: '/drivers', icon: <CarOutlined />, label: '司機管理' },
  { key: '/reports', icon: <BarChartOutlined />, label: '日報表' },
  { key: '/reports/monthly', icon: <ScheduleOutlined />, label: '月報表' },
  { key: '/settings', icon: <SettingOutlined />, label: '設定' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { modal } = App.useApp();

  const logout = () => {
    modal.confirm({
      title: '確定要登出？',
      okText: '登出',
      cancelText: '取消',
      onOk: () => {
        clearSession();
        navigate('/login');
      },
    });
  };

  // 費率設定、使用者管理僅 superadmin 可見（後端亦有對應權限檢查）
  const items =
    getRole() === 'superadmin'
      ? [
          ...menuItems,
          { key: '/settings/fees', icon: <DollarOutlined />, label: '費率設定' },
          { key: '/users', icon: <TeamOutlined />, label: '使用者管理' },
        ]
      : menuItems;

  // 詳情頁（/orders/:id、/drivers/:id）時側欄仍高亮對應主選單
  const selectedKey = location.pathname.startsWith('/orders')
    ? '/orders'
    : location.pathname.startsWith('/drivers')
      ? '/drivers'
      : location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" breakpoint="lg" collapsedWidth="0">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 24px' }}>
          <span
            style={{
              width: 32, height: 32, borderRadius: 8, background: BRAND_PRIMARY,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}
          >
            🚗
          </span>
          <Typography.Text strong>Fleet 派遣後台</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 24, borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Text strong>叫車派遣營運後台</Typography.Text>
          <span>
            <Typography.Text style={{ marginRight: 16 }}>{getAdminName()}</Typography.Text>
            <Button icon={<LogoutOutlined />} onClick={logout}>登出</Button>
          </span>
        </Header>
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

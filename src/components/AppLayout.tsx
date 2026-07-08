import { BarChartOutlined, CarOutlined, DashboardOutlined, LogoutOutlined, OrderedListOutlined, SettingOutlined } from '@ant-design/icons';
import { Layout, Menu, Typography, Button } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { clearSession, getAdminName } from '../auth/auth';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '即時車隊' },
  { key: '/orders', icon: <OrderedListOutlined />, label: '訂單管理' },
  { key: '/drivers', icon: <CarOutlined />, label: '司機管理' },
  { key: '/reports', icon: <BarChartOutlined />, label: '日報表' },
  { key: '/settings', icon: <SettingOutlined />, label: '設定' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" breakpoint="lg" collapsedWidth="0">
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 18, padding: '16px 24px' }}>
          🚗 派遣後台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingInline: 24 }}>
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

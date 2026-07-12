import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';

import AppLayout from './components/AppLayout';
import { fetchMe } from './api/admin';
import { getRole, getTokenExpiry, isLoggedIn, setRole } from './auth/auth';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FleetPage = lazy(() => import('./pages/FleetPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const DriverDetailPage = lazy(() => import('./pages/DriverDetailPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const MonthlyReportPage = lazy(() => import('./pages/MonthlyReportPage'));
const MembershipInvoicesPage = lazy(() => import('./pages/MembershipInvoicesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FeeSettingsPage = lazy(() => import('./pages/FeeSettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Spin size="large" />
    </div>
  );
}

// 角色 rank：數字越大權限越高
const ROLE_RANK: Record<string, number> = { viewer: 1, dispatcher: 2, superadmin: 3 };

// 角色守衛：rank 不足導回首頁
export function RequireRole({ min, children }: { min: string; children: ReactNode }) {
  const sufficient = (ROLE_RANK[getRole()] ?? 0) >= (ROLE_RANK[min] ?? 99);
  return sufficient ? <>{children}</> : <Navigate to="/" replace />;
}

/**
 * 受保護路由：未登入導回 /login。
 *
 * 已登入但尚未取得 role（例如硬重新整理直接進到受保護頁面）時，先掛載時打
 * `fetchMe()` 補 role，並在補齊前顯示 loading——避免 `getRole()` 暫時為空
 * 導致下層 `RequireRole` 誤判權限不足而導回首頁（race condition）。
 * fetchMe 失敗時仍放行，交由後端與 RequireRole 把關。
 *
 * 另外依 JWT `exp` 排一個到期鬧鐘：使用者停在頁面上不發任何請求時，
 * 沒有 401 可以觸發登出，靠這個 timer 在 token 過期當下導回登入。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [roleReady, setRoleReady] = useState(() => !isLoggedIn() || !!getRole());
  const [, setExpiredTick] = useState(0);

  useEffect(() => {
    const exp = getTokenExpiry();
    if (exp === null) return;
    // setTimeout 的 delay 超過 2^31-1 會溢位成立即觸發，需 clamp
    const delay = Math.max(0, Math.min(exp * 1000 - Date.now(), 2 ** 31 - 1));
    const timer = setTimeout(() => setExpiredTick((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (roleReady) return;
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setRole(me.role);
      })
      .catch(() => {
        /* 後端仍會擋，交由 RequireRole 導向首頁即可 */
      })
      .finally(() => {
        if (!cancelled) setRoleReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [roleReady]);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!roleReady) return <PageLoader />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/drivers/:id" element={<DriverDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/monthly" element={<MonthlyReportPage />} />
          <Route path="/membership-invoices" element={<MembershipInvoicesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/settings/fees"
            element={
              <RequireRole min="superadmin">
                <FeeSettingsPage />
              </RequireRole>
            }
          />
          <Route
            path="/users"
            element={
              <RequireRole min="superadmin">
                <UsersPage />
              </RequireRole>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

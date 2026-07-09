import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';

import AppLayout from './components/AppLayout';
import { fetchMe } from './api/admin';
import { getRole, isLoggedIn, setRole } from './auth/auth';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const FleetPage = lazy(() => import('./pages/FleetPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
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
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [roleReady, setRoleReady] = useState(() => !isLoggedIn() || !!getRole());

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
          <Route path="/" element={<FleetPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
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

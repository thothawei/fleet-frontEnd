import axios from 'axios';

import { API_BASE } from '../config';
import { clearSession, getToken, isTokenExpired } from '../auth/auth';

// 統一的 axios 實例：自動帶 JWT、token 過期或 401 時清 session 並導回登入
export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

function expireSession(): void {
  clearSession();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (!token) return cfg;
  // token 已過期就不必送出——後端只會回 401，先在本地結束這一輪
  if (isTokenExpired(token)) {
    expireSession();
    return Promise.reject(new Error('登入已過期，請重新登入'));
  }
  cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      expireSession();
    }
    return Promise.reject(err);
  },
);

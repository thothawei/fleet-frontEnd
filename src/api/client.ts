import axios from 'axios';

import { API_BASE } from '../config';
import { clearSession, getToken } from '../auth/auth';

// 統一的 axios 實例：自動帶 JWT、401 時清 session 並導回登入
export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// 後台管理員登入狀態：token 存 localStorage
const TOKEN_KEY = 'fleet_admin_token';
const NAME_KEY = 'fleet_admin_name';
const ROLE_KEY = 'fleet_admin_role';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminName(): string {
  return localStorage.getItem(NAME_KEY) ?? '管理員';
}

export function getRole(): string {
  return localStorage.getItem(ROLE_KEY) ?? '';
}

export function setRole(role: string): void {
  localStorage.setItem(ROLE_KEY, role);
}

export function saveSession(token: string, name: string, role = ''): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, name);
  if (role) localStorage.setItem(ROLE_KEY, role);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

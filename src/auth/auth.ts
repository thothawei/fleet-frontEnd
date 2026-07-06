// 後台管理員登入狀態：token 存 localStorage
const TOKEN_KEY = 'fleet_admin_token';
const NAME_KEY = 'fleet_admin_name';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminName(): string {
  return localStorage.getItem(NAME_KEY) ?? '管理員';
}

export function saveSession(token: string, name: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, name);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

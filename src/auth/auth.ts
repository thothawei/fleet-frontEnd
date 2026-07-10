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

/**
 * 取出 JWT payload 的 `exp`（秒）。
 *
 * 只解析、不驗簽——簽章仍由後端把關；前端拿 exp 僅為了在過期前主動導回登入，
 * 避免使用者在畫面上操作半天才被 401 打斷。
 * 非三段式 JWT、base64 壞掉、或沒有 exp 時回 null（視同不過期，交給後端 401）。
 */
export function getTokenExpiry(token: string | null = getToken()): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** token 是否已過期。無 token、或無法解析出 exp 時皆回 false（不主動登出）。 */
export function isTokenExpired(token: string | null = getToken()): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return false;
  return exp * 1000 <= Date.now();
}

export function isLoggedIn(): boolean {
  const token = getToken();
  if (!token) return false;
  if (isTokenExpired(token)) {
    clearSession();
    return false;
  }
  return true;
}

// dispatcher 以上（含 superadmin）才能執行寫入操作；viewer 僅唯讀。
// 後端仍會用 403 強制把關，此處僅用於前端 UX 降級（禁用按鈕、提示原因）。
export function canDispatch(): boolean {
  return ['dispatcher', 'superadmin'].includes(getRole());
}

// 費率／會費設定、帳號管理僅 superadmin。後端亦以 403 把關，此處僅用於前端 UX。
export function isSuperadmin(): boolean {
  return getRole() === 'superadmin';
}

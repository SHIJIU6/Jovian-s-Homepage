/**
 * 认证模块
 * 处理登录、登出和 Token 管理
 */

const AUTH_TOKEN_KEY = 'javian_auth_token';

// 登录
export async function login(password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || '登录失败');
  }

  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  return data;
}

// 登出
export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// 获取 Token
export function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// 检查是否已登录
export function isAuthenticated() {
  return !!getToken();
}

// 获取带 Token 的请求头
export function getAuthHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

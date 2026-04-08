const AUTH_TOKEN_KEY = "javian_auth_token";

async function readJson(response, fallback) {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

export async function login(password) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const result = await readJson(response, {});
  if (!response.ok) {
    throw new Error(result.error || "登录失败");
  }

  localStorage.setItem(AUTH_TOKEN_KEY, result.token);
  return result;
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function jsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}

export function getBearerToken(request) {
  const authHeader = request.headers.get("Authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

export async function requireAuth(context) {
  const token = getBearerToken(context.request);
  if (!token) {
    return {
      ok: false,
      response: jsonResponse({ error: "未提供授权令牌" }, { status: 401 }),
    };
  }

  const tokenData = await context.env.AUTH_TOKENS.get(token);
  if (!tokenData) {
    return {
      ok: false,
      response: jsonResponse({ error: "Token 无效或已过期" }, { status: 401 }),
    };
  }

  return {
    ok: true,
    token,
    tokenData,
  };
}

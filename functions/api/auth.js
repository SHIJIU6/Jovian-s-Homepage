/**
 * 身份验证 API
 * POST /api/auth - 验证密码并返回 Token
 *
 * @requires ADMIN_PASSWORD - 环境变量中的管理员密码
 * @requires AUTH_TOKENS - KV namespace 用于存储有效 token
 */

export async function onRequestPost(context) {
  try {
    const { password } = await context.request.json();
    const correctPassword = context.env.ADMIN_PASSWORD;

    // 验证密码
    if (!correctPassword) {
      return new Response(JSON.stringify({ error: "服务器未配置密码" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (password !== correctPassword) {
      return new Response(JSON.stringify({ error: "密码错误" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 生成 Token (UUID + 时间戳)
    const token = crypto.randomUUID() + "-" + Date.now();

    // 存储 Token 到 KV (有效期 24 小时)
    await context.env.AUTH_TOKENS.put(
      token,
      JSON.stringify({
        createdAt: Date.now(),
        valid: true,
      }),
      { expirationTtl: 86400 },
    );

    return new Response(
      JSON.stringify({
        success: true,
        token,
        expiresIn: 86400, // 24 小时
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "请求处理失败" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// 验证 Token 是否有效 (供其他 API 调用)
export async function verifyToken(context, token) {
  if (!token) return false;

  try {
    const tokenData = await context.env.AUTH_TOKENS.get(token);
    return tokenData !== null;
  } catch {
    return false;
  }
}

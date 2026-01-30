/**
 * 图片上传 API
 * POST /api/upload - 上传图片到 R2
 * 
 * @requires IMAGES - R2 bucket 用于存储图片
 * @requires AUTH_TOKENS - KV namespace 用于验证 token
 */

// POST: 上传图片
export async function onRequestPost(context) {
  try {
    // 验证 Token
    const authHeader = context.request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: '未提供授权令牌' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tokenData = await context.env.AUTH_TOKENS.get(token);
    if (!tokenData) {
      return new Response(JSON.stringify({ error: 'Token 无效或已过期' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 解析 multipart form data
    const formData = await context.request.formData();
    const file = formData.get('file');
    const type = formData.get('type'); // 'avatar' 或 'background'

    if (!file || !type) {
      return new Response(JSON.stringify({ error: '缺少文件或类型参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: '不支持的图片格式' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 生成文件名
    const ext = file.name.split('.').pop();
    const filename = `${type}_${Date.now()}.${ext}`;

    // 上传到 R2
    await context.env.IMAGES.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type
      }
    });

    // 返回图片 URL
    const imageUrl = `/api/images/${filename}`;

    return new Response(JSON.stringify({ 
      success: true,
      filename,
      url: imageUrl,
      type
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: '上传失败: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

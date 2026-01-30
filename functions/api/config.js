/**
 * 配置读写 API
 * GET /api/config - 获取网站配置
 * POST /api/config - 保存网站配置 (需要验证)
 * 
 * @requires SITE_CONFIG - KV namespace 用于存储配置
 * @requires AUTH_TOKENS - KV namespace 用于验证 token
 */

const CONFIG_KEY = 'homepage_config';

// GET: 获取配置
export async function onRequestGet(context) {
  try {
    const config =
      (await context.env.SITE_CONFIG.get(CONFIG_KEY, { type: "json" })) ||
      getDefaultConfig();

    const updatedAt = typeof config?.updatedAt === "number" ? config.updatedAt : 0;
    const etag = `W/\"${updatedAt}\"`;

    const ifNoneMatch = context.request.headers.get("If-None-Match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    return new Response(JSON.stringify(config), {
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify(getDefaultConfig()), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST: 保存配置 (需要验证)
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

    // 检查 Token 是否有效
    const tokenData = await context.env.AUTH_TOKENS.get(token);
    if (!tokenData) {
      return new Response(JSON.stringify({ error: 'Token 无效或已过期' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取并保存配置
    const config = await context.request.json();
    
    // 添加更新时间戳
    config.updatedAt = Date.now();
    
    await context.env.SITE_CONFIG.put(CONFIG_KEY, JSON.stringify(config));

    return new Response(JSON.stringify({ 
      success: true,
      message: '配置已保存',
      updatedAt: config.updatedAt
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: '保存失败: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 默认配置
function getDefaultConfig() {
  return {
    timeline: [
      { id: '1', date: '2025.3', title: '28岁啦', highlight: true },
      { id: '2', date: '2025.1', title: '参演《星星闪耀的夜晚》', highlight: false },
      { id: '3', date: '2024.3', title: '参演《7人的复活》', highlight: false },
      { id: '4', date: '2021.3', title: '参演《今天开始契约恋爱》', highlight: false },
      { id: '5', date: '2019.1', title: '在Cherry Bullet出道', highlight: false }
    ],
    sites: [
      { id: '1', title: '博客', description: '记录学习日常', icon: 'fa-lightbulb', url: '#', accent: false },
      { id: '2', title: '云盘', description: '分享收集文件', icon: 'fa-cloud', url: '#', accent: false },
      { id: '3', title: '文件箱', description: '传输文件', icon: 'fa-truck-loading', url: '#', accent: false },
      { id: '4', title: '待建', description: '待建', icon: 'fa-pencil-alt', url: '#', accent: true }
    ],
    tags: ['Kpop', 'Currently employed', 'Cherry Bullet', '1997.3.5', 'Singer', 'Dancer', 'FNC', '유주'],
    info: {
      location: 'ShenZhen',
      status: 'Currently employed'
    },
    images: {
      avatar: 'touxiang.jpg',
      background: 'Background.webp'
    },
    updatedAt: null
  };
}

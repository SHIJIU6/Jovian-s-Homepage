/**
 * Config API.
 * Reference: Cloudflare Pages Functions request handlers (compatible with current `wrangler` 3.114.17 runtime).
 */

import { createDefaultConfig, normalizeConfig } from "../../shared/site-config.js";
import { jsonResponse, requireAuth } from "./_utils.js";

const CONFIG_KEY = "homepage_config";
const CONFIG_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=30";

export async function onRequestGet(context) {
  try {
    const storedConfig = await context.env.SITE_CONFIG.get(CONFIG_KEY, { type: "json" });
    const config = normalizeConfig(storedConfig || createDefaultConfig());
    const updatedAt = typeof config.updatedAt === "number" ? config.updatedAt : 0;
    const etag = `W/"${updatedAt}"`;

    if (context.request.headers.get("If-None-Match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": CONFIG_CACHE_CONTROL,
        },
      });
    }

    return jsonResponse(config, {
      headers: {
        ETag: etag,
        "Cache-Control": CONFIG_CACHE_CONTROL,
      },
    });
  } catch {
    return jsonResponse(createDefaultConfig(), {
      headers: {
        "Cache-Control": CONFIG_CACHE_CONTROL,
      },
    });
  }
}

export async function onRequestPost(context) {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  try {
    const incomingConfig = await context.request.json();
    const normalizedConfig = normalizeConfig(incomingConfig);
    normalizedConfig.updatedAt = Date.now();

    await context.env.SITE_CONFIG.put(CONFIG_KEY, JSON.stringify(normalizedConfig));

    return jsonResponse({
      success: true,
      message: "配置已保存",
      updatedAt: normalizedConfig.updatedAt,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: `保存失败: ${error.message}`,
      },
      { status: error instanceof SyntaxError ? 400 : 500 },
    );
  }
}

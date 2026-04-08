/**
 * Image upload API.
 * Reference: Cloudflare R2 object upload metadata handling (compatible with current `wrangler` 3.114.17 runtime).
 */

import { jsonResponse, requireAuth } from "./_utils.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_UPLOAD_TARGETS = new Set(["avatar", "background", "siteicon", "socialicon"]);
const EXTENSION_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function isUploadFile(value) {
  return Boolean(value && typeof value === "object" && typeof value.stream === "function");
}

export async function onRequestPost(context) {
  const auth = await requireAuth(context);
  if (!auth.ok) return auth.response;

  try {
    const formData = await context.request.formData();
    const file = formData.get("file");
    const type = typeof formData.get("type") === "string" ? formData.get("type").trim() : "";

    if (!isUploadFile(file) || !type) {
      return jsonResponse({ error: "缺少文件或类型参数" }, { status: 400 });
    }

    if (!ALLOWED_UPLOAD_TARGETS.has(type)) {
      return jsonResponse({ error: "不支持的上传类型" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return jsonResponse({ error: "不支持的图片格式" }, { status: 400 });
    }

    if (typeof file.size === "number" && file.size > MAX_IMAGE_SIZE) {
      return jsonResponse({ error: "图片大小不能超过 5MB" }, { status: 400 });
    }

    const extension = EXTENSION_BY_TYPE[file.type] || "bin";
    const filename = `${type}_${Date.now()}.${extension}`;

    await context.env.IMAGES.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return jsonResponse({
      success: true,
      filename,
      type,
      url: `/api/images/${filename}`,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: `上传失败: ${error.message}`,
      },
      { status: 500 },
    );
  }
}

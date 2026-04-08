import { getAuthHeaders } from "./auth.js";
import {
  createDefaultConfig,
  generateId,
  normalizeConfig,
} from "../shared/site-config.js";

async function readJson(response, fallback) {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

export { createDefaultConfig, generateId, normalizeConfig };

export async function loadConfig() {
  const response = await fetch("/api/config");
  if (!response.ok) {
    const error = new Error("加载配置失败");
    error.status = response.status;
    throw error;
  }

  const payload = await readJson(response, createDefaultConfig());
  return normalizeConfig(payload);
}

export async function saveConfig(config) {
  const payload = normalizeConfig(config);
  const response = await fetch("/api/config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const result = await readJson(response, {});
  if (!response.ok) {
    const error = new Error(result.error || "保存失败");
    error.status = response.status;
    throw error;
  }

  return result;
}

export async function uploadImage(file, type) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  const result = await readJson(response, {});
  if (!response.ok) {
    const error = new Error(result.error || "上传失败");
    error.status = response.status;
    throw error;
  }

  return result;
}

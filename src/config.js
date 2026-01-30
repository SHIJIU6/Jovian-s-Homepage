/**
 * 配置管理模块
 * 处理网站配置的加载和保存
 */

import { getAuthHeaders } from './auth.js';

// 加载配置
export async function loadConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) {
    throw new Error('加载配置失败');
  }
  return await res.json();
}

// 保存配置
export async function saveConfig(config) {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(config)
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || '保存失败');
  }

  return data;
}

// 上传图片
export async function uploadImage(file, type) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || '上传失败');
  }

  return data;
}

// 生成唯一 ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

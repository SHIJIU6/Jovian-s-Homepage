/**
 * 编辑器模块
 * 处理编辑模式的启用、禁用和数据收集
 */

import { generateId } from './config.js';

let isEditMode = false;
let originalConfig = null;

// 启用编辑模式
export function enableEditMode(config) {
  isEditMode = true;
  originalConfig = JSON.parse(JSON.stringify(config)); // 深拷贝原始配置
  
  document.body.classList.add('edit-mode');
  document.getElementById('editToolbar')?.classList.remove('hidden');
  document.getElementById('authBtn')?.classList.add('authenticated');

  // 激活所有可编辑元素
  document.querySelectorAll('[data-editable]').forEach(el => {
    el.classList.add('editable-active');
    
    // 显示编辑控制按钮
    el.querySelectorAll('.edit-control').forEach(btn => {
      btn.classList.remove('hidden');
    });

    // 使文本字段可编辑
    el.querySelectorAll('[data-field]').forEach(field => {
      field.contentEditable = 'true';
      field.classList.add('editable-field');
    });
  });

  // 显示添加按钮
  document.querySelectorAll('.edit-add-btn').forEach(btn => {
    btn.classList.remove('hidden');
  });
}

// 禁用编辑模式
export function disableEditMode() {
  isEditMode = false;
  
  document.body.classList.remove('edit-mode');
  document.getElementById('editToolbar')?.classList.add('hidden');

  // 禁用所有可编辑元素
  document.querySelectorAll('[data-editable]').forEach(el => {
    el.classList.remove('editable-active');
    
    el.querySelectorAll('.edit-control').forEach(btn => {
      btn.classList.add('hidden');
    });

    el.querySelectorAll('[data-field]').forEach(field => {
      field.contentEditable = 'false';
      field.classList.remove('editable-field');
    });
  });

  // 隐藏添加按钮
  document.querySelectorAll('.edit-add-btn').forEach(btn => {
    btn.classList.add('hidden');
  });
}

// 检查是否处于编辑模式
export function isInEditMode() {
  return isEditMode;
}

// 获取原始配置（用于取消编辑）
export function getOriginalConfig() {
  return originalConfig;
}

// 从 DOM 收集编辑后的数据
export function collectEditedData() {
  const data = {
    timeline: [],
    sites: [],
    tags: [],
    info: {},
    images: {}
  };

  // 收集时间线数据
  document.querySelectorAll('[data-editable="timeline"]').forEach(el => {
    const id = el.dataset.id;
    const dateEl = el.querySelector('[data-field="date"]');
    const titleEl = el.querySelector('[data-field="title"]');
    
    if (dateEl && titleEl) {
      data.timeline.push({
        id: id || generateId(),
        date: dateEl.textContent.trim(),
        title: titleEl.textContent.trim(),
        highlight: el.classList.contains('timeline-highlight')
      });
    }
  });

  // 收集 Site 卡片数据
  document.querySelectorAll('[data-editable="site"]').forEach(el => {
    const id = el.dataset.id;
    const titleEl = el.querySelector('[data-field="title"]');
    const descEl = el.querySelector('[data-field="description"]');
    const iconEl = el.querySelector('[data-field="icon"] i');
    
    if (titleEl) {
      data.sites.push({
        id: id || generateId(),
        title: titleEl.textContent.trim(),
        description: descEl?.textContent.trim() || '',
        icon: iconEl?.className.replace('fas ', '') || 'fa-link',
        url: el.dataset.url || el.href || '#',
        accent: el.classList.contains('site-accent')
      });
    }
  });

  // 收集标签数据
  document.querySelectorAll('[data-editable="tag"]').forEach(el => {
    const text = el.textContent.trim();
    if (text) {
      data.tags.push(text);
    }
  });

  // 收集个人信息
  const locationEl = document.querySelector('[data-field="location"]');
  const statusEl = document.querySelector('[data-field="status"]');
  data.info = {
    location: locationEl?.textContent.trim() || 'ShenZhen',
    status: statusEl?.textContent.trim() || 'Currently employed'
  };

  // 收集图片信息
  const avatarEl = document.querySelector('[data-field="avatar"]');
  const bgEl = document.querySelector('[data-field="background"]');
  data.images = {
    avatar: avatarEl?.src || avatarEl?.dataset.src || 'touxiang.jpg',
    background: bgEl?.src || bgEl?.dataset.src || 'Background.webp'
  };

  return data;
}

// 添加时间线项目
export function addTimelineItem(container, data = null) {
  const item = data || {
    id: generateId(),
    date: '2025.1',
    title: '新事件',
    highlight: false
  };

  const html = `
    <div class="relative group fade-left-active" data-editable="timeline" data-id="${item.id}">
      <div class="absolute -left-[1.8rem] top-1.5 w-3 h-3 rounded-full bg-slate-500 group-hover:bg-white transition-colors z-10 ring-4 ring-black/20"></div>
      <div class="text-xs mb-1 tracking-wider" style="color: var(--text-muted)" data-field="date" contenteditable="true">${item.date}</div>
      <h4 class="text-sm font-semibold group-hover:opacity-80 transition-colors heading" data-field="title" contenteditable="true">${item.title}</h4>
      <button class="edit-control edit-delete-btn absolute -right-2 -top-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onclick="window.deleteEditableItem(this)">×</button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
}

// 添加 Site 卡片
export function addSiteCard(container, data = null) {
  const item = data || {
    id: generateId(),
    title: '新站点',
    description: '站点描述',
    icon: 'fa-link',
    url: '#',
    accent: false
  };

  const html = `
    <a class="group block p-5 rounded-2xl glass-panel hover:-translate-y-1 transition-transform duration-300 wobble-hover editable-active" 
       href="${item.url}" data-editable="site" data-id="${item.id}" data-url="${item.url}">
      <div class="flex justify-between items-start mb-3">
        <h3 class="font-bold text-lg group-hover:opacity-80 transition-colors heading" data-field="title" contenteditable="true">${item.title}</h3>
        <div class="site-card-icon ${item.accent ? 'accent' : ''} w-9 h-9 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]" data-field="icon">
          <i class="fas ${item.icon}"></i>
        </div>
      </div>
      <p class="text-xs font-light" style="color: var(--text-muted)" data-field="description" contenteditable="true">${item.description}</p>
      <button class="edit-control edit-delete-btn absolute -right-2 -top-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onclick="event.preventDefault(); window.deleteEditableItem(this)">×</button>
    </a>
  `;

  container.insertAdjacentHTML('beforeend', html);
}

// 添加标签
export function addTag(container, text = '新标签') {
  const html = `
    <span class="tag px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-default wobble-hover editable-active" 
          data-editable="tag" contenteditable="true">${text}</span>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

// 删除可编辑项目
export function deleteEditableItem(button) {
  const item = button.closest('[data-editable]');
  if (item && confirm('确定要删除此项吗？')) {
    item.remove();
  }
}

// 暴露删除函数到全局
if (typeof window !== 'undefined') {
  window.deleteEditableItem = deleteEditableItem;
}

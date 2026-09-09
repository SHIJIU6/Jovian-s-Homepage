import { collectLayoutData } from "./layout.js";

let isEditMode = false;
let originalConfig = null;

function cloneConfig(config) {
  return config ? JSON.parse(JSON.stringify(config)) : null;
}

export function setOriginalConfig(config) {
  originalConfig = cloneConfig(config);
}

export function getOriginalConfig() {
  return cloneConfig(originalConfig);
}

export function isInEditMode() {
  return isEditMode;
}

export function enableEditMode(config) {
  isEditMode = true;
  setOriginalConfig(config);

  document.body.classList.add("edit-mode");
  document.getElementById("editToolbar")?.classList.remove("hidden");
  document.getElementById("authBtn")?.classList.add("authenticated");
  document.getElementById("authBtn")?.replaceChildren(createAuthIcon("fas fa-unlock"));

  document.querySelectorAll("[data-editable]").forEach((element) => {
    element.classList.add("editable-active");
  });

  document.querySelectorAll(".edit-delete-btn").forEach((button) => {
    button.classList.remove("hidden");
  });

  document.querySelectorAll(".edit-add-btn").forEach((button) => {
    button.classList.remove("hidden");
  });

  document.querySelectorAll("[data-field]").forEach((field) => {
    if (field.closest(".pointer-events-none")) return;
    if (field.closest('[data-editable="site"], [data-editable="social"]')) return;

    const fieldName = field.getAttribute("data-field");
    if (
      fieldName === "date" ||
      fieldName === "title" ||
      fieldName === "tag" ||
      fieldName === "location" ||
      fieldName === "status"
    ) {
      field.contentEditable = "true";
      field.classList.add("editable-field");
    }
  });
}

export function disableEditMode() {
  isEditMode = false;

  document.body.classList.remove("edit-mode");
  document.getElementById("editToolbar")?.classList.add("hidden");
  document.getElementById("authBtn")?.replaceChildren(createAuthIcon("fas fa-pen"));

  document.querySelectorAll("[data-editable]").forEach((element) => {
    element.classList.remove("editable-active");
  });

  document.querySelectorAll(".edit-delete-btn").forEach((button) => {
    button.classList.add("hidden");
  });

  document.querySelectorAll(".edit-add-btn").forEach((button) => {
    button.classList.add("hidden");
  });

  document.querySelectorAll("[data-field]").forEach((field) => {
    field.contentEditable = "false";
    field.classList.remove("editable-field");
  });
}

export function deleteEditableItem(button) {
  window.event?.preventDefault?.();
  window.event?.stopPropagation?.();

  const item = button?.closest?.("[data-editable]");
  if (!item) return false;
  if (!window.confirm("确定要删除此项吗？")) return false;

  item.remove();
  return true;
}

export function collectEditedData({ generateId }) {
  const data = {
    timeline: [],
    sites: [],
    magicCards: [],
    tags: [],
    info: {},
    images: {},
    socialLinks: [],
    layout: collectLayoutData(),
  };

  document.querySelectorAll('[data-editable="timeline"]').forEach((element, index) => {
    const date = element.querySelector('[data-field="date"]')?.textContent?.trim() || "YYYY.MM";
    const title = element.querySelector('[data-field="title"]')?.textContent?.trim() || "新事件";

    data.timeline.push({
      id: element.dataset.id || generateId(),
      date,
      title,
      highlight: element.dataset.highlight === "true" || index === 0,
    });
  });

  document.querySelectorAll('[data-editable="site"]').forEach((element) => {
    data.sites.push({
      id: element.dataset.id || generateId(),
      title: element.querySelector('[data-field="title"]')?.textContent?.trim() || "新站点",
      description:
        element.querySelector('[data-field="description"]')?.textContent?.trim() || "",
      icon: element.querySelector('[data-field="icon"] i')?.className || "fas fa-link",
      image: element.querySelector('[data-field="icon"] img')?.getAttribute("src") || "",
      iconType: element.querySelector('[data-field="icon"] img') ? "image" : "icon",
      url: element.dataset.url || "#",
      accent: element.querySelector('[data-field="icon"]')?.classList.contains("accent") || false,
    });
  });

  document.querySelectorAll('[data-editable="magic-card"]').forEach((element) => {
    data.magicCards.push({
      id: element.dataset.id || generateId(),
      title: element.querySelector('[data-field="title"]')?.textContent?.trim() || "魔术卡片",
      description:
        element.querySelector('[data-field="description"]')?.textContent?.trim() || "",
      image: element.querySelector('[data-field="image"]')?.getAttribute("src") || "",
      url: element.dataset.url || "#",
    });
  });

  document.querySelectorAll('[data-editable="tag"]').forEach((element) => {
    const text = element.querySelector('[data-field="tag"]')?.textContent?.trim() || "";
    if (text) data.tags.push(text);
  });

  data.info = {
    location: document.querySelector('[data-field="location"]')?.textContent?.trim() || "",
    status: document.querySelector('[data-field="status"]')?.textContent?.trim() || "",
  };

  data.images = {
    avatar: document.querySelector('[data-field="avatar"]')?.getAttribute("src") || "touxiang.jpg",
    background: document.querySelector(".theme-bg-dark img")?.getAttribute("src") || "Background.webp",
  };

  document.querySelectorAll('[data-editable="social"]').forEach((element) => {
    const type = element.dataset.type === "image" ? "image" : "icon";
    data.socialLinks.push({
      id: element.dataset.id || generateId(),
      type,
      title: element.querySelector('[data-field="label"]')?.textContent?.trim() || "",
      href: element.getAttribute("href") || "#",
      icon: element.querySelector('[data-field="icon"]')?.className || "fas fa-link",
      image: element.querySelector('[data-field="image"]')?.getAttribute("src") || "",
    });
  });

  return data;
}

function createAuthIcon(className) {
  const icon = document.createElement("i");
  icon.className = className;
  return icon;
}

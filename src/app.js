import { getToken, isAuthenticated, login, logout } from "./auth.js";
import {
  generateId,
  loadConfig,
  normalizeConfig,
  saveConfig,
  uploadImage,
} from "./config.js";
import {
  collectEditedData,
  deleteEditableItem as removeEditableItem,
  disableEditMode,
  enableEditMode,
  getOriginalConfig,
  isInEditMode,
  setOriginalConfig,
} from "./editor.js";
import {
  createSiteCardElement,
  createSocialLinkElement,
  createTagElement,
  createTimelineItemElement,
  insertSiteCardElement,
  insertSocialLinkElement,
  renderConfig,
  updateSiteCardElement,
  updateSocialLinkElement,
} from "./render.js";
import { collectLayoutData, syncLayout } from "./layout.js";
import { startCosmicBackground, stopCosmicBackground } from "./cosmic-background.js";

let currentConfig = null;
let itemModalState = { type: null, mode: null, target: null };
let itemModalUiWired = false;
let clockTimer = null;
let lastClockValue = "";
const THEME_STORAGE_KEY = "theme";
const THEME_MIGRATION_KEY = "theme-default-migration";
const THEME_MIGRATION_VERSION = "2026-04-24-dawn";

function getInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const hasMigrated = localStorage.getItem(THEME_MIGRATION_KEY) === THEME_MIGRATION_VERSION;

  if (!hasMigrated) {
    localStorage.setItem(THEME_STORAGE_KEY, "handdrawn");
    localStorage.setItem(THEME_MIGRATION_KEY, THEME_MIGRATION_VERSION);
    return "handdrawn";
  }

  return savedTheme === "dark" ? "dark" : "handdrawn";
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `app-toast app-toast--${type} fixed top-20 right-6 z-[200]`;

  const text = document.createElement("span");
  text.className = "app-toast__text";
  text.textContent = message;
  toast.append(text);

  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add("app-toast--visible"));
  window.setTimeout(() => {
    toast.classList.remove("app-toast--visible");
    window.setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function isValidUrlForNavigation(url) {
  const trimmed = (url || "").trim();
  return Boolean(trimmed && trimmed !== "#");
}

function navigateToUrl(url) {
  const trimmed = (url || "").trim();
  if (!isValidUrlForNavigation(trimmed)) {
    showToast("未设置链接", "info");
    return;
  }
  window.open(trimmed, "_blank", "noopener,noreferrer");
}

function closeAuthModal() {
  document.getElementById("authModal")?.classList.add("hidden");
  const passwordInput = document.getElementById("authPassword");
  const errorElement = document.getElementById("authError");
  if (passwordInput) passwordInput.value = "";
  errorElement?.classList.add("hidden");
}

function closeItemModal() {
  document.getElementById("itemModal")?.classList.add("hidden");
  document.getElementById("siteIconPickerPopup")?.classList.add("hidden");
  document.getElementById("socialIconPickerPopup")?.classList.add("hidden");
  itemModalState = { type: null, mode: null, target: null };
}

function setIconPreview(previewElement, classValue) {
  if (!previewElement) return;
  previewElement.className = classValue?.trim() || "fas fa-link";
}

function setImagePreview(previewElement, url) {
  if (!previewElement) return;
  const src = (url || "").trim();
  previewElement.src = src;
  previewElement.classList.toggle("hidden", !src);
}

function toggleSiteModalInputMode() {
  const typeSelect = document.getElementById("siteModalIconType");
  const iconWrap = document.getElementById("siteModalIconWrap");
  const imageWrap = document.getElementById("siteModalImageWrap");
  const pickerPopup = document.getElementById("siteIconPickerPopup");
  const useImage = typeSelect?.value === "image";

  iconWrap?.classList.toggle("hidden", useImage);
  imageWrap?.classList.toggle("hidden", !useImage);
  pickerPopup?.classList.add("hidden");
}

function toggleSocialModalInputMode() {
  const typeSelect = document.getElementById("socialModalType");
  const iconWrap = document.getElementById("socialModalIconWrap");
  const imageWrap = document.getElementById("socialModalImageWrap");
  const pickerPopup = document.getElementById("socialIconPickerPopup");
  const useImage = typeSelect?.value === "image";

  iconWrap?.classList.toggle("hidden", useImage);
  imageWrap?.classList.toggle("hidden", !useImage);
  pickerPopup?.classList.add("hidden");
}

function fillSiteModal(target) {
  const title = target?.querySelector('[data-field="title"]')?.textContent?.trim() || "";
  const description =
    target?.querySelector('[data-field="description"]')?.textContent?.trim() || "";
  const url = target?.dataset?.url || "#";
  const icon = target?.querySelector('[data-field="icon"] i')?.className?.trim() || "fas fa-link";
  const image = target?.querySelector('[data-field="icon"] img')?.getAttribute("src") || "";
  const accent = target?.querySelector('[data-field="icon"]')?.classList.contains("accent") || false;

  const titleInput = document.getElementById("siteModalTitle");
  const descriptionInput = document.getElementById("siteModalDescription");
  const urlInput = document.getElementById("siteModalUrl");
  const iconInput = document.getElementById("siteModalIcon");
  const imageInput = document.getElementById("siteModalImage");
  const typeSelect = document.getElementById("siteModalIconType");
  const accentInput = document.getElementById("siteModalAccent");

  if (titleInput) titleInput.value = title;
  if (descriptionInput) descriptionInput.value = description;
  if (urlInput) urlInput.value = url;
  if (iconInput) iconInput.value = icon;
  if (imageInput) imageInput.value = image;
  if (typeSelect) typeSelect.value = image ? "image" : "icon";
  if (accentInput) accentInput.checked = accent;

  setIconPreview(document.getElementById("siteModalIconPreview"), icon);
  setImagePreview(document.getElementById("siteModalImagePreview"), image);
  toggleSiteModalInputMode();
}

function fillSocialModal(target) {
  const type = target?.dataset?.type === "image" ? "image" : "icon";
  const title = target?.querySelector('[data-field="label"]')?.textContent?.trim() || "";
  const href = target?.getAttribute("href") || "#";
  const icon = target?.querySelector('[data-field="icon"]')?.className?.trim() || "fas fa-link";
  const image = target?.querySelector('[data-field="image"]')?.getAttribute("src") || "";

  const typeSelect = document.getElementById("socialModalType");
  const titleInput = document.getElementById("socialModalTitle");
  const hrefInput = document.getElementById("socialModalUrl");
  const iconInput = document.getElementById("socialModalIcon");
  const imageInput = document.getElementById("socialModalImage");

  if (typeSelect) typeSelect.value = image ? "image" : type;
  if (titleInput) titleInput.value = title;
  if (hrefInput) hrefInput.value = href;
  if (iconInput) iconInput.value = icon;
  if (imageInput) imageInput.value = image;

  setIconPreview(document.getElementById("socialModalIconPreview"), icon);
  setImagePreview(document.getElementById("socialModalImagePreview"), image);
  toggleSocialModalInputMode();
}

async function previewLocalImage(file, inputElement, previewElement, selectElement) {
  const reader = new FileReader();
  const dataUrl = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });

  if (typeof dataUrl !== "string") return;
  if (inputElement) inputElement.value = dataUrl;
  setImagePreview(previewElement, dataUrl);
  if (selectElement) selectElement.value = "image";
}

async function uploadModalImage(file, type, { inputElement, previewElement, selectElement, toggleMode }) {
  if (!file) return;

  try {
    showToast("正在上传...", "info");
    const result = await uploadImage(file, type);
    if (inputElement) inputElement.value = result.url;
    setImagePreview(previewElement, result.url);
    if (selectElement) selectElement.value = "image";
    toggleMode();
    showToast("上传成功", "success");
  } catch {
    try {
      await previewLocalImage(file, inputElement, previewElement, selectElement);
      toggleMode();
      showToast("已使用本地图片预览（未上传）", "info");
    } catch {
      showToast("上传失败", "error");
    }
  }
}

function openItemModal(type, { mode = "edit", target = null } = {}) {
  const modal = document.getElementById("itemModal");
  if (!modal) return;

  itemModalState = { type, mode, target };

  const title = document.getElementById("itemModalTitle");
  const siteFields = document.getElementById("itemModalSiteFields");
  const socialFields = document.getElementById("itemModalSocialFields");

  siteFields?.classList.add("hidden");
  socialFields?.classList.add("hidden");

  if (type === "site") {
    if (title) title.textContent = mode === "create" ? "添加站点" : "编辑站点";
    siteFields?.classList.remove("hidden");
    fillSiteModal(target);
  }

  if (type === "social") {
    if (title) title.textContent = mode === "create" ? "添加社交链接" : "编辑社交链接";
    socialFields?.classList.remove("hidden");
    fillSocialModal(target);
  }

  modal.classList.remove("hidden");
  modal.querySelector("input, textarea, select")?.focus();
}

function createSitePayloadFromModal() {
  const title = document.getElementById("siteModalTitle")?.value?.trim() || "";
  const description = document.getElementById("siteModalDescription")?.value?.trim() || "";
  const url = document.getElementById("siteModalUrl")?.value?.trim() || "#";
  const iconType = document.getElementById("siteModalIconType")?.value || "icon";
  const icon = document.getElementById("siteModalIcon")?.value?.trim() || "fas fa-link";
  const image = document.getElementById("siteModalImage")?.value?.trim() || "";
  const accent = Boolean(document.getElementById("siteModalAccent")?.checked);

  return {
    title,
    description,
    url,
    icon,
    image,
    iconType: iconType === "image" && image ? "image" : "icon",
    accent,
  };
}

function createSocialPayloadFromModal() {
  const type = document.getElementById("socialModalType")?.value || "icon";
  const title = document.getElementById("socialModalTitle")?.value?.trim() || "";
  const href = document.getElementById("socialModalUrl")?.value?.trim() || "#";
  const icon = document.getElementById("socialModalIcon")?.value?.trim() || "fas fa-link";
  const image = document.getElementById("socialModalImage")?.value?.trim() || "";

  return {
    type: type === "image" && image ? "image" : "icon",
    title,
    href,
    icon,
    image,
  };
}

function handleItemModalSave(event) {
  event?.preventDefault?.();

  if (itemModalState.type === "site") {
    const site = createSitePayloadFromModal();
    if (!site.title) {
      showToast("请填写标题", "error");
      return;
    }

    if (itemModalState.mode === "create") {
      insertSiteCardElement(createSiteCardElement({ id: generateId(), ...site }, { isEditMode: true }));
      showToast("已添加站点", "success");
    } else {
      updateSiteCardElement(itemModalState.target, site);
      showToast("已更新站点", "success");
    }

    refreshLayout();
    closeItemModal();
    return;
  }

  if (itemModalState.type === "social") {
    const social = createSocialPayloadFromModal();
    if (itemModalState.mode === "create") {
      insertSocialLinkElement(
        createSocialLinkElement({ id: generateId(), ...social }, { isEditMode: true }),
      );
      showToast("已添加社交链接", "success");
    } else {
      updateSocialLinkElement(itemModalState.target, social);
      showToast("已更新社交链接", "success");
    }
    refreshLayout();
    closeItemModal();
  }
}

function wireItemModalUi() {
  if (itemModalUiWired) return;
  itemModalUiWired = true;

  const siteTypeSelect = document.getElementById("siteModalIconType");
  const siteIconInput = document.getElementById("siteModalIcon");
  const siteIconPreview = document.getElementById("siteModalIconPreview");
  const siteImageInput = document.getElementById("siteModalImage");
  const siteImagePreview = document.getElementById("siteModalImagePreview");
  const sitePickerButton = document.getElementById("siteIconPickerBtn");
  const sitePickerPopup = document.getElementById("siteIconPickerPopup");
  const sitePickerGrid = document.getElementById("siteIconPickerGrid");
  const siteImageUploadButton = document.getElementById("siteModalImageUploadBtn");
  const siteImageFile = document.getElementById("siteModalImageFile");

  siteTypeSelect?.addEventListener("change", toggleSiteModalInputMode);
  siteIconInput?.addEventListener("input", () => setIconPreview(siteIconPreview, siteIconInput.value));
  siteImageInput?.addEventListener("input", () => setImagePreview(siteImagePreview, siteImageInput.value));

  sitePickerButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    sitePickerPopup?.classList.toggle("hidden");
  });

  sitePickerGrid?.addEventListener("click", (event) => {
    const button = event.target.closest?.(".icon-pick-btn");
    if (!button) return;
    event.preventDefault();
    if (siteIconInput) siteIconInput.value = button.dataset.icon || "fas fa-link";
    setIconPreview(siteIconPreview, siteIconInput?.value);
    if (siteTypeSelect) siteTypeSelect.value = "icon";
    toggleSiteModalInputMode();
  });

  siteImageUploadButton?.addEventListener("click", (event) => {
    event.preventDefault();
    siteImageFile?.click();
  });

  siteImageFile?.addEventListener("change", async () => {
    const file = siteImageFile.files?.[0];
    await uploadModalImage(file, "siteicon", {
      inputElement: siteImageInput,
      previewElement: siteImagePreview,
      selectElement: siteTypeSelect,
      toggleMode: toggleSiteModalInputMode,
    });
    siteImageFile.value = "";
  });

  const socialTypeSelect = document.getElementById("socialModalType");
  const socialIconInput = document.getElementById("socialModalIcon");
  const socialIconPreview = document.getElementById("socialModalIconPreview");
  const socialImageInput = document.getElementById("socialModalImage");
  const socialImagePreview = document.getElementById("socialModalImagePreview");
  const socialPickerButton = document.getElementById("socialIconPickerBtn");
  const socialPickerPopup = document.getElementById("socialIconPickerPopup");
  const socialPickerGrid = document.getElementById("socialIconPickerGrid");
  const socialImageUploadButton = document.getElementById("socialModalImageUploadBtn");
  const socialImageFile = document.getElementById("socialModalImageFile");

  socialTypeSelect?.addEventListener("change", toggleSocialModalInputMode);
  socialIconInput?.addEventListener("input", () =>
    setIconPreview(socialIconPreview, socialIconInput.value),
  );
  socialImageInput?.addEventListener("input", () =>
    setImagePreview(socialImagePreview, socialImageInput.value),
  );

  socialPickerButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    socialPickerPopup?.classList.toggle("hidden");
  });

  socialPickerGrid?.addEventListener("click", (event) => {
    const button = event.target.closest?.(".icon-pick-btn");
    if (!button) return;
    event.preventDefault();
    if (socialIconInput) socialIconInput.value = button.dataset.icon || "fas fa-link";
    setIconPreview(socialIconPreview, socialIconInput?.value);
    if (socialTypeSelect) socialTypeSelect.value = "icon";
    toggleSocialModalInputMode();
  });

  socialImageUploadButton?.addEventListener("click", (event) => {
    event.preventDefault();
    socialImageFile?.click();
  });

  socialImageFile?.addEventListener("change", async () => {
    const file = socialImageFile.files?.[0];
    await uploadModalImage(file, "socialicon", {
      inputElement: socialImageInput,
      previewElement: socialImagePreview,
      selectElement: socialTypeSelect,
      toggleMode: toggleSocialModalInputMode,
    });
    socialImageFile.value = "";
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (
      sitePickerButton &&
      sitePickerPopup &&
      !sitePickerButton.contains(target) &&
      !sitePickerPopup.contains(target)
    ) {
      sitePickerPopup.classList.add("hidden");
    }

    if (
      socialPickerButton &&
      socialPickerPopup &&
      !socialPickerButton.contains(target) &&
      !socialPickerPopup.contains(target)
    ) {
      socialPickerPopup.classList.add("hidden");
    }
  });
}

function syncCurrentConfigFromDom() {
  currentConfig = normalizeConfig(collectEditedData({ generateId }));
}

function refreshLayout() {
  const layout = isInEditMode() ? collectLayoutData() : currentConfig?.layout;
  syncLayout(layout, { enabled: isInEditMode() });
}

function renderCurrentConfig(config, { isEditMode = isInEditMode() } = {}) {
  renderConfig(config, { isEditMode });
  syncLayout(config?.layout, { enabled: isEditMode });
}

async function loadAndRenderConfig() {
  try {
    currentConfig = await loadConfig();
    setOriginalConfig(currentConfig);
    renderCurrentConfig(currentConfig, { isEditMode: isInEditMode() });
  } catch {
    syncCurrentConfigFromDom();
    setOriginalConfig(currentConfig);
    refreshLayout();
  }
}

function openAuthModal() {
  if (isAuthenticated()) {
    enableEditMode(currentConfig);
    renderCurrentConfig(currentConfig, { isEditMode: true });
    refreshLayout();
    return;
  }

  document.getElementById("authModal")?.classList.remove("hidden");
  document.getElementById("authPassword")?.focus();
}

async function handleLogin() {
  const passwordInput = document.getElementById("authPassword");
  const errorElement = document.getElementById("authError");
  const password = passwordInput?.value?.trim() || "";

  if (!password) {
    if (errorElement) {
      errorElement.textContent = "请输入密码";
      errorElement.classList.remove("hidden");
    }
    return;
  }

  try {
    await login(password);
    closeAuthModal();
    enableEditMode(currentConfig);
    renderCurrentConfig(currentConfig, { isEditMode: true });
    refreshLayout();
    showToast("登录成功，已进入编辑模式", "success");
  } catch (error) {
    if (errorElement) {
      errorElement.textContent = error.message || "密码错误";
      errorElement.classList.remove("hidden");
    }
  }
}

function handleLogout() {
  logout();
  disableEditMode();
  renderCurrentConfig(currentConfig, { isEditMode: false });
  refreshLayout();
  document.getElementById("authBtn")?.classList.remove("authenticated");
  showToast("已退出登录", "info");
}

function handleCancelEdit() {
  if (!window.confirm("确定要取消编辑吗？未保存的更改将丢失。")) {
    return;
  }

  closeItemModal();
  const original = getOriginalConfig();
  if (original) {
    currentConfig = normalizeConfig(original);
    renderCurrentConfig(currentConfig, { isEditMode: false });
  }
  disableEditMode();
  refreshLayout();
  showToast("已恢复未保存内容", "info");
}

function handleResetLayout() {
  if (!isInEditMode()) return;

  if (
    !window.confirm(
      "\u786e\u5b9a\u8981\u91cd\u7f6e\u5f53\u524d\u5e03\u5c40\u5417\uff1f\u9700\u8981\u4fdd\u5b58\u540e\u624d\u4f1a\u6b63\u5f0f\u751f\u6548\u3002",
    )
  ) {
    return;
  }

  currentConfig = normalizeConfig({
    ...currentConfig,
    layout: { positions: {} },
  });

  syncLayout(currentConfig.layout, { enabled: true });
  showToast(
    "\u5e03\u5c40\u5df2\u91cd\u7f6e\uff0c\u4fdd\u5b58\u540e\u751f\u6548",
    "info",
  );
}

async function handleSave() {
  if (!getToken()) {
    showToast("请先登录", "error");
    return;
  }

  const nextConfig = normalizeConfig(collectEditedData({ generateId }));

  try {
    await saveConfig(nextConfig);
    currentConfig = nextConfig;
    setOriginalConfig(currentConfig);
    renderCurrentConfig(currentConfig, { isEditMode: true });
    showToast("保存成功！", "success");
  } catch (error) {
    if (error.status === 401) {
      handleLogout();
      showToast("登录已过期，请重新登录", "error");
      return;
    }

    showToast(error.message || "保存失败", "error");
  }
}

async function handleImageUpload(input, type) {
  const file = input?.files?.[0];
  if (!file) return;

  if (!getToken()) {
    showToast("请先登录", "error");
    input.value = "";
    return;
  }

  try {
    showToast("正在上传...", "info");
    const result = await uploadImage(file, type);
    if (type === "avatar") {
      const avatar = document.querySelector(".avatar-container img");
      if (avatar) avatar.src = result.url;
    } else if (type === "background") {
      const background = document.querySelector(".theme-bg-dark img");
      if (background) background.src = result.url;
    }
    showToast("上传成功！", "success");
  } catch (error) {
    if (error.status === 401) {
      handleLogout();
      showToast("登录已过期，请重新登录", "error");
    } else {
      showToast(error.message || "上传失败", "error");
    }
  } finally {
    input.value = "";
  }
}

function addTimelineItem() {
  const container = document.getElementById("timelineItems");
  if (!container) return;

  const addButton = container.querySelector(".edit-add-btn");
  const index = container.querySelectorAll('[data-editable="timeline"]').length;
  const item = createTimelineItemElement(
    {
      id: generateId(),
      date: "YYYY.MM",
      title: "新事件",
      highlight: false,
    },
    { index, isEditMode: true },
  );

  if (addButton) {
    container.insertBefore(item, addButton);
  } else {
    container.append(item);
  }

  refreshLayout();
  showToast("已添加新事件", "success");
}

function addSiteCard() {
  openItemModal("site", { mode: "create" });
}

function addSocialLink() {
  openItemModal("social", { mode: "create" });
}

function addTag() {
  const container = document.getElementById("tagsContainer");
  if (!container) return;

  const addButton = container.querySelector(".edit-add-btn");
  const tag = createTagElement("新标签", { isEditMode: true });

  if (addButton) {
    container.insertBefore(tag, addButton);
  } else {
    container.append(tag);
  }

  refreshLayout();
  showToast("已添加新标签", "success");
}

function handleDeleteItem(button) {
  if (removeEditableItem(button)) {
    showToast("已删除", "info");
  }
}

function wireLinkInteractions() {
  const sitesContainer = document.getElementById("sitesContainer");
  const socialContainer = document.getElementById("socialLinksContainer");

  sitesContainer?.addEventListener("click", (event) => {
    if (event.target.closest(".edit-delete-btn") || event.target.closest(".edit-add-btn")) {
      return;
    }

    const card = event.target.closest('[data-editable="site"]');
    if (!card) return;

    event.preventDefault();
    if (isInEditMode()) {
      openItemModal("site", { mode: "edit", target: card });
      return;
    }

    navigateToUrl(card.dataset.url);
  });

  sitesContainer?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest?.('[data-editable="site"]');
    if (!card) return;

    event.preventDefault();
    if (isInEditMode()) {
      openItemModal("site", { mode: "edit", target: card });
      return;
    }

    navigateToUrl(card.dataset.url);
  });

  socialContainer?.addEventListener("click", (event) => {
    if (event.target.closest(".edit-delete-btn") || event.target.closest(".edit-add-btn")) {
      return;
    }

    const link = event.target.closest('a[data-editable="social"]');
    if (!link) return;

    if (isInEditMode()) {
      event.preventDefault();
      openItemModal("social", { mode: "edit", target: link });
      return;
    }

    const href = link.getAttribute("href") || "#";
    if (!isValidUrlForNavigation(href)) {
      event.preventDefault();
      showToast("未设置链接", "info");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.getElementById("itemModal")?.classList.contains("hidden")) {
      closeItemModal();
    }
  });
}

function setTheme(theme) {
  const root = document.documentElement;
  const darkIcon = document.querySelector(".theme-icon-dark");
  const handdrawnIcon = document.querySelector(".theme-icon-handdrawn");

  if (theme === "handdrawn") {
    root.classList.add("theme-handdrawn");
    darkIcon?.classList.add("hidden");
    handdrawnIcon?.classList.remove("hidden");
    stopCosmicBackground();
  } else {
    root.classList.remove("theme-handdrawn");
    darkIcon?.classList.remove("hidden");
    handdrawnIcon?.classList.add("hidden");
    startCosmicBackground();
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  localStorage.setItem(THEME_MIGRATION_KEY, THEME_MIGRATION_VERSION);
}

function updateClock(force = false) {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ];
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  const value = `${parts.join("-")} ${time.join(":")}`;

  if (!force && value === lastClockValue) {
    return;
  }
  lastClockValue = value;

  const clock = document.getElementById("clock");
  const reflection = document.getElementById("clock-reflection");
  if (clock) clock.textContent = value;
  if (reflection) reflection.textContent = value;
}

function stopClockUpdates() {
  if (!clockTimer) return;
  window.clearInterval(clockTimer);
  clockTimer = null;
}

function startClockUpdates() {
  stopClockUpdates();
  updateClock(true);

  if (document.hidden) {
    return;
  }

  clockTimer = window.setInterval(() => updateClock(), 1000);
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopClockUpdates();
    return;
  }

  startClockUpdates();
}

function initializeTheme() {
  setTheme(getInitialTheme());
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const nextTheme = document.documentElement.classList.contains("theme-handdrawn")
      ? "dark"
      : "handdrawn";
    setTheme(nextTheme);
  });
}

function initializeAuthUi() {
  if (!isAuthenticated()) return;
  document.getElementById("authBtn")?.classList.add("authenticated");
}

function bootstrap() {
  wireItemModalUi();
  wireLinkInteractions();
  initializeTheme();
  initializeAuthUi();
  startClockUpdates();
  document.addEventListener("visibilitychange", handleVisibilityChange);

  syncCurrentConfigFromDom();
  setOriginalConfig(currentConfig);
  refreshLayout();
  loadAndRenderConfig();
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.handleCancelEdit = handleCancelEdit;
window.handleResetLayout = handleResetLayout;
window.handleSave = handleSave;
window.handleImageUpload = handleImageUpload;
window.deleteEditableItem = handleDeleteItem;
window.addTimelineItem = addTimelineItem;
window.addSiteCard = addSiteCard;
window.addSocialLink = addSocialLink;
window.addTag = addTag;
window.closeItemModal = closeItemModal;
window.handleItemModalSave = handleItemModalSave;

document.addEventListener("DOMContentLoaded", bootstrap);

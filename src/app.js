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
  createMagicCardElement,
  createTagElement,
  createTimelineItemElement,
  insertMagicCardElement,
  insertSiteCardElement,
  insertSocialLinkElement,
  renderConfig,
  updateMagicCardElement,
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
let syncMagicCardsViewport = () => {};
let magicCardViewerState = {
  sourceCard: null,
  returnFocus: null,
  closeTimer: 0,
};
let magicCardViewerRotation = {
  frameId: 0,
  lastTimestamp: 0,
  x: 0,
  y: 0,
  dragging: false,
  pointerId: null,
  lastPointerX: 0,
  lastPointerY: 0,
};
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

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function isMagicCardViewerOpen() {
  const viewer = document.getElementById("magicCardViewer");
  return Boolean(viewer && !viewer.classList.contains("hidden"));
}

function setMagicCardViewerOrigin(sourceCard) {
  const viewer = document.getElementById("magicCardViewer");
  const viewerCard = document.getElementById("magicCardViewerCard");
  if (!viewer || !viewerCard || !sourceCard?.isConnected) return false;

  const sourceRect = sourceCard.getBoundingClientRect();
  const targetWidth = viewerCard.offsetWidth;
  const targetHeight = viewerCard.offsetHeight;
  if (!sourceRect.width || !sourceRect.height || !targetWidth || !targetHeight) {
    return false;
  }

  const originScale = Math.max(
    0.1,
    Math.min(1.25, Math.min(sourceRect.width / targetWidth, sourceRect.height / targetHeight)),
  );
  const originX = sourceRect.left + sourceRect.width / 2 - window.innerWidth / 2;
  const originY = sourceRect.top + sourceRect.height / 2 - window.innerHeight / 2;
  const originAngle =
    Number.parseFloat(sourceCard.style.getPropertyValue("--fan-angle")) || 0;

  viewerCard.style.setProperty("--viewer-origin-x", `${Math.round(originX)}px`);
  viewerCard.style.setProperty("--viewer-origin-y", `${Math.round(originY)}px`);
  viewerCard.style.setProperty("--viewer-origin-scale", originScale.toFixed(4));
  viewerCard.style.setProperty("--viewer-origin-angle", `${originAngle.toFixed(2)}deg`);
  return true;
}

function setMagicCardViewerRotation() {
  const viewerSpin = document.getElementById("magicCardViewerSpin");
  if (!viewerSpin) return;

  viewerSpin.style.setProperty(
    "--viewer-rotate-x",
    `${magicCardViewerRotation.x.toFixed(2)}deg`,
  );
  viewerSpin.style.setProperty(
    "--viewer-rotate-y",
    `${magicCardViewerRotation.y.toFixed(2)}deg`,
  );
}

function stopMagicCardViewerRotation() {
  if (magicCardViewerRotation.frameId) {
    window.cancelAnimationFrame(magicCardViewerRotation.frameId);
  }
  magicCardViewerRotation.frameId = 0;
  magicCardViewerRotation.lastTimestamp = 0;
}

function animateMagicCardViewerRotation(timestamp) {
  if (!isMagicCardViewerOpen()) {
    stopMagicCardViewerRotation();
    return;
  }

  if (
    magicCardViewerRotation.lastTimestamp &&
    !magicCardViewerRotation.dragging &&
    !prefersReducedMotion()
  ) {
    const elapsedSeconds = Math.min(
      0.05,
      (timestamp - magicCardViewerRotation.lastTimestamp) / 1000,
    );
    magicCardViewerRotation.y += elapsedSeconds * (360 / 22);
  }

  magicCardViewerRotation.lastTimestamp = timestamp;
  setMagicCardViewerRotation();
  magicCardViewerRotation.frameId = window.requestAnimationFrame(animateMagicCardViewerRotation);
}

function startMagicCardViewerRotation() {
  stopMagicCardViewerRotation();
  magicCardViewerRotation.x = prefersReducedMotion() ? 0 : -6;
  magicCardViewerRotation.y = 0;
  magicCardViewerRotation.dragging = false;
  magicCardViewerRotation.pointerId = null;
  setMagicCardViewerRotation();
  if (prefersReducedMotion()) return;
  magicCardViewerRotation.frameId = window.requestAnimationFrame(animateMagicCardViewerRotation);
}

function handleMagicCardViewerPointerDown(event) {
  const viewer = document.getElementById("magicCardViewer");
  if (!viewer || !isMagicCardViewerOpen()) return;
  if (event.button !== undefined && event.button !== 0) return;

  magicCardViewerRotation.dragging = true;
  magicCardViewerRotation.pointerId = event.pointerId;
  magicCardViewerRotation.lastPointerX = event.clientX;
  magicCardViewerRotation.lastPointerY = event.clientY;
  viewer.classList.add("magic-card-viewer--dragging");
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function handleMagicCardViewerPointerMove(event) {
  if (
    !magicCardViewerRotation.dragging ||
    magicCardViewerRotation.pointerId !== event.pointerId
  ) {
    return;
  }

  const deltaX = event.clientX - magicCardViewerRotation.lastPointerX;
  const deltaY = event.clientY - magicCardViewerRotation.lastPointerY;
  magicCardViewerRotation.lastPointerX = event.clientX;
  magicCardViewerRotation.lastPointerY = event.clientY;
  magicCardViewerRotation.y += deltaX * 0.55;
  magicCardViewerRotation.x = Math.max(
    -82,
    Math.min(82, magicCardViewerRotation.x - deltaY * 0.45),
  );
  setMagicCardViewerRotation();
  event.preventDefault();
}

function releaseMagicCardViewerPointerCapture(element, pointerId) {
  if (
    typeof element?.hasPointerCapture === "function" &&
    element.hasPointerCapture(pointerId)
  ) {
    element.releasePointerCapture?.(pointerId);
  }
}

function finishMagicCardViewerPointerDrag(event) {
  if (
    !magicCardViewerRotation.dragging ||
    magicCardViewerRotation.pointerId !== event.pointerId
  ) {
    return;
  }

  const viewerCard = event.currentTarget;
  magicCardViewerRotation.dragging = false;
  magicCardViewerRotation.pointerId = null;
  releaseMagicCardViewerPointerCapture(viewerCard, event.pointerId);
  document
    .getElementById("magicCardViewer")
    ?.classList.remove("magic-card-viewer--dragging");
  magicCardViewerRotation.lastTimestamp = performance.now();
}

function openMagicCardViewer(card, returnFocus = null) {
  const viewer = document.getElementById("magicCardViewer");
  const viewerCard = document.getElementById("magicCardViewerCard");
  const sourceImage = card?.querySelector('[data-field="image"]');
  if (!viewer || !viewerCard || !card || !sourceImage?.src) {
    showToast("这张卡片还没有图片", "info");
    return;
  }

  if (magicCardViewerState.closeTimer) {
    window.clearTimeout(magicCardViewerState.closeTimer);
  }

  const title = card.querySelector('[data-field="title"]')?.textContent?.trim() || "魔术卡片";
  const description =
    card.querySelector('[data-field="description"]')?.textContent?.trim() || "";
  const index = Number.parseInt(card.dataset.fanIndex || "0", 10);
  const viewerImage = document.getElementById("magicCardViewerImage");
  const viewerBackImage = document.getElementById("magicCardViewerBackImage");
  const viewerTitle = document.getElementById("magicCardViewerTitle");
  const viewerDescription = document.getElementById("magicCardViewerDescription");
  const viewerKicker = document.getElementById("magicCardViewerKicker");

  if (viewerImage) {
    viewerImage.src = sourceImage.currentSrc || sourceImage.src;
    viewerImage.alt = title;
  }
  if (viewerBackImage) {
    viewerBackImage.src = sourceImage.currentSrc || sourceImage.src;
    viewerBackImage.alt = title;
  }
  if (viewerTitle) viewerTitle.textContent = title;
  if (viewerDescription) viewerDescription.textContent = description;
  if (viewerKicker) {
    viewerKicker.textContent = `MAGIC / ${String(Number.isFinite(index) ? index + 1 : 1).padStart(
      2,
      "0",
    )}`;
  }

  magicCardViewerState = {
    sourceCard: card,
    returnFocus: returnFocus || sourceImage,
    closeTimer: 0,
  };
  card.classList.add("magic-card--viewer-source-hidden");
  document.body.classList.add("magic-viewer-open");
  viewer.setAttribute("aria-hidden", "false");
  viewer.classList.remove("magic-card-viewer--open", "magic-card-viewer--closing");
  viewer.classList.remove("hidden");
  viewer.classList.add("magic-card-viewer--visible");

  const hasOrigin = setMagicCardViewerOrigin(card);
  if (!hasOrigin || prefersReducedMotion()) {
    viewer.classList.add("magic-card-viewer--open");
  } else {
    void viewerCard.offsetWidth;
    window.requestAnimationFrame(() => {
      if (isMagicCardViewerOpen()) viewer.classList.add("magic-card-viewer--open");
    });
  }

  startMagicCardViewerRotation();
}

function finishMagicCardViewerClose() {
  const viewer = document.getElementById("magicCardViewer");
  const viewerCard = document.getElementById("magicCardViewerCard");
  const viewerImage = document.getElementById("magicCardViewerImage");
  const viewerBackImage = document.getElementById("magicCardViewerBackImage");
  const returnFocus = magicCardViewerState.returnFocus;

  if (magicCardViewerState.closeTimer) {
    window.clearTimeout(magicCardViewerState.closeTimer);
  }
  stopMagicCardViewerRotation();
  document
    .getElementById("magicCardViewer")
    ?.classList.remove("magic-card-viewer--dragging");
  magicCardViewerState.sourceCard?.classList.remove("magic-card--viewer-source-hidden");
  viewer?.classList.add("hidden");
  viewer?.classList.remove(
    "magic-card-viewer--visible",
    "magic-card-viewer--open",
    "magic-card-viewer--closing",
  );
  viewer?.setAttribute("aria-hidden", "true");
  viewerImage?.removeAttribute("src");
  viewerBackImage?.removeAttribute("src");
  viewerCard?.style.removeProperty("--viewer-origin-x");
  viewerCard?.style.removeProperty("--viewer-origin-y");
  viewerCard?.style.removeProperty("--viewer-origin-scale");
  viewerCard?.style.removeProperty("--viewer-origin-angle");
  document.body.classList.remove("magic-viewer-open");
  magicCardViewerState = { sourceCard: null, returnFocus: null, closeTimer: 0 };

  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}

function closeMagicCardViewer() {
  const viewer = document.getElementById("magicCardViewer");
  const viewerCard = document.getElementById("magicCardViewerCard");
  if (!viewer || !viewerCard || viewer.classList.contains("hidden")) return;
  if (viewer.classList.contains("magic-card-viewer--closing")) return;

  const sourceCard = magicCardViewerState.sourceCard;
  sourceCard?.classList.remove("magic-card--viewer-source-hidden");
  if (
    !sourceCard?.isConnected ||
    prefersReducedMotion() ||
    !setMagicCardViewerOrigin(sourceCard)
  ) {
    finishMagicCardViewerClose();
    return;
  }

  stopMagicCardViewerRotation();
  viewer.classList.remove("magic-card-viewer--dragging");
  viewer.classList.remove("magic-card-viewer--open");
  viewer.classList.add("magic-card-viewer--closing");
  magicCardViewerState.closeTimer = window.setTimeout(finishMagicCardViewerClose, 600);
}

function wireMagicCardViewer() {
  const viewer = document.getElementById("magicCardViewer");
  const stage = viewer?.querySelector(".magic-card-viewer__stage");
  const viewerCard = document.getElementById("magicCardViewerCard");
  if (!viewer) return;

  viewer.addEventListener("click", (event) => {
    if (event.target === viewer || event.target === stage) closeMagicCardViewer();
  });

  viewerCard?.addEventListener("pointerdown", handleMagicCardViewerPointerDown);
  viewerCard?.addEventListener("pointermove", handleMagicCardViewerPointerMove);
  viewerCard?.addEventListener("pointerup", finishMagicCardViewerPointerDrag);
  viewerCard?.addEventListener("pointercancel", finishMagicCardViewerPointerDrag);
  viewerCard?.addEventListener("lostpointercapture", finishMagicCardViewerPointerDrag);
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
  previewElement.parentElement
    ?.querySelector(".magic-card-modal-preview__empty")
    ?.classList.toggle("hidden", Boolean(src));
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

function fillMagicCardModal(target) {
  const title = target?.querySelector('[data-field="title"]')?.textContent?.trim() || "";
  const description =
    target?.querySelector('[data-field="description"]')?.textContent?.trim() || "";
  const url = target?.dataset?.url || "#";
  const image = target?.querySelector('[data-field="image"]')?.getAttribute("src") || "";

  const titleInput = document.getElementById("magicModalTitle");
  const descriptionInput = document.getElementById("magicModalDescription");
  const urlInput = document.getElementById("magicModalUrl");
  const imageInput = document.getElementById("magicModalImage");

  if (titleInput) titleInput.value = title;
  if (descriptionInput) descriptionInput.value = description;
  if (urlInput) urlInput.value = url;
  if (imageInput) imageInput.value = image;
  setImagePreview(document.getElementById("magicModalImagePreview"), image);
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

async function uploadMagicCardImage(file, inputElement, previewElement) {
  if (!file) return;

  try {
    showToast("正在上传魔术卡片图片...", "info");
    const result = await uploadImage(file, "magic-card");
    if (inputElement) inputElement.value = result.url;
    setImagePreview(previewElement, result.url);
    showToast("图片已上传到 R2", "success");
  } catch (error) {
    if (error.status === 401) {
      handleLogout();
      showToast("登录已过期，请重新登录", "error");
      return;
    }

    showToast(error.message || "图片上传失败，卡片尚未保存", "error");
  }
}

function openItemModal(type, { mode = "edit", target = null } = {}) {
  const modal = document.getElementById("itemModal");
  if (!modal) return;

  itemModalState = { type, mode, target };

  const title = document.getElementById("itemModalTitle");
  const siteFields = document.getElementById("itemModalSiteFields");
  const socialFields = document.getElementById("itemModalSocialFields");
  const magicCardFields = document.getElementById("itemModalMagicCardFields");

  siteFields?.classList.add("hidden");
  socialFields?.classList.add("hidden");
  magicCardFields?.classList.add("hidden");

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

  if (type === "magic-card") {
    if (title) title.textContent = mode === "create" ? "添加魔术卡片" : "编辑魔术卡片";
    magicCardFields?.classList.remove("hidden");
    fillMagicCardModal(target);
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

function createMagicCardPayloadFromModal() {
  const title = document.getElementById("magicModalTitle")?.value?.trim() || "";
  const description = document.getElementById("magicModalDescription")?.value?.trim() || "";
  const url = document.getElementById("magicModalUrl")?.value?.trim() || "#";
  const image = document.getElementById("magicModalImage")?.value?.trim() || "";

  return { title, description, url, image };
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
    return;
  }

  if (itemModalState.type === "magic-card") {
    const magicCard = createMagicCardPayloadFromModal();
    if (!magicCard.title) {
      showToast("请填写卡片标题", "error");
      return;
    }

    if (itemModalState.mode === "create") {
      const index = document.querySelectorAll('[data-editable="magic-card"]').length;
      insertMagicCardElement(
        createMagicCardElement(
          { id: generateId(), ...magicCard },
          { index, isEditMode: true },
        ),
      );
      showToast("已添加魔术卡片", "success");
    } else {
      updateMagicCardElement(itemModalState.target, magicCard);
      showToast("已更新魔术卡片", "success");
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

  const magicImageInput = document.getElementById("magicModalImage");
  const magicImagePreview = document.getElementById("magicModalImagePreview");
  const magicImageUploadButton = document.getElementById("magicModalImageUploadBtn");
  const magicImageFile = document.getElementById("magicModalImageFile");

  magicImageInput?.addEventListener("input", () =>
    setImagePreview(magicImagePreview, magicImageInput.value),
  );

  magicImageUploadButton?.addEventListener("click", (event) => {
    event.preventDefault();
    magicImageFile?.click();
  });

  magicImageFile?.addEventListener("change", async () => {
    const file = magicImageFile.files?.[0];
    await uploadMagicCardImage(file, magicImageInput, magicImagePreview);
    magicImageFile.value = "";
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
  syncMagicCardsViewport();
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

  const item = createTimelineItemElement(
    {
      id: generateId(),
      date: "YYYY.MM",
      title: "新事件",
      highlight: false,
    },
    { index: 0, isEditMode: true },
  );

  const firstTimelineItem = container.querySelector('[data-editable="timeline"]');
  const insertionTarget = firstTimelineItem || null;
  if (insertionTarget) container.insertBefore(item, insertionTarget);
  else container.append(item);

  const titleField = item.querySelector('[data-field="title"]');
  titleField?.focus();
  if (titleField) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(titleField);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  refreshLayout();
  showToast("已添加新事件", "success");
}

function addSiteCard() {
  openItemModal("site", { mode: "create" });
}

function addMagicCard() {
  openItemModal("magic-card", { mode: "create" });
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
  const magicCardsContainer = document.getElementById("magicCardsContainer");

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

  magicCardsContainer?.addEventListener("click", (event) => {
    if (event.target.closest(".edit-delete-btn") || event.target.closest(".edit-add-btn")) {
      return;
    }

    const card = event.target.closest('[data-editable="magic-card"]');
    if (!card) return;

    if (isInEditMode()) {
      event.preventDefault();
      openItemModal("magic-card", { mode: "edit", target: card });
      return;
    }

    const action = event.target.closest?.("[data-magic-action]");
    if (!action || !card.contains(action)) return;

    event.preventDefault();
    if (action.dataset.magicAction === "preview") {
      openMagicCardViewer(card, action);
      return;
    }

    navigateToUrl(card.dataset.url);
  });

  magicCardsContainer?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest?.('[data-editable="magic-card"]');
    const action = event.target.closest?.("[data-magic-action]");
    if (!card || !action || !card.contains(action)) return;

    event.preventDefault();
    if (isInEditMode()) {
      openItemModal("magic-card", { mode: "edit", target: card });
      return;
    }

    if (action.dataset.magicAction === "preview") {
      openMagicCardViewer(card, action);
      return;
    }

    navigateToUrl(card.dataset.url);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isMagicCardViewerOpen()) {
      event.preventDefault();
      closeMagicCardViewer();
      return;
    }
    if (!document.getElementById("itemModal")?.classList.contains("hidden")) closeItemModal();
  });
}

function wireMagicCardMotion() {
  const container = document.getElementById("magicCardsContainer");
  if (!container) return;

  let pending = null;
  let frameId = 0;

  const flushSpotlight = () => {
    frameId = 0;
    if (!pending?.card?.isConnected) return;

    pending.card.style.setProperty("--magic-spot-x", `${pending.x}%`);
    pending.card.style.setProperty("--magic-spot-y", `${pending.y}%`);
    pending = null;
  };

  container.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;

    const card = event.target.closest?.('[data-editable="magic-card"]');
    if (!card || !container.contains(card)) return;

    const rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    pending = { card, x, y };

    if (!frameId) frameId = requestAnimationFrame(flushSpotlight);
  });

  container.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return;

    const card = event.target.closest?.('[data-editable="magic-card"]');
    if (!card || !container.contains(card)) return;
    card.classList.add("magic-card--active");
  });

  container.addEventListener("pointerout", (event) => {
    const card = event.target.closest?.('[data-editable="magic-card"]');
    const relatedTarget = event.relatedTarget;
    if (!card || card.contains(relatedTarget)) return;

    card.classList.remove("magic-card--active");
    card.style.setProperty("--magic-spot-x", "50%");
    card.style.setProperty("--magic-spot-y", "50%");
  });
}

function wireMagicCardsViewport() {
  const section = document.getElementById("magicCardsSection");
  if (!section?.parentElement) return;

  let spacer = document.getElementById("magicCardsFlowSpacer");
  if (!spacer) {
    spacer = document.createElement("div");
    spacer.id = "magicCardsFlowSpacer";
    spacer.setAttribute("aria-hidden", "true");
    section.parentElement.insertBefore(spacer, section);
  }

  let viewportState = "flow";
  let syncFrameId = 0;
  let enterFrameId = 0;
  let sectionAnimation = null;

  const cancelPendingEnter = () => {
    if (!enterFrameId) return;
    window.cancelAnimationFrame(enterFrameId);
    enterFrameId = 0;
  };

  const cancelSectionAnimation = () => {
    sectionAnimation?.cancel();
    sectionAnimation = null;
  };

  const resetToFlow = () => {
    cancelPendingEnter();
    cancelSectionAnimation();
    section.classList.remove("magic-section--peek-visible", "magic-section--peek");
    spacer.style.height = "0px";
    viewportState = "flow";
  };

  const exitPeek = () => {
    if (viewportState !== "peek") {
      resetToFlow();
      return;
    }

    cancelPendingEnter();
    cancelSectionAnimation();

    const firstRect = section.getBoundingClientRect();
    section.classList.remove("magic-section--peek-visible", "magic-section--peek");
    spacer.style.height = "0px";
    viewportState = "flow";

    const lastRect = section.getBoundingClientRect();
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof section.animate !== "function" ||
      Math.hypot(deltaX, deltaY) < 1
    ) {
      return;
    }

    sectionAnimation = section.animate(
      [
        { transform: `translate(${deltaX}px, ${deltaY}px)`, opacity: 0.9 },
        { transform: "translate(0, 0)", opacity: 1 },
      ],
      {
        duration: 560,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    );
    sectionAnimation.onfinish = () => {
      sectionAnimation = null;
    };
    sectionAnimation.oncancel = () => {
      sectionAnimation = null;
    };
  };

  const enterPeek = () => {
    if (viewportState === "peek") return;

    cancelSectionAnimation();
    const sectionHeight = Math.ceil(section.getBoundingClientRect().height);
    if (!sectionHeight) return;

    spacer.style.height = `${sectionHeight}px`;
    section.classList.add("magic-section--peek");
    viewportState = "peek";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section.classList.add("magic-section--peek-visible");
      return;
    }

    enterFrameId = window.requestAnimationFrame(() => {
      enterFrameId = 0;
      if (viewportState === "peek") {
        section.classList.add("magic-section--peek-visible");
      }
    });
  };

  const sync = () => {
    syncFrameId = 0;

    const hasCards = Boolean(section.querySelector('[data-editable="magic-card"]'));
    const isHidden = section.style.display === "none";
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!hasCards || isHidden || !isDesktop || isInEditMode()) {
      resetToFlow();
      return;
    }

    const sectionTop = spacer.getBoundingClientRect().top;
    const enterThreshold = window.innerHeight * 0.86;
    const exitThreshold = window.innerHeight * 0.72;

    if (viewportState === "peek") {
      if (sectionTop <= exitThreshold) exitPeek();
      return;
    }

    if (sectionTop > enterThreshold) enterPeek();
  };

  const scheduleSync = () => {
    if (syncFrameId) return;
    syncFrameId = window.requestAnimationFrame(sync);
  };

  window.addEventListener("scroll", scheduleSync, { passive: true });
  window.addEventListener("resize", scheduleSync);

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(scheduleSync);
    observer.observe(section);
  }

  syncMagicCardsViewport = sync;
  sync();
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
  wireMagicCardViewer();
  wireLinkInteractions();
  wireMagicCardMotion();
  wireMagicCardsViewport();
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
window.addMagicCard = addMagicCard;
window.addSocialLink = addSocialLink;
window.addTag = addTag;
window.closeItemModal = closeItemModal;
window.handleItemModalSave = handleItemModalSave;

document.addEventListener("DOMContentLoaded", bootstrap);

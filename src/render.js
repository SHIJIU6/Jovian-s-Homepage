import { generateId, normalizeIconClass } from "../shared/site-config.js";

function setEditableState(element, isEditMode) {
  if (!element) return;
  const editableType = element.getAttribute("data-editable");
  element.classList.toggle("editable-active", isEditMode);
  element.querySelectorAll(".edit-delete-btn").forEach((button) => {
    button.classList.toggle("hidden", !isEditMode);
  });

  element.querySelectorAll("[data-field]").forEach((field) => {
    const fieldName = field.getAttribute("data-field");
    const allowInlineEditing =
      (editableType === "timeline" && (fieldName === "date" || fieldName === "title")) ||
      (editableType === "tag" && fieldName === "tag");

    field.contentEditable = isEditMode && allowInlineEditing ? "true" : "false";
    field.classList.toggle("editable-field", isEditMode && allowInlineEditing);
  });
}

function createDeleteButton(className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = "×";
  button.setAttribute("onclick", "deleteEditableItem(this)");
  return button;
}

function setIconContent(container, { icon, image, alt }) {
  container.replaceChildren();
  if (image) {
    const img = document.createElement("img");
    img.alt = alt;
    img.className = "w-6 h-6 rounded-full object-cover opacity-80";
    img.src = image;
    img.setAttribute("data-field", "image");
    container.append(img);
    return;
  }

  const iconEl = document.createElement("i");
  iconEl.className = normalizeIconClass(icon);
  container.append(iconEl);
}

function setSocialContent(anchor, link, deleteButton) {
  anchor.classList.toggle("has-label", Boolean(link.title));
  anchor.setAttribute("aria-label", link.title || link.href || "Social link");

  anchor.querySelector('[data-field="label"]')?.remove();
  anchor.querySelector('[data-field="image"]')?.remove();
  anchor.querySelector('[data-field="icon"]')?.remove();

  if (link.type === "image" && link.image) {
    const img = document.createElement("img");
    img.alt = link.title || "Social";
    img.className = "w-5 h-5 rounded-full object-cover opacity-80";
    img.src = link.image;
    img.dataset.field = "image";
    anchor.insertBefore(img, deleteButton || null);
  } else {
    const icon = document.createElement("i");
    icon.className = normalizeIconClass(link.icon);
    icon.dataset.field = "icon";
    anchor.insertBefore(icon, deleteButton || null);
  }

  if (link.title) {
    const label = document.createElement("span");
    label.className = "social-icon-label";
    label.dataset.field = "label";
    label.textContent = link.title;
    anchor.insertBefore(label, deleteButton || null);
  }
}

function getSocialExpandedWidth(anchor) {
  const label = anchor.querySelector(".social-icon-label");
  const media = anchor.querySelector('[data-field="icon"], [data-field="image"]');
  if (!label || !media) return anchor.offsetWidth;

  const style = window.getComputedStyle(anchor);
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const expandedGap = 12;
  return Math.ceil(media.offsetWidth + label.scrollWidth + padding + expandedGap);
}

function updateSocialWrapExpansion(anchor) {
  const container = anchor?.parentElement;
  if (!container || !anchor.classList.contains("has-label")) return;

  const currentLeft = anchor.offsetLeft;
  const availableWidth = container.clientWidth - currentLeft;
  const expandedWidth = getSocialExpandedWidth(anchor);
  const shouldWrap = expandedWidth > availableWidth && expandedWidth <= container.clientWidth;

  if (!shouldWrap || anchor.previousElementSibling?.classList.contains("social-line-break")) return;

  const lineBreak = document.createElement("span");
  lineBreak.className = "social-line-break";
  lineBreak.setAttribute("aria-hidden", "true");
  container.insertBefore(lineBreak, anchor);
}

function updateSocialLayoutBreaks(container) {
  if (!container) return;
  container.querySelectorAll(".social-line-break").forEach((lineBreak) => lineBreak.remove());
  container.querySelectorAll(".social-icon.has-label").forEach((anchor) => updateSocialWrapExpansion(anchor));
}

function createPreservedFragment(container) {
  const fragment = document.createDocumentFragment();
  const addButton = container.querySelector(".edit-add-btn");
  return { addButton, fragment };
}

function setSectionVisible(element, isVisible) {
  if (!element) return;
  element.style.display = isVisible ? "" : "none";
}

export function createTimelineItemElement(item, { index = 0, isEditMode = false } = {}) {
  const element = document.createElement("div");
  const isHighlight = Boolean(item.highlight) || index === 0;
  const itemId = item.id || generateId();

  element.className = `timeline-item relative group fade-left-active delay-${Math.min(index + 1, 6) * 100}`;
  element.dataset.editable = "timeline";
  element.dataset.id = itemId;
  element.dataset.highlight = isHighlight ? "true" : "false";
  element.dataset.layoutId = `timeline-${itemId}`;

  const dot = document.createElement("div");
  dot.className =
    "timeline-item__dot timeline-dot absolute -left-[1.8rem] top-1.5 w-3 h-3 rounded-full ring-4 ring-black/20 z-10";

  const date = document.createElement("div");
  date.className = "timeline-item__date text-xs mb-1 tracking-wider";
  date.dataset.field = "date";
  date.textContent = item.date;

  const title = document.createElement("h4");
  title.className =
    "timeline-item__title text-sm font-semibold transition-colors heading";
  title.dataset.field = "title";
  title.textContent = item.title;

  const deleteButton = createDeleteButton(
    "edit-delete-btn edit-control hidden absolute -right-2 -top-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center",
  );

  element.append(dot, date, title, deleteButton);
  setEditableState(element, isEditMode);
  return element;
}

export function createTagElement(tag, { index = 0, isEditMode = false } = {}) {
  const wrapper = document.createElement("span");
  wrapper.className =
    "tag px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-default wobble-hover relative";
  wrapper.dataset.editable = "tag";
  wrapper.dataset.layoutId = `tag-${index}`;

  const text = document.createElement("span");
  text.dataset.field = "tag";
  text.textContent = tag;

  const deleteButton = createDeleteButton(
    "edit-delete-btn hidden absolute -right-1 -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center",
  );

  wrapper.append(text, deleteButton);
  setEditableState(wrapper, isEditMode);
  return wrapper;
}

export function createSiteCardElement(site, { index = 0, isEditMode = false } = {}) {
  const card = document.createElement("div");
  const siteId = site.id || generateId();
  card.className = `group block p-5 rounded-2xl glass-panel fade-enter-active delay-${Math.min(index + 3, 6) * 100} wobble-hover relative`;
  card.dataset.editable = "site";
  card.dataset.id = siteId;
  card.dataset.url = site.url || "#";
  card.dataset.layoutId = `site-${siteId}`;
  card.setAttribute("role", "link");
  card.setAttribute("tabindex", "0");

  const header = document.createElement("div");
  header.className = "flex justify-between items-start mb-3";

  const title = document.createElement("h3");
  title.className = "font-bold text-lg group-hover:opacity-80 transition-opacity heading";
  title.dataset.field = "title";
  title.textContent = site.title;

  const iconWrap = document.createElement("div");
  iconWrap.className = "site-card-icon w-9 h-9 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]";
  if (site.accent) iconWrap.classList.add("accent");
  iconWrap.dataset.field = "icon";
  setIconContent(iconWrap, {
    icon: site.icon,
    image: site.iconType === "image" ? site.image : "",
    alt: "Site",
  });

  header.append(title, iconWrap);

  const description = document.createElement("p");
  description.className = "text-xs font-light";
  description.style.color = "var(--text-muted)";
  description.dataset.field = "description";
  description.textContent = site.description || "";

  const deleteButton = createDeleteButton(
    "edit-delete-btn edit-control hidden absolute right-2 top-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center",
  );

  card.append(header, description, deleteButton);
  setEditableState(card, isEditMode);
  return card;
}

export function updateSiteCardElement(target, site) {
  if (!target) return;
  target.dataset.url = site.url || "#";

  const title = target.querySelector('[data-field="title"]');
  const description = target.querySelector('[data-field="description"]');
  const iconWrap = target.querySelector('[data-field="icon"]');

  if (title) title.textContent = site.title;
  if (description) description.textContent = site.description || "";
  if (iconWrap) {
    iconWrap.classList.toggle("accent", Boolean(site.accent));
    setIconContent(iconWrap, {
      icon: site.icon,
      image: site.iconType === "image" ? site.image : "",
      alt: "Site",
    });
  }
}

function setMagicCardMedia(container, card) {
  if (!container) return;

  container.querySelector('[data-field="image"]')?.remove();
  container.querySelector(".magic-card__placeholder")?.remove();

  if (card.image) {
    const image = document.createElement("img");
    image.className = "magic-card__image";
    image.alt = card.title || "Magic card";
    image.loading = "lazy";
    image.decoding = "async";
    image.dataset.field = "image";
    image.dataset.magicAction = "preview";
    image.setAttribute("role", "button");
    image.setAttribute("tabindex", "0");
    image.setAttribute("aria-label", `查看${card.title || "魔术卡片"}图片`);
    image.src = card.image;
    container.prepend(image);
    return;
  }

  const placeholder = document.createElement("div");
  placeholder.className = "magic-card__placeholder";
  placeholder.setAttribute("aria-hidden", "true");

  const icon = document.createElement("i");
  icon.className = "fas fa-wand-magic-sparkles";
  placeholder.append(icon);
  container.prepend(placeholder);
}

const magicCardFanObserved = new WeakSet();

function setMagicCardFanPosition(element, index, count, spread) {
  if (!element) return;

  const center = (count - 1) / 2;
  const distanceFromCenter = index - center;
  const angle = distanceFromCenter * Math.min(14, 56 / Math.max(count - 1, 1));
  const verticalOffset = -Math.abs(distanceFromCenter) * 4;

  element.dataset.fanIndex = String(index);
  element.style.setProperty("--fan-x", `${Math.round(distanceFromCenter * spread)}px`);
  element.style.setProperty("--fan-y", `${Math.round(verticalOffset)}px`);
  element.style.setProperty("--fan-angle", `${angle.toFixed(2)}deg`);
  element.style.setProperty(
    "--fan-z",
    String(Math.round(count * 10 - Math.abs(distanceFromCenter) * 10) + index),
  );
  element.style.setProperty("--magic-delay", `${Math.min(index, 6) * 70}ms`);
}

function syncMagicCardFanLayout(container) {
  if (!container) return;

  const cards = [...container.querySelectorAll('[data-editable="magic-card"]')];
  if (cards.length) {
    const cardWidth =
      Number.parseFloat(window.getComputedStyle(cards[0]).width) || 160;
    const availableWidth = Math.max(220, container.clientWidth - 64);
    const fitSpread = (availableWidth - cardWidth) / Math.max(cards.length - 1, 1);
    const spread = Math.min(112, Math.max(36, fitSpread));

    cards.forEach((card, index) =>
      setMagicCardFanPosition(card, index, cards.length, spread),
    );
  }

  if (typeof ResizeObserver === "function" && !magicCardFanObserved.has(container)) {
    magicCardFanObserved.add(container);
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => syncMagicCardFanLayout(container));
    });
    observer.observe(container);
  }
}

export function createMagicCardElement(card, { index = 0, isEditMode = false } = {}) {
  const element = document.createElement("article");
  const cardId = card.id || generateId();

  element.className = "magic-card relative";
  element.dataset.editable = "magic-card";
  element.dataset.id = cardId;
  element.dataset.url = card.url || "#";
  element.dataset.variant = String(index % 4);
  element.dataset.layoutId = `magic-card-${cardId}`;
  element.setAttribute("role", "group");
  element.setAttribute("aria-label", card.title || "Magic card");

  const media = document.createElement("div");
  media.className = "magic-card__media";
  setMagicCardMedia(media, card);

  const sheen = document.createElement("div");
  sheen.className = "magic-card__sheen";
  sheen.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "magic-card__content";

  const eyebrow = document.createElement("span");
  eyebrow.className = "magic-card__eyebrow";
  eyebrow.textContent = `MAGIC / ${String(index + 1).padStart(2, "0")}`;

  const title = document.createElement("h3");
  title.className = "magic-card__title heading";
  title.dataset.field = "title";
  title.dataset.magicAction = "link";
  title.setAttribute("role", "link");
  title.setAttribute("tabindex", "0");
  title.textContent = card.title || "魔术卡片";

  const description = document.createElement("p");
  description.className = "magic-card__description";
  description.dataset.field = "description";
  description.textContent = card.description || "";
  if (card.description?.trim()) {
    description.dataset.magicAction = "link";
    description.setAttribute("role", "link");
    description.setAttribute("tabindex", "0");
  }

  const footer = document.createElement("div");
  footer.className = "magic-card__footer";

  const hint = document.createElement("span");
  hint.className = "magic-card__hint";
  hint.dataset.magicAction = "link";
  hint.setAttribute("role", "link");
  hint.setAttribute("tabindex", "0");
  hint.textContent = "打开卡片";

  const arrow = document.createElement("span");
  arrow.className = "magic-card__arrow";
  arrow.dataset.magicAction = "link";
  arrow.setAttribute("role", "link");
  arrow.setAttribute("tabindex", "0");
  arrow.setAttribute("aria-label", "打开卡片");
  arrow.innerHTML = '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>';

  footer.append(hint, arrow);
  content.append(eyebrow, title, description, footer);

  const deleteButton = createDeleteButton(
    "magic-card__delete edit-delete-btn edit-control hidden absolute right-3 top-3 w-7 h-7 rounded-full bg-red-500 text-white text-xs flex items-center justify-center",
  );

  element.append(media, sheen, content, deleteButton);
  setEditableState(element, isEditMode);
  return element;
}

export function updateMagicCardElement(target, card) {
  if (!target) return;

  target.dataset.url = card.url || "#";
  target.setAttribute("aria-label", card.title || "Magic card");

  const title = target.querySelector('[data-field="title"]');
  const description = target.querySelector('[data-field="description"]');
  const media = target.querySelector(".magic-card__media");

  if (title) title.textContent = card.title || "魔术卡片";
  if (description) {
    description.textContent = card.description || "";
    if (card.description?.trim()) {
      description.dataset.magicAction = "link";
      description.setAttribute("role", "link");
      description.setAttribute("tabindex", "0");
    } else {
      delete description.dataset.magicAction;
      description.removeAttribute("role");
      description.removeAttribute("tabindex");
    }
  }
  setMagicCardMedia(media, card);
}

export function createSocialLinkElement(link, { isEditMode = false } = {}) {
  const anchor = document.createElement("a");
  const linkId = link.id || generateId();
  anchor.className =
    "social-icon h-10 min-w-10 px-0 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm relative overflow-hidden";
  anchor.href = link.href || "#";
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.dataset.editable = "social";
  anchor.dataset.id = linkId;
  anchor.dataset.type = link.type || "icon";
  anchor.dataset.layoutId = `social-${linkId}`;

  const deleteButton = createDeleteButton(
    "edit-delete-btn hidden absolute -right-1 -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center",
  );

  anchor.append(deleteButton);
  setSocialContent(anchor, link, deleteButton);
  anchor.classList.toggle("editable-active", isEditMode);
  deleteButton.classList.toggle("hidden", !isEditMode);
  return anchor;
}

export function updateSocialLinkElement(target, link) {
  if (!target) return;
  target.dataset.type = link.type || "icon";
  target.href = link.href || "#";
  target.target = "_blank";
  target.rel = "noopener noreferrer";

  const deleteButton = target.querySelector(".edit-delete-btn");
  setSocialContent(target, link, deleteButton);
  requestAnimationFrame(() => updateSocialLayoutBreaks(target.parentElement));
}

export function insertSiteCardElement(element) {
  const container = document.getElementById("sitesContainer");
  if (!container || !element) return;
  const addButton = container.querySelector(".edit-add-btn");
  if (addButton) {
    container.insertBefore(element, addButton);
    return;
  }
  container.append(element);
}

export function insertSocialLinkElement(element) {
  const container = document.getElementById("socialLinksContainer");
  if (!container || !element) return;
  const addButton = container.querySelector(".edit-add-btn");
  if (addButton) {
    container.insertBefore(element, addButton);
    requestAnimationFrame(() => updateSocialLayoutBreaks(container));
    return;
  }
  container.append(element);
  requestAnimationFrame(() => updateSocialLayoutBreaks(container));
}

export function insertMagicCardElement(element) {
  const container = document.getElementById("magicCardsContainer");
  if (!container || !element) return;

  const addButton = container.querySelector(".edit-add-btn");
  if (addButton) {
    container.insertBefore(element, addButton);
  } else {
    container.append(element);
  }

  syncMagicCardFanLayout(container);
}

export function renderTimeline(timeline, { isEditMode = false } = {}) {
  const container = document.getElementById("timelineItems");
  if (!container) return;

  const { addButton, fragment } = createPreservedFragment(container);
  if (addButton) fragment.append(addButton);
  timeline.forEach((item, index) => {
    fragment.append(createTimelineItemElement(item, { index, isEditMode }));
  });
  container.replaceChildren(fragment);
}

export function renderTags(tags, { isEditMode = false } = {}) {
  const container = document.getElementById("tagsContainer");
  if (!container) return;

  const { addButton, fragment } = createPreservedFragment(container);
  tags.forEach((tag, index) => {
    fragment.append(createTagElement(tag, { index, isEditMode }));
  });
  if (addButton) fragment.append(addButton);
  container.replaceChildren(fragment);
}

export function renderSites(sites, { isEditMode = false } = {}) {
  const container = document.getElementById("sitesContainer");
  if (!container) return;

  const { addButton, fragment } = createPreservedFragment(container);
  sites.forEach((site, index) => {
    fragment.append(createSiteCardElement(site, { index, isEditMode }));
  });
  if (addButton) fragment.append(addButton);
  container.replaceChildren(fragment);
}

export function renderSocialLinks(socialLinks, { isEditMode = false } = {}) {
  const container = document.getElementById("socialLinksContainer");
  if (!container) return;

  const { addButton, fragment } = createPreservedFragment(container);
  socialLinks.forEach((link) => {
    fragment.append(createSocialLinkElement(link, { isEditMode }));
  });
  if (addButton) fragment.append(addButton);
  container.replaceChildren(fragment);
  requestAnimationFrame(() => updateSocialLayoutBreaks(container));
}

export function renderMagicCards(magicCards, { isEditMode = false } = {}) {
  const container = document.getElementById("magicCardsContainer");
  if (!container) return;

  const { addButton, fragment } = createPreservedFragment(container);
  magicCards.forEach((card, index) => {
    fragment.append(createMagicCardElement(card, { index, isEditMode }));
  });
  if (addButton) fragment.append(addButton);
  container.replaceChildren(fragment);
  syncMagicCardFanLayout(container);
}

export function renderConfig(config, { isEditMode = false } = {}) {
  renderTimeline(config.timeline || [], { isEditMode });
  renderTags(config.tags || [], { isEditMode });
  renderSites(config.sites || [], { isEditMode });
  renderSocialLinks(config.socialLinks || [], { isEditMode });
  renderMagicCards(config.magicCards || [], { isEditMode });

  const location = document.querySelector('[data-field="location"]');
  const status = document.querySelector('[data-field="status"]');
  const avatar = document.querySelector(".avatar-container img");
  const background = document.querySelector(".theme-bg-dark img");
  const timelineContainer = document.getElementById("timelineContainer");
  const tagsContainer = document.getElementById("tagsContainer");
  const magicCardsSection = document.getElementById("magicCardsSection");
  const infoCard = document.querySelector('[data-editable="info"]');
  const locationRow = document.querySelector('[data-info-row="location"]');
  const statusRow = document.querySelector('[data-info-row="status"]');

  if (location) location.textContent = config.info?.location || "";
  if (status) status.textContent = config.info?.status || "";
  if (avatar && config.images?.avatar) avatar.src = config.images.avatar;
  if (background && config.images?.background) background.src = config.images.background;

  const hasTimelineItems = (config.timeline || []).length > 0;
  const hasTags = (config.tags || []).length > 0;
  const hasMagicCards = (config.magicCards || []).length > 0;
  const hasLocation = Boolean(config.info?.location);
  const hasStatus = Boolean(config.info?.status);

  setSectionVisible(timelineContainer, isEditMode || hasTimelineItems);
  setSectionVisible(tagsContainer, isEditMode || hasTags);
  setSectionVisible(magicCardsSection, isEditMode || hasMagicCards);
  setSectionVisible(locationRow, isEditMode || hasLocation);
  setSectionVisible(statusRow, isEditMode || hasStatus);
  setSectionVisible(infoCard, isEditMode || hasLocation || hasStatus);
}

/**
 * Shared site-config schema utilities.
 * Reference: Cloudflare Pages Functions data contract (compatible with current `wrangler` 3.114.17 runtime).
 */

const LIMITS = Object.freeze({
  timeline: 20,
  sites: 16,
  tags: 24,
  socialLinks: 12,
  layoutEntries: 128,
  date: 32,
  title: 80,
  description: 160,
  tag: 32,
  info: 64,
  url: 1024,
  icon: 128,
  layoutKey: 128,
  layoutOffset: 4096,
});

const DEFAULT_TIMELINE = Object.freeze([]);

const DEFAULT_SITES = Object.freeze([
  {
    id: "1",
    title: "博客",
    description: "记录学习日常",
    icon: "fas fa-lightbulb",
    url: "#",
    accent: false,
    iconType: "icon",
    image: "",
  },
  {
    id: "2",
    title: "云盘",
    description: "分享收集文件",
    icon: "fas fa-cloud",
    url: "#",
    accent: false,
    iconType: "icon",
    image: "",
  },
  {
    id: "3",
    title: "文件箱",
    description: "传输文件",
    icon: "fas fa-truck-loading",
    url: "#",
    accent: false,
    iconType: "icon",
    image: "",
  },
  {
    id: "4",
    title: "待建",
    description: "待建",
    icon: "fas fa-pencil-alt",
    url: "#",
    accent: true,
    iconType: "icon",
    image: "",
  },
]);

const DEFAULT_TAGS = Object.freeze([]);

const DEFAULT_SOCIAL_LINKS = Object.freeze([
  {
    id: "1",
    type: "image",
    title: "",
    href: "#",
    icon: "",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA4wEQm-SKKAqUtv1J6RTG3L7AxRRUAp2Z1-nna4MxQ-kYvfghsoXspNgivIk2va-io4jIHMur0YwYhywYcOS2Q1VrW4sUcGZ_lwwFmAa2grjymU112fxXqed9-6TyUrAv69rY0sf9cO8bZ4so3M0M6RLNbhd8nVnpC8-1QCRK2aw86jPqFkC23tm4TRaQfPfdHikiBqVfNyWZ3CENTOS0BoNn9lT3nrurKStNaIEZWsVdTbhNA9_9JVsDJqRC3eamaWAPYS9xMckgk",
  },
  {
    id: "2",
    type: "icon",
    title: "",
    href: "#",
    icon: "fab fa-telegram-plane",
    image: "",
  },
  {
    id: "3",
    type: "icon",
    title: "",
    href: "#",
    icon: "fab fa-github",
    image: "",
  },
  {
    id: "4",
    type: "icon",
    title: "",
    href: "#",
    icon: "fas fa-envelope",
    image: "",
  },
]);

const DEFAULT_INFO = Object.freeze({
  location: "",
  status: "",
});

const DEFAULT_IMAGES = Object.freeze({
  avatar: "touxiang.jpg",
  background: "Background.webp",
});

const DEFAULT_LAYOUT = Object.freeze({
  positions: Object.freeze({}),
});

function trimString(value, fallback = "", maxLength = Infinity) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function toBoolean(value) {
  return value === true || value === "true";
}

function normalizeUrl(value, fallback = "#") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, LIMITS.url) : fallback;
}

function normalizeLayoutOffset(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-LIMITS.layoutOffset, Math.min(LIMITS.layoutOffset, Math.round(numeric)));
}

export function generateId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeIconClass(value, fallback = "fas fa-link") {
  const trimmed = trimString(value, "", LIMITS.icon);
  if (!trimmed) return fallback;
  if (trimmed.includes(" ")) return trimmed;
  if (trimmed.startsWith("fa-")) return `fas ${trimmed}`;
  if (trimmed.startsWith("fas") || trimmed.startsWith("fab")) return trimmed;
  return `fas fa-${trimmed.replace(/^fa-/, "")}`;
}

function normalizeTimelineItem(item, index = 0) {
  return {
    id: trimString(item?.id, generateId(), LIMITS.title),
    date: trimString(item?.date, "YYYY.MM", LIMITS.date),
    title: trimString(item?.title, "新事件", LIMITS.title),
    highlight: toBoolean(item?.highlight) || index === 0,
  };
}

function normalizeSiteItem(item) {
  const image = normalizeUrl(item?.image, "");
  const iconType = image ? "image" : "icon";
  return {
    id: trimString(item?.id, generateId(), LIMITS.title),
    title: trimString(item?.title, "新站点", LIMITS.title),
    description: trimString(item?.description, "", LIMITS.description),
    icon: normalizeIconClass(item?.icon, "fas fa-link"),
    url: normalizeUrl(item?.url || item?.href, "#"),
    accent: toBoolean(item?.accent),
    iconType,
    image,
  };
}

function normalizeTag(tag) {
  return trimString(tag, "", LIMITS.tag);
}

function normalizeSocialLink(item) {
  const type = item?.type === "image" ? "image" : "icon";
  const image = type === "image" ? normalizeUrl(item?.image, "") : "";
  return {
    id: trimString(item?.id, generateId(), LIMITS.title),
    type: image ? "image" : "icon",
    title: trimString(item?.title, "", LIMITS.title),
    href: normalizeUrl(item?.href || item?.url, "#"),
    icon: normalizeIconClass(item?.icon, "fas fa-link"),
    image,
  };
}

function normalizeLayout(layout) {
  const input =
    layout && typeof layout === "object" && layout.positions && typeof layout.positions === "object"
      ? layout.positions
      : DEFAULT_LAYOUT.positions;

  const positions = Object.entries(input)
    .slice(0, LIMITS.layoutEntries)
    .reduce((accumulator, [key, position]) => {
      const normalizedKey = trimString(key, "", LIMITS.layoutKey);
      if (!normalizedKey) return accumulator;

      const x = normalizeLayoutOffset(position?.x);
      const y = normalizeLayoutOffset(position?.y);
      if (x === 0 && y === 0) return accumulator;

      accumulator[normalizedKey] = { x, y };
      return accumulator;
    }, {});

  return { positions };
}

export function createDefaultConfig() {
  return {
    timeline: DEFAULT_TIMELINE.map((item, index) => normalizeTimelineItem(item, index)),
    sites: DEFAULT_SITES.map((item) => normalizeSiteItem(item)),
    tags: DEFAULT_TAGS.map((tag) => normalizeTag(tag)).filter(Boolean),
    info: {
      location: DEFAULT_INFO.location,
      status: DEFAULT_INFO.status,
    },
    images: {
      avatar: DEFAULT_IMAGES.avatar,
      background: DEFAULT_IMAGES.background,
    },
    socialLinks: DEFAULT_SOCIAL_LINKS.map((item) => normalizeSocialLink(item)),
    layout: normalizeLayout(DEFAULT_LAYOUT),
    updatedAt: null,
  };
}

export function normalizeConfig(config) {
  const defaults = createDefaultConfig();
  if (!config || typeof config !== "object") return defaults;

  const timelineInput = Array.isArray(config.timeline) ? config.timeline : defaults.timeline;
  const sitesInput = Array.isArray(config.sites) ? config.sites : defaults.sites;
  const tagsInput = Array.isArray(config.tags) ? config.tags : defaults.tags;
  const socialInput = Array.isArray(config.socialLinks)
    ? config.socialLinks
    : defaults.socialLinks;

  return {
    timeline: timelineInput
      .slice(0, LIMITS.timeline)
      .map((item, index) => normalizeTimelineItem(item, index)),
    sites: sitesInput.slice(0, LIMITS.sites).map((item) => normalizeSiteItem(item)),
    tags: tagsInput
      .slice(0, LIMITS.tags)
      .map((tag) => normalizeTag(tag))
      .filter(Boolean),
    info: {
      location: trimString(config.info?.location, defaults.info.location, LIMITS.info),
      status: trimString(config.info?.status, defaults.info.status, LIMITS.info),
    },
    images: {
      avatar: normalizeUrl(config.images?.avatar, defaults.images.avatar),
      background: normalizeUrl(config.images?.background, defaults.images.background),
    },
    socialLinks: socialInput
      .slice(0, LIMITS.socialLinks)
      .map((item) => normalizeSocialLink(item)),
    layout: normalizeLayout(config.layout),
    updatedAt:
      typeof config.updatedAt === "number" && Number.isFinite(config.updatedAt)
        ? config.updatedAt
        : null,
  };
}

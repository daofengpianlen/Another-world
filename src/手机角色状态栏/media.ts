import mediaLocalMap from './assets/mediaLocalMap.json';

export const MEDIA_BASE_URL = 'https://files.catbox.moe/';

const GAL_PROJECT_SEGMENT = '手机角色状态栏';

declare global {
  interface Window {
    __GAL_ASSETS_BASE__?: string;
  }
}

const LOCAL_MEDIA_FILES: Record<string, string> = mediaLocalMap.files ?? {};
const HAS_LOCAL_MEDIA = Object.keys(LOCAL_MEDIA_FILES).length > 0;

function decodeUrl(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

function assetsBaseFromScriptSrc(src: string): string | null {
  const decoded = decodeUrl(src);
  const match = decoded.match(new RegExp(`^(.*\\/${GAL_PROJECT_SEGMENT})\\/脚本\\/`));
  if (match) return `${match[1]}/assets/`;
  return null;
}

function assetsBaseFromModuleUrl(moduleUrl: string): string | null {
  const href = decodeUrl(moduleUrl);
  if (!href.includes(`/${GAL_PROJECT_SEGMENT}/`)) return null;

  const fromScript = assetsBaseFromScriptSrc(href);
  if (fromScript) return fromScript;

  const replaced = href.replace(/\/脚本\/[^/]+\/[^/?#]+\.?m?js.*$/i, '/assets/');
  return replaced !== href ? replaced : null;
}

function assetsBaseFromPageUrl(href: string): string | null {
  const decoded = decodeUrl(href);
  const match = decoded.match(new RegExp(`^(.*\\/${GAL_PROJECT_SEGMENT})(?:\\/界面\\/|\\/脚本\\/)`));
  if (match) return `${match[1]}/assets/`;
  return null;
}

function readImportMetaAssetsBase(): string | null {
  try {
    if (typeof import.meta === 'undefined' || !import.meta.url) return null;
    const href = decodeUrl(new URL(import.meta.url, window.location.href).href);
    if (!/^https?:/i.test(href)) return null;
    return assetsBaseFromModuleUrl(href);
  } catch {
    return null;
  }
}

/** 动态 import 的 ES 模块不会出现在 script[src]，从 Performance 记录里找 GAL 脚本 URL */
function assetsBaseFromPerformance(): string | null {
  if (typeof performance === 'undefined') return null;
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const base = assetsBaseFromScriptSrc(entries[i].name);
    if (base) return base;
    const fromModule = assetsBaseFromModuleUrl(entries[i].name);
    if (fromModule) return fromModule;
  }
  return null;
}

/** 与 index.yaml 中 serve:dist 默认地址一致；本地有 assets 时作最后兜底 */
const DEV_SERVE_ASSETS_BASE = `http://127.0.0.1:5500/dist/${GAL_PROJECT_SEGMENT}/assets/`;

function assetsBaseFallback(): string | null {
  if (!HAS_LOCAL_MEDIA) return null;
  return DEV_SERVE_ASSETS_BASE;
}

/** 在 GAL 脚本/界面入口调用，供 iframe 内 Vue 读取本地 assets 根路径 */
export function publishGalAssetsBase(): void {
  if (typeof document === 'undefined') return;

  const candidates = [
    readImportMetaAssetsBase(),
    assetsBaseFromPerformance(),
  ];

  for (const base of candidates) {
    if (base) {
      window.__GAL_ASSETS_BASE__ = base;
      console.info('[gal_assets] 本地资源根路径', base);
      return;
    }
  }

  for (const script of document.querySelectorAll<HTMLScriptElement>('script[src]')) {
    const base = assetsBaseFromScriptSrc(script.getAttribute('src') ?? '');
    if (base) {
      window.__GAL_ASSETS_BASE__ = base;
      console.info('[gal_assets] 本地资源根路径', base);
      return;
    }
  }

  const pageBase = assetsBaseFromPageUrl(window.location.href);
  if (pageBase) {
    window.__GAL_ASSETS_BASE__ = pageBase;
    console.info('[gal_assets] 本地资源根路径', pageBase);
    return;
  }

  const fallback = assetsBaseFallback();
  if (fallback) {
    window.__GAL_ASSETS_BASE__ = fallback;
    console.info('[gal_assets] 本地资源根路径（开发兜底）', fallback);
  }
}

/** 解析本地 assets 根 URL（与 GAL 脚本同级的 assets 文件夹） */
export function resolveGalAssetsBase(): string {
  if (typeof document === 'undefined') return '';

  const windows: Window[] = [];
  try {
    if (window.parent !== window) windows.push(window.parent);
  } catch {
    /* ignore */
  }
  windows.push(window);

  for (const win of windows) {
    if (win.__GAL_ASSETS_BASE__) return win.__GAL_ASSETS_BASE__;
  }

  const fromMeta = readImportMetaAssetsBase();
  if (fromMeta) return fromMeta;

  const fromPerformance = assetsBaseFromPerformance();
  if (fromPerformance) return fromPerformance;

  for (const win of windows) {
    try {
      for (const script of win.document.querySelectorAll<HTMLScriptElement>('script[src]')) {
        const base = assetsBaseFromScriptSrc(script.getAttribute('src') ?? '');
        if (base) return base;
      }
      const base = assetsBaseFromPageUrl(win.location.href);
      if (base) return base;
    } catch {
      /* cross-origin parent */
    }
  }

  return assetsBaseFallback() ?? '';
}

function catboxFileName(url: string): string | null {
  const trimmed = url.trim();
  const remote = trimmed.match(/files\.catbox\.moe\/([^/?#]+)/i);
  if (remote) return remote[1];
  if (/^[a-z0-9]+\.(png|jpe?g|gif|webp|mp4|webm|ogg|mov)$/i.test(trimmed)) return trimmed;
  return null;
}

function tryLocalMediaUrl(file: string): string | null {
  if (!HAS_LOCAL_MEDIA) return null;
  const localRel = LOCAL_MEDIA_FILES[file];
  if (!localRel) return null;
  const base = resolveGalAssetsBase();
  if (!base) return null;
  return `${base}${localRel.replace(/^\//, '')}`;
}

/** 场景 / 背景标准尺寸 1280×720 */
export const SCENE_WIDTH = 1280;
export const SCENE_HEIGHT = 720;
export const SCENE_ASPECT = `${SCENE_WIDTH} / ${SCENE_HEIGHT}`;

/** NPC 头像 / 对话立绘标准尺寸 295×358（半身矩形） */
export const PORTRAIT_WIDTH = 295;
export const PORTRAIT_HEIGHT = 358;
export const PORTRAIT_ASPECT = `${PORTRAIT_WIDTH} / ${PORTRAIT_HEIGHT}`;

/** 剧情对话区立绘框（与气泡同高） */
export const DIALOGUE_PORTRAIT_WIDTH = 96;
export const DIALOGUE_PORTRAIT_HEIGHT = Math.round((DIALOGUE_PORTRAIT_WIDTH * PORTRAIT_HEIGHT) / PORTRAIT_WIDTH);
export const DIALOGUE_BODY_PADDING_Y = 24;
export const DIALOGUE_BODY_HEIGHT = DIALOGUE_PORTRAIT_HEIGHT + DIALOGUE_BODY_PADDING_Y;

/** 圆形头像裁切（295×358 图在圆内：不额外放大，偏上取脸肩） */
export const NPC_AVATAR_OBJECT_POSITION = 'center 22%';

/** GAL 界面设计稿尺寸（全屏时通过 zoom 等比缩放） */
export const GAL_DESIGN_WIDTH = 960;
export const GAL_TOPBAR_HEIGHT = 52;
export const GAL_BODY_HEIGHT = Math.round((GAL_DESIGN_WIDTH * 11) / 16);
export const GAL_DESIGN_HEIGHT = GAL_TOPBAR_HEIGHT + GAL_BODY_HEIGHT;

/** UI 圆形头像尺寸（设计稿 px，随 gal-shell zoom 等比缩放） */
export const CHAT_AVATAR_SIZE = 44;
export const NPC_CARD_AVATAR_SIZE = 72;
export const NPC_PROFILE_AVATAR_SIZE = 88;

export function resolveMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;

  const file = catboxFileName(trimmed);
  if (file) {
    const local = tryLocalMediaUrl(file);
    if (local) return local;
  }

  if (/^https?:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;

  const localRel = LOCAL_MEDIA_FILES[trimmed] ?? (trimmed.includes('/') ? trimmed : '');
  if (localRel && HAS_LOCAL_MEDIA) {
    const base = resolveGalAssetsBase();
    if (base) return `${base}${localRel.replace(/^\//, '')}`;
  }

  return `${MEDIA_BASE_URL}${trimmed.replace(/^\//, '')}`;
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

import mediaLocalMap from '../assets/mediaLocalMap.json';

export const WUWA_MEDIA_BASE_URL = 'https://files.catbox.moe/';

const WUWA_PROJECT_SEGMENT = '鸣潮';

declare global {
  interface Window {
    __WUWA_ASSETS_BASE__?: string;
    __WUWA_RESOLVE_MEDIA__?: (url: string) => string;
  }
}

type MediaMap = {
  files?: Record<string, string>;
  urls?: Record<string, string>;
};

const map = mediaLocalMap as MediaMap;
const LOCAL_FILES: Record<string, string> = map.files ?? {};
const LOCAL_URLS: Record<string, string> = map.urls ?? {};
const HAS_LOCAL_MEDIA = Object.keys(LOCAL_FILES).length > 0;

function decodeUrl(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

function assetsBaseFromScriptSrc(src: string): string | null {
  const decoded = decodeUrl(src);
  const match = decoded.match(new RegExp(`^(.*\\/${WUWA_PROJECT_SEGMENT})\\/脚本\\/`));
  if (match) return `${match[1]}/assets/`;
  return null;
}

function assetsBaseFromModuleUrl(moduleUrl: string): string | null {
  const href = decodeUrl(moduleUrl);
  if (!href.includes(`/${WUWA_PROJECT_SEGMENT}/`)) return null;
  const fromScript = assetsBaseFromScriptSrc(href);
  if (fromScript) return fromScript;
  const replaced = href.replace(/\/脚本\/[^/]+\/[^/?#]+\.?m?js.*$/i, '/assets/');
  return replaced !== href ? replaced : null;
}

/** jsDelivr 不提供 Git LFS 二进制；脚本/资源 URL 含 jsdelivr 时改走 GitHub LFS media 域 */
function assetsBaseFromJsDelivrModule(moduleUrl: string): string | null {
  const href = decodeUrl(moduleUrl);
  const m = href.match(/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)(?:@([^/]+))?/i);
  if (!m) return null;
  const user = m[1];
  const repo = m[2];
  const branch = m[3] ?? 'main';
  return `https://media.githubusercontent.com/media/${user}/${repo}/${branch}/dist/${WUWA_PROJECT_SEGMENT}/assets/`;
}

/** 任意已解析的 assets 根路径：jsDelivr 会 404 或只返回 LFS 指针，统一改 media 域 */
function normalizeAssetsBase(base: string): string {
  const decoded = decodeUrl(base);
  const direct = decoded.match(
    /cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)(?:@([^/]+))?\/dist\/[^/]+\/assets\/?/i,
  );
  if (direct) {
    const branch = direct[3] ?? 'main';
    return `https://media.githubusercontent.com/media/${direct[1]}/${direct[2]}/${branch}/dist/${WUWA_PROJECT_SEGMENT}/assets/`;
  }
  const fromModule = assetsBaseFromJsDelivrModule(decoded);
  if (fromModule) return fromModule;
  return base.endsWith('/') ? base : `${base}/`;
}

function assetsBaseFromPerformance(): string | null {
  if (typeof performance === 'undefined') return null;
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const href = entries[i].name;
    const fromJsDelivr = assetsBaseFromJsDelivrModule(href);
    if (fromJsDelivr) return fromJsDelivr;
    const base = assetsBaseFromScriptSrc(href) ?? assetsBaseFromModuleUrl(href);
    if (base) return normalizeAssetsBase(base);
  }
  return null;
}


export const WUWA_DEFAULT_CDN_ASSETS_BASE =
  'https://media.githubusercontent.com/media/daofengpianlen/-/main/dist/鸣潮/assets/';

export function resolveWuwaAssetsBase(): string {
  return normalizeAssetsBase(WUWA_DEFAULT_CDN_ASSETS_BASE);
}

export function publishWuwaAssetsBase(): void {
  const base = normalizeAssetsBase(WUWA_DEFAULT_CDN_ASSETS_BASE);
  window.__WUWA_ASSETS_BASE__ = base;
  try {
    if (window.parent && window.parent !== window) {
      window.parent.__WUWA_ASSETS_BASE__ = base;
    }
  } catch {
    /* ignore */
  }
  console.info('[鸣潮资源] 资源根路径', base);
  window.__WUWA_RESOLVE_MEDIA__ = resolveWuwaMediaUrl;
}

function catboxFileName(url: string): string | null {
  const trimmed = url.trim();
  const remote = trimmed.match(/files\.catbox\.moe\/([^/?#]+)/i);
  if (remote) return remote[1];
  if (/^[a-z0-9]+\.(png|jpe?g|gif|webp|avif|mp4|webm|ogg|mov)$/i.test(trimmed)) return trimmed;
  return null;
}

function toLocalUrl(relPath: string): string | null {
  const base = resolveWuwaAssetsBase();
  if (!base) return null;
  return `${base}${relPath.replace(/^\//, '')}`;
}

/** 将 assets 内相对路径（如 cg/女漂泊者/日常状态.mp4）解析为可加载 URL */
export function resolveWuwaAssetPath(relPath: string): string {
  const trimmed = relPath.trim().replace(/^\//, '');
  if (!trimmed) return '';
  const local = toLocalUrl(trimmed);
  if (local) return local;
  return '';
}

/** 将 catbox 完整 URL、短文件名或 ax1x URL 解析为本地 assets 路径（有映射时） */
export function resolveWuwaMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;

  const fromFull = LOCAL_URLS[trimmed];
  if (fromFull) {
    const local = toLocalUrl(fromFull);
    if (local) return local;
  }

  const file = catboxFileName(trimmed);
  if (file && LOCAL_FILES[file]) {
    const local = toLocalUrl(LOCAL_FILES[file]);
    if (local) return local;
  }

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;

  if (trimmed.startsWith('cg/') || trimmed.startsWith('expressions/') || trimmed.startsWith('ui/')) {
    const local = toLocalUrl(trimmed);
    if (local) return local;
  }

  const rel = LOCAL_FILES[trimmed];
  if (rel) {
    const local = toLocalUrl(rel);
    if (local) return local;
  }

  if (trimmed.startsWith('ui/')) {
    const local = toLocalUrl(trimmed);
    if (local) return local;
  }

  return `${WUWA_MEDIA_BASE_URL}${trimmed.replace(/^\/+/, '')}`;
}

export function isWuwaVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

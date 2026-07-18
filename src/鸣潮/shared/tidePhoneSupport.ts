import { mountTideBarInline } from './tideBar/mountTideBarInline';
import type { TideBarTab } from './tideBar/mountTideBar';

export type TideAppId = 'tide-status' | 'tide-story';

const tide_mounts = new Map<TideAppId, () => void>();

function appToTab(app_id: TideAppId): TideBarTab {
  return app_id === 'tide-status' ? 'page-user' : 'page-story';
}

function resolvePhoneDocuments(): Document[] {
  const docs: Document[] = [];
  const push = (doc?: Document | null) => {
    if (doc && !docs.includes(doc)) docs.push(doc);
  };

  try {
    push(window.__wuwaResolvePhoneOverlay?.()?.ownerDocument ?? null);
  } catch {
    /* ignore */
  }
  try {
    push(window.__wuwaLegacyPhoneMountTarget?.()?.ownerDocument ?? null);
  } catch {
    /* ignore */
  }

  push(document);
  try {
    push(window.parent.document);
  } catch {
    /* ignore */
  }

  return docs;
}

/** 优先使用手机原生 #phone-app-body */
function findPhoneAppBody(): HTMLElement | null {
  for (const doc of resolvePhoneDocuments()) {
    const body = doc.getElementById('phone-app-body');
    if (body) return body;
    const nested = doc.getElementById('mobile-phone-overlay')?.querySelector('#phone-app-body');
    if (nested instanceof HTMLElement) return nested;
  }

  for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) continue;
      const body = doc.getElementById('phone-app-body');
      if (body) return body;
    } catch {
      /* cross-origin */
    }
  }

  return null;
}

export function mountTideApp(app_id: TideAppId, attempt = 0, explicit_host?: HTMLElement | null) {
  const host = explicit_host ?? findPhoneAppBody();
  if (!host) {
    if (attempt < 40) {
      window.setTimeout(() => mountTideApp(app_id, attempt + 1, explicit_host), 50);
    } else {
      console.warn('[鸣潮浪潮] 找不到 phone-app-body');
    }
    return;
  }

  tide_mounts.get(app_id)?.();
  tide_mounts.delete(app_id);

  const dispose = mountTideBarInline(host, appToTab(app_id));
  tide_mounts.set(app_id, dispose);
}

export function injectTideAppIcons(overlay: HTMLElement) {
  const $overlay = $(overlay.ownerDocument).find('#mobile-phone-overlay');
  const $grid = $overlay.find('.app-grid').first();
  if (!$grid.length) return false;
  if ($overlay.find('#mobile-tide-status-icon').length && $overlay.find('#mobile-tide-story-icon').length) return true;

  $grid.append(`
    <div class="app-row wuwa-tide-app-row">
      <div class="app-icon" id="mobile-tide-status-icon" data-app="tide-status">
        <div class="app-icon-bg md-teal"><i class="fas fa-user"></i></div>
        <span class="app-label">当前状态</span>
      </div>
      <div class="app-icon" id="mobile-tide-story-icon" data-app="tide-story">
        <div class="app-icon-bg md-purple"><i class="fas fa-book-open"></i></div>
        <span class="app-label">剧情</span>
      </div>
    </div>
  `);

  const style_el = overlay.ownerDocument.getElementById('mobile-phone-styles');
  const extra = `
#mobile-phone-overlay .app-icon-bg.md-purple { background: linear-gradient(135deg, #8b5cf6 0%, #c4b5fd 100%); box-shadow: 0 4px 12px rgba(139,92,246,0.35); }
#mobile-phone-overlay .app-icon-bg.md-purple i { color: #fff; }
#mobile-phone-overlay .app-icon-bg.md-teal { background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%); box-shadow: 0 4px 12px rgba(14,165,233,0.35); }
#mobile-phone-overlay .app-icon-bg.md-teal i { color: #fff; }
`;
  if (style_el && !style_el.textContent?.includes('md-purple')) {
    style_el.textContent += extra;
  }

  return true;
}

const bound_docs = new WeakSet<Document>();

function bindListener(win: Window) {
  if (!win?.document || bound_docs.has(win.document)) return;
  bound_docs.add(win.document);
  win.addEventListener('wuwa-mount-tide-app', event => {
    const detail = (event as CustomEvent<{ app: TideAppId; host?: HTMLElement | null }>).detail;
    if (detail?.app === 'tide-status' || detail?.app === 'tide-story') {
      mountTideApp(detail.app, 0, detail.host ?? null);
    }
  });
}

export function bindTideAppEvents() {
  bindListener(window);
  try {
    bindListener(window.parent);
  } catch {
    /* cross-origin */
  }
}

export function registerTidePhoneSupport() {
  const mount = (app_id: TideAppId, host?: HTMLElement | null) => mountTideApp(app_id, 0, host ?? null);
  const unmount = () => unmountAllTideApps();
  window.__WUWA_MOUNT_TIDE__ = mount;
  window.__WUWA_UNMOUNT_TIDE__ = unmount;
  try {
    window.parent.__WUWA_MOUNT_TIDE__ = mount;
    window.parent.__WUWA_UNMOUNT_TIDE__ = unmount;
  } catch {
    /* ignore */
  }
}

export function unmountAllTideApps() {
  tide_mounts.forEach(dispose => dispose());
  tide_mounts.clear();
}

declare global {
  interface Window {
    __WUWA_MOUNT_TIDE__?: (app_id: TideAppId, host?: HTMLElement | null) => void;
    __WUWA_UNMOUNT_TIDE__?: () => void;
  }
}

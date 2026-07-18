declare global {
  interface Window {
    __WUWA_WB_PHONE_EMBED__?: boolean;
    __WUWA_WB_PHONE_HOST__?: HTMLElement;
    __WUWA_WB_PHONE_OVERLAY_EL__?: HTMLElement | null;
    __WUWA_WB_SKIP_FLOAT__?: boolean;
    __WUWA_WB_CREATE_PANEL__?: (host: HTMLElement) => void;
    __WUWA_MOUNT_WORLDBOOK__?: (host: HTMLElement) => void;
    __WUWA_GENERATE_WORLDBOOK_PANEL__?: () => string;
    closeAppPanel?: () => void;
  }
}

let core_loading: Promise<void> | null = null;

async function ensureWorldbookCoreLoaded(): Promise<void> {
  if (typeof window.__WUWA_WB_CREATE_PANEL__ === 'function') return;
  if (!core_loading) {
    core_loading = import('./worldbookControlCore.js').then(() => undefined);
  }
  await core_loading;
}

function resolvePhoneOverlay(): HTMLElement | null {
  try {
    const fromHook = window.__wuwaResolvePhoneOverlay?.();
    if (fromHook) return fromHook;
  } catch {
    /* ignore */
  }
  return document.getElementById('mobile-phone-overlay');
}

export function generateWorldbookPanelForPhone(): string {
  return `<div id="wuwa-wb-phone-mount" class="wuwa-wb-phone-mount"></div>`;
}

export function mountWorldbookInPhone(host: HTMLElement) {
  const overlay = resolvePhoneOverlay();
  window.__WUWA_WB_PHONE_OVERLAY_EL__ = overlay;
  window.__WUWA_WB_PHONE_EMBED__ = true;

  const mount = (host.querySelector('#wuwa-wb-phone-mount') ?? host) as HTMLElement;
  mount.classList.add('wuwa-wb-phone-mount');
  if (typeof window.__WUWA_WB_CREATE_PANEL__ === 'function') {
    window.__WUWA_WB_CREATE_PANEL__(mount);
    return;
  }
  mount.innerHTML = `<div class="empty-message">世界书控制模块未加载</div>`;
}

function mirrorBridge() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.__WUWA_GENERATE_WORLDBOOK_PANEL__ = generateWorldbookPanelForPhone;
      window.parent.__WUWA_MOUNT_WORLDBOOK__ = mountWorldbookInPhone;
    }
  } catch {
    /* cross-origin */
  }
}

export async function registerWorldbookPhoneBridge() {
  await ensureWorldbookCoreLoaded();
  window.__WUWA_GENERATE_WORLDBOOK_PANEL__ = generateWorldbookPanelForPhone;
  window.__WUWA_MOUNT_WORLDBOOK__ = mountWorldbookInPhone;
  mirrorBridge();
  if (typeof window.__WUWA_WB_ENSURE_FLOAT__ === 'function') {
    window.__WUWA_WB_ENSURE_FLOAT__();
  }
  console.info('[鸣潮世界书] 手机桥接已注册');
}

export function injectWorldbookAppIcon(overlay: HTMLElement): boolean {
  const doc = overlay.ownerDocument;
  const $grid = $(doc).find('#mobile-phone-overlay .app-grid').first();
  if (!$grid.length || $(doc).find('#mobile-worldbook-icon').length) return !!$(doc).find('#mobile-worldbook-icon').length;

  const $row = $(`
    <div class="app-row wuwa-worldbook-app-row">
      <div class="app-icon" id="mobile-worldbook-icon" data-app="worldbook">
        <div class="app-icon-bg transparent">
          <img src="worldbook.jpg" alt="世界书">
        </div>
        <span class="app-label">世界书</span>
      </div>
    </div>
  `);
  $grid.append($row);

  const styleEl = doc.getElementById('mobile-phone-styles');
  const extra = `
#mobile-phone-overlay .app-icon-bg.md-indigo { background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%); box-shadow: 0 4px 12px rgba(79,70,229,0.35); }
#mobile-phone-overlay .app-icon-bg.md-indigo i { color: #fff; }
#mobile-phone-overlay .wb-switcher-panel--phone { font-size: 13px; }
#mobile-phone-overlay .wb-switcher-panel--phone #wb-switcher-list { -webkit-overflow-scrolling: touch; }
#mobile-phone-overlay #wb-float-monitor { z-index: 12000 !important; max-width: calc(100% - 16px); }
#mobile-phone-overlay .wuwa-wb-phone-mount { height: 100%; }
`;
  if (styleEl && !styleEl.textContent?.includes('md-indigo')) {
    styleEl.textContent += extra;
  }
  return true;
}

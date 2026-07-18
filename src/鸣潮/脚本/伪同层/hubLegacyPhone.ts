import { enrichLegacyPhoneStatData } from '../../shared/phoneDataBridge';
import { registerCgUnlockBridge } from '../../shared/cgUnlockBridge';
import { registerPhoneTideBridge } from '../../shared/phoneTide/phoneTideBridge';
import { extractFullStatFromMessagePatch, readCumulativeMessagePatch, readWuwaStatData } from '../../shared/tideMvuReader';
import { mergeHeroinesPreferGalFloor, syncContactAffectionFromHeroine } from '../../shared/heroineMerge';
import { publishWuwaAssetsBase } from '../../shared/wuwaMedia';

const HUB_PHONE_STYLE_ID = 'wuwa-hub-legacy-phone-style';

const HUB_OVERLAY_CSS = `
#mobile-phone-overlay.wuwa-in-hub {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 1 !important;
  display: none;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  backdrop-filter: none !important;
}
#mobile-phone-overlay.wuwa-in-hub.active {
  display: flex !important;
  pointer-events: auto !important;
}
#mobile-phone-overlay.wuwa-in-hub .mobile-phone-frame,
#mobile-phone-overlay.wuwa-in-hub .mobile-phone-screen {
  pointer-events: auto !important;
}
#mobile-phone-overlay.wuwa-in-hub .mobile-phone-frame {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  aspect-ratio: auto !important;
  border-radius: 32px !important;
  padding: 0 !important;
  box-shadow: none !important;
}
#mobile-phone-overlay.wuwa-in-hub .mobile-phone-screen {
  border-radius: 32px !important;
}
`;

let legacy_open: ((...args: unknown[]) => void) | undefined;
let legacy_close: (() => void) | undefined;
let init_promise: Promise<void> | null = null;
let current_host: HTMLElement | null = null;
let bound_host: HTMLElement | null = null;

function ensureHubStyles(doc: Document) {
  if (doc.getElementById(HUB_PHONE_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = HUB_PHONE_STYLE_ID;
  style.textContent = HUB_OVERLAY_CSS;
  doc.head.appendChild(style);
}

function findOverlay(host: HTMLElement | null): HTMLElement | null {
  if (!host) return null;
  const in_host = host.querySelector('#mobile-phone-overlay');
  if (in_host) return in_host as HTMLElement;
  return host.ownerDocument.getElementById('mobile-phone-overlay');
}

function waitForOverlay(host: HTMLElement, timeout_ms = 35000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const overlay = findOverlay(host);
      if (overlay) {
        resolve(overlay);
        return;
      }
      if (Date.now() - start > timeout_ms) {
        reject(new Error('[鸣潮伪同层] legacy 手机初始化超时'));
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

function reparentOverlayToHost(host: HTMLElement) {
  const overlay = findOverlay(host);
  if (!overlay) return;
  if (overlay.parentElement !== host) {
    host.appendChild(overlay);
  }
  overlay.classList.add('wuwa-in-hub');
  ensureHubStyles(host.ownerDocument);
}

function bindMountHooks(host: HTMLElement) {
  current_host = host;
  window.__wuwaLegacyPhoneMountTarget = () => host;
  window.__wuwaResolvePhoneOverlay = () => findOverlay(host);
  ensureHubStyles(host.ownerDocument);
}

function needsReinit(host: HTMLElement): boolean {
  if (!init_promise) return true;
  if (bound_host !== host) return true;
  if (!findOverlay(host)) return true;
  return false;
}

function resetInitState() {
  init_promise = null;
  bound_host = null;
  legacy_open = undefined;
  legacy_close = undefined;
}

async function waitForMvuOptional(timeout_ms = 8000): Promise<void> {
  if (typeof waitGlobalInitialized !== 'function') return;
  try {
    await Promise.race([
      waitGlobalInitialized('Mvu'),
      new Promise<void>(resolve => window.setTimeout(resolve, timeout_ms)),
    ]);
  } catch {
    /* MVU 可选 */
  }
}

async function createLegacyPhoneDom(host: HTMLElement): Promise<void> {
  if (typeof window.initializeMobilePhone !== 'function') {
    throw new Error('[鸣潮伪同层] legacyPhone 未正确加载');
  }

  await waitForMvuOptional();
  window.initializeMobilePhone();
  await waitForOverlay(host);
  reparentOverlayToHost(host);
}

async function initLegacyPhone(host: HTMLElement) {
  publishWuwaAssetsBase();
  window.__WUWA_ENRICH_LEGACY_PHONE__ = enrichLegacyPhoneStatData;
  window.__WUWA_READ_STAT_DATA__ = readWuwaStatData;
  window.__WUWA_EXTRACT_PATCH_STAT__ = extractFullStatFromMessagePatch;
  window.__WUWA_READ_CUMULATIVE_PATCH__ = readCumulativeMessagePatch;
  window.__WUWA_MERGE_HEROINES_FLOOR__ = mergeHeroinesPreferGalFloor;
  window.__WUWA_SYNC_CONTACT_AFF__ = syncContactAffectionFromHeroine;
  try {
    if (window.parent && window.parent !== window) {
      window.parent.__WUWA_ENRICH_LEGACY_PHONE__ = enrichLegacyPhoneStatData;
      window.parent.__WUWA_READ_STAT_DATA__ = readWuwaStatData;
      window.parent.__WUWA_EXTRACT_PATCH_STAT__ = extractFullStatFromMessagePatch;
      window.parent.__WUWA_READ_CUMULATIVE_PATCH__ = readCumulativeMessagePatch;
      window.parent.__WUWA_MERGE_HEROINES_FLOOR__ = mergeHeroinesPreferGalFloor;
      window.parent.__WUWA_SYNC_CONTACT_AFF__ = syncContactAffectionFromHeroine;
    }
  } catch {
    /* cross-origin */
  }
  bindMountHooks(host);

  await import('../手机/legacyPhone.js');

  registerCgUnlockBridge();
  if (typeof window.refreshWuwaPhoneMediaCatalog === 'function') {
    window.refreshWuwaPhoneMediaCatalog();
  } else if (typeof window.restoreWallpaper === 'function') {
    window.restoreWallpaper();
  }

  if (!findOverlay(host)) {
    await createLegacyPhoneDom(host);
  } else {
    reparentOverlayToHost(host);
  }

  legacy_open = window.openMobilePhone?.bind(window);
  legacy_close = window.closeMobilePhone?.bind(window);

  if (typeof window.bindPhoneEvents === 'function') {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (window.bindPhoneEvents()) break;
      await new Promise(resolve => window.setTimeout(resolve, 80));
    }
  }

  const overlay = findOverlay(host);
  if (overlay) {
    /* 状态/剧情图标已写入 legacyPhone 主界面网格 */
  }
  registerPhoneTideBridge(() => {
    window.__WUWA_REFRESH_TIDE_PHONE_PANEL__?.();
  });
  void import('../../shared/worldbookControl/worldbookPhoneBridge').then(({ registerWorldbookPhoneBridge }) =>
    registerWorldbookPhoneBridge(),
  );
  bound_host = host;
}

export async function ensureHubLegacyPhone(host: HTMLElement) {
  bindMountHooks(host);

  if (needsReinit(host)) {
    resetInitState();
    init_promise = initLegacyPhone(host).catch(error => {
      resetInitState();
      throw error;
    });
  }

  await init_promise;
  reparentOverlayToHost(host);
}

export async function openHubLegacyPhone(host: HTMLElement) {
  try {
    await ensureHubLegacyPhone(host);
  } catch (error) {
    console.warn('[鸣潮伪同层] 首次初始化失败，尝试重建手机 DOM', error);
    resetInitState();
    await initLegacyPhone(host);
  }

  let overlay = findOverlay(host);
  if (!overlay) {
    await createLegacyPhoneDom(host);
    overlay = findOverlay(host);
  }

  if (!overlay) {
    throw new Error('[鸣潮伪同层] 找不到手机界面');
  }

  reparentOverlayToHost(host);
  overlay.classList.add('wuwa-in-hub', 'active');

  if (typeof window.bindPhoneEvents === 'function') {
    window.bindPhoneEvents();
  }
  if (typeof window.bindHubNativePhoneDelegation === 'function') {
    window.bindHubNativePhoneDelegation();
  }
  if (legacy_open) {
    try {
      legacy_open();
    } catch (error) {
      console.warn('[鸣潮伪同层] openMobilePhone 调用失败，已直接显示界面', error);
    }
  }
}

export function closeHubLegacyPhone() {
  const host = current_host ?? bound_host;
  const overlay = findOverlay(host);

  if (overlay) {
    overlay.classList.remove('active');
  } else if (legacy_close) {
    legacy_close();
  }
}

export function destroyHubLegacyPhone() {
  closeHubLegacyPhone();

  if (typeof window.cleanupMobilePhone === 'function') {
    try {
      window.cleanupMobilePhone();
    } catch (error) {
      console.warn('[鸣潮伪同层] cleanupMobilePhone 失败', error);
    }
  }

  resetInitState();
  current_host = null;
}

declare global {
  interface Window {
    __wuwaLegacyPhoneMountTarget?: () => HTMLElement | null;
    __wuwaResolvePhoneOverlay?: () => HTMLElement | null;
    __WUWA_REFRESH_TIDE_PHONE_PANEL__?: () => void;
    bindPhoneEvents?: () => boolean;
    bindHubNativePhoneDelegation?: () => void;
    initializeMobilePhone?: () => void;
    cleanupMobilePhone?: () => void;
    openMobilePhone?: (...args: unknown[]) => void;
    closeMobilePhone?: () => void;
  }
}

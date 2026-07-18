let overlay_home: HTMLElement | null = null;
let cached_overlay: HTMLElement | null = null;
let mounted_portal: HTMLElement | null = null;

const HUB_OVERLAY_CSS = `
#mobile-phone-overlay.wuwa-in-hub {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 10000 !important;
  display: none;
  align-items: center !important;
  justify-content: center !important;
}
#mobile-phone-overlay.wuwa-in-hub.active {
  display: flex !important;
}
#mobile-phone-overlay.wuwa-in-hub .mobile-phone-frame {
  width: min(92vw, 375px) !important;
  max-width: 375px !important;
  max-height: min(92vh, 737px) !important;
  height: auto !important;
  aspect-ratio: 375 / 737 !important;
}
#mobile-phone-overlay.wuwa-in-hub .app-grid {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 12px 10px !important;
  align-items: start !important;
}
#mobile-phone-overlay.wuwa-in-hub .app-row {
  display: contents !important;
}
#mobile-phone-overlay.wuwa-in-hub .app-icon {
  width: 100% !important;
  margin: 0 !important;
}
`;

function ensureHubMountStyles() {
  if ($('#wuwa-phone-hub-mount-style').length) return;
  $('head').append(`
<style id="wuwa-phone-hub-mount-style">
#mobile-trigger-btn { display: none !important; }
${HUB_OVERLAY_CSS}
</style>`);
}

function ensurePhoneStylesInDocument(doc: Document) {
  if (doc.getElementById('wuwa-phone-styles-cloned')) {
    const hub_style = doc.getElementById('wuwa-phone-hub-mount-style-cloned');
    if (!hub_style) {
      const hub_rules = doc.createElement('style');
      hub_rules.id = 'wuwa-phone-hub-mount-style-cloned';
      hub_rules.textContent = HUB_OVERLAY_CSS;
      doc.head.appendChild(hub_rules);
    }
    return;
  }

  const styles = $('#mobile-phone-styles').html();
  if (styles) {
    const style_el = doc.createElement('style');
    style_el.id = 'wuwa-phone-styles-cloned';
    style_el.textContent = styles;
    doc.head.appendChild(style_el);
  }

  const hub_rules = doc.createElement('style');
  hub_rules.id = 'wuwa-phone-hub-mount-style-cloned';
  hub_rules.textContent = HUB_OVERLAY_CSS;
  doc.head.appendChild(hub_rules);

  if (!doc.querySelector('link[href*="font-awesome"]')) {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    link.crossOrigin = 'anonymous';
    doc.head.appendChild(link);
  }
}

export function resolveHubPhonePortal(): HTMLElement | null {
  try {
    const from_parent = window.parent?.__wuwaGetHubPhonePortal?.();
    if (from_parent) return from_parent;
  } catch {
    /* ignore */
  }

  try {
    const parent_doc = window.parent?.document;
    if (!parent_doc) return null;

    for (const iframe of Array.from(parent_doc.querySelectorAll('iframe'))) {
      try {
        const portal = iframe.contentWindow?.__wuwaGetHubPhonePortal?.();
        if (portal) return portal;
      } catch {
        /* cross-origin */
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function resolvePhoneOverlay(): HTMLElement | null {
  if (cached_overlay?.isConnected) return cached_overlay;

  const local = document.getElementById('mobile-phone-overlay');
  if (local) {
    cached_overlay = local;
    return local;
  }

  try {
    const hub = window.__wuwaLegacyPhoneMountTarget?.();
    if (hub) {
      const in_hub = hub.ownerDocument.getElementById('mobile-phone-overlay');
      if (in_hub) {
        cached_overlay = in_hub;
        return in_hub;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const parent_doc = window.parent?.document;
    if (parent_doc) {
      const from_parent = parent_doc.getElementById('mobile-phone-overlay');
      if (from_parent) {
        cached_overlay = from_parent;
        return from_parent;
      }

      for (const iframe of Array.from(parent_doc.querySelectorAll('iframe'))) {
        try {
          const doc = iframe.contentDocument;
          if (!doc) continue;
          const el = doc.getElementById('mobile-phone-overlay');
          if (el) {
            cached_overlay = el;
            return el;
          }
        } catch {
          /* cross-origin */
        }
      }
    }
  } catch {
    /* ignore */
  }

  cached_overlay = null;
  return null;
}

function setPortalActive(portal: HTMLElement | null, active: boolean) {
  if (!portal) return;
  portal.classList.toggle('game-hub__phone-portal--active', active);
  if (active) portal.removeAttribute('aria-hidden');
  else portal.setAttribute('aria-hidden', 'true');
}

/** 将手机遮罩挂到伪同层 Hub 内（全屏/页面内全屏时必须） */
export function mountPhoneOverlayToHub(portal: HTMLElement): boolean {
  const overlay = resolvePhoneOverlay();
  if (!overlay) return false;

  ensureHubMountStyles();

  if (!overlay_home) {
    overlay_home = overlay.parentElement;
  }

  const doc = portal.ownerDocument;
  ensurePhoneStylesInDocument(doc);

  portal.appendChild(overlay);
  overlay.classList.add('wuwa-in-hub');
  overlay.classList.remove('wuwa-over-hub');
  cached_overlay = overlay;
  mounted_portal = portal;
  setPortalActive(portal, true);
  return true;
}

/** 将手机遮罩挂回酒馆主文档 */
export function restorePhoneOverlayToBody() {
  const overlay = resolvePhoneOverlay();
  if (!overlay || !overlay_home) return;

  overlay_home.appendChild(overlay);
  overlay.classList.remove('wuwa-in-hub', 'wuwa-over-hub');
  cached_overlay = overlay;
  setPortalActive(mounted_portal, false);
  mounted_portal = null;
}

export function syncPhonePortalActiveState() {
  if (!mounted_portal) return;
  const overlay = resolvePhoneOverlay();
  setPortalActive(mounted_portal, Boolean(overlay?.classList.contains('active')));
}

export function hideFloatingPhoneTrigger() {
  ensureHubMountStyles();
  $('#mobile-trigger-btn').hide();
}

declare global {
  interface Window {
    __wuwaGetHubPhonePortal?: () => HTMLElement | null;
    __wuwaResolvePhoneOverlay?: () => HTMLElement | null;
    __wuwaLegacyPhoneMountTarget?: () => HTMLElement | null;
    mountPhoneOverlayToHub?: (portal: HTMLElement) => boolean;
    restorePhoneOverlayToBody?: () => void;
  }
}

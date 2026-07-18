import { chat$, getTavernHostDocument } from '../../shared/chatHost';
import { resolveHubFrameProfile } from './hubFrameLayout';
import type { HubLayoutMode } from './hubSettingsStore';

const STYLE_KEYS = [
  'position',
  'inset',
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'height',
  'maxWidth',
  'maxHeight',
  'minHeight',
  'margin',
  'marginInline',
  'zIndex',
  'aspectRatio',
  'display',
  'border',
  'background',
] as const;

type StyleKey = (typeof STYLE_KEYS)[number];

const saved_iframe_styles = new Map<StyleKey, string>();
const saved_wrapper_styles = new Map<HTMLElement, Partial<Record<StyleKey, string>>>();

function getHubIframe(): HTMLIFrameElement | null {
  const el = window.frameElement;
  if (el instanceof HTMLIFrameElement) return el;

  const host_doc = getTavernHostDocument();
  for (const node of host_doc.querySelectorAll('iframe[id^="wuwa-pseudo-layer-"]')) {
    if (!(node instanceof HTMLIFrameElement)) continue;
    try {
      if (node.contentWindow === window) return node;
    } catch {
      /* cross-origin */
    }
  }

  const first = host_doc.querySelector('iframe[id^="wuwa-pseudo-layer-"]');
  return first instanceof HTMLIFrameElement ? first : null;
}

function rememberStyle(el: HTMLElement, store: Map<StyleKey, string> | Map<HTMLElement, Partial<Record<StyleKey, string>>>, key: StyleKey) {
  if (store instanceof Map && store !== saved_iframe_styles && !store.has(el)) {
    store.set(el, {});
  }
  const bucket =
    store === saved_iframe_styles
      ? saved_iframe_styles
      : (store as Map<HTMLElement, Partial<Record<StyleKey, string>>>).get(el)!;
  if (bucket[key] === undefined) {
    bucket[key] = el.style[key as keyof CSSStyleDeclaration] as string;
  }
}

function applyStyle(el: HTMLElement, key: StyleKey, value: string) {
  (el.style as unknown as Record<string, string>)[key] = value;
}

function restoreStyleMap(el: HTMLElement, store: Map<StyleKey, string>) {
  for (const [key, value] of store.entries()) {
    applyStyle(el, key, value);
  }
  store.clear();
}

function restoreWrapperStyles() {
  for (const [el, styles] of saved_wrapper_styles.entries()) {
    for (const [key, value] of Object.entries(styles)) {
      applyStyle(el, key as StyleKey, value ?? '');
    }
  }
  saved_wrapper_styles.clear();
}

function syncIframeDocumentFill(fill: boolean) {
  const root = document.documentElement;
  const body = document.body;
  if (fill) {
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.minHeight = '100%';
    root.style.margin = '0';
    root.style.padding = '0';
    root.style.overflow = 'hidden';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.minHeight = '100%';
    body.style.margin = '0';
    body.style.padding = '0';
    body.style.overflow = 'hidden';
    return;
  }
  root.style.width = '';
  root.style.height = '';
  root.style.minHeight = '';
  root.style.margin = '';
  root.style.padding = '';
  root.style.overflow = '';
  body.style.width = '';
  body.style.height = '';
  body.style.minHeight = '';
  body.style.margin = '';
  body.style.padding = '';
  body.style.overflow = '';
}

function expandHostAncestors(iframe: HTMLIFrameElement, fill: boolean) {
  const chain: HTMLElement[] = [];
  let node: HTMLElement | null = iframe;
  while (node) {
    chain.push(node);
    node = node.parentElement;
  }

  for (const el of chain) {
    if (fill) {
      if (!saved_wrapper_styles.has(el)) saved_wrapper_styles.set(el, {});
      for (const key of STYLE_KEYS) rememberStyle(el, saved_wrapper_styles, key);

      if (el === iframe) continue;

      applyStyle(el, 'width', '100%');
      applyStyle(el, 'maxWidth', 'none');
      if (el.classList.contains('mes') || el.classList.contains('mes_block') || el.classList.contains('mes_streaming')) {
        applyStyle(el, 'minHeight', '100dvh');
        applyStyle(el, 'height', 'auto');
        applyStyle(el, 'overflow', 'visible');
      }
    }
  }

  if (!fill) {
    restoreWrapperStyles();
  }
}

function applyIframeFrameStyles(
  iframe: HTMLIFrameElement,
  styles: Partial<Record<StyleKey, string>>,
  fill: boolean,
) {
  for (const key of STYLE_KEYS) rememberStyle(iframe, saved_iframe_styles, key);

  applyStyle(iframe, 'display', 'block');
  applyStyle(iframe, 'marginInline', 'auto');
  applyStyle(iframe, 'border', '0');
  applyStyle(iframe, 'background', 'transparent');

  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined) applyStyle(iframe, key as StyleKey, value);
  }

  expandHostAncestors(iframe, fill);
  syncIframeDocumentFill(fill);

  const wrapper = iframe.closest('.mes_streaming');
  if (wrapper instanceof HTMLElement) {
    if (fill) {
      if (!saved_wrapper_styles.has(wrapper)) saved_wrapper_styles.set(wrapper, {});
      for (const key of STYLE_KEYS) rememberStyle(wrapper, saved_wrapper_styles, key);
    }
    applyStyle(wrapper, 'width', '100%');
    applyStyle(wrapper, 'maxWidth', 'none');
    applyStyle(wrapper, 'minHeight', fill ? '100dvh' : styles.minHeight ?? '');
    applyStyle(wrapper, 'height', fill ? '100dvh' : '');
  }
}

/** 将当前布局对应的外框尺寸同步到酒馆第 0 楼 iframe 与外层容器 */
export function syncHubFrameSize(layout: HubLayoutMode) {
  const profile = resolveHubFrameProfile(layout);
  const min_height = `min(calc(92vw * ${profile.maxHeight} / ${profile.maxWidth}), ${profile.maxHeight}px)`;

  const iframe = getHubIframe();
  if (!iframe) return;

  restoreWrapperStyles();
  restoreStyleMap(iframe, saved_iframe_styles);
  syncIframeDocumentFill(false);

  applyIframeFrameStyles(
    iframe,
    {
      position: '',
      inset: '',
      top: '',
      left: '',
      right: '',
      bottom: '',
      width: '100%',
      height: '',
      maxWidth: `${profile.maxWidth}px`,
      maxHeight: `${profile.maxHeight}px`,
      aspectRatio: profile.aspectRatio,
      minHeight: min_height,
      margin: '',
      zIndex: '',
    },
    false,
  );
}

/** 全屏时让 iframe 固定覆盖整个可视区域，内部 UI 再按屏幕尺寸缩放 */
export function syncHubFrameFullscreen(fill: boolean, layout: HubLayoutMode = 'desktop') {
  const iframe = getHubIframe();
  if (!iframe) return;

  if (!fill) {
    syncHubFrameSize(layout);
    return;
  }

  applyIframeFrameStyles(
    iframe,
    {
      position: 'fixed',
      inset: '0',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      width: '100vw',
      height: '100dvh',
      maxWidth: '100vw',
      maxHeight: '100dvh',
      minHeight: '100dvh',
      margin: '0',
      zIndex: '999990',
      aspectRatio: 'unset',
    },
    true,
  );

  try {
    chat$('#chat').css({ overflow: 'visible' });
  } catch {
    /* ignore */
  }
}

/** 全屏模式下窗口尺寸变化时重新同步 */
export function resyncHubFrameFullscreenIfNeeded(active: boolean, layout: HubLayoutMode = 'desktop') {
  if (!active) return;
  syncHubFrameFullscreen(true, layout);
}

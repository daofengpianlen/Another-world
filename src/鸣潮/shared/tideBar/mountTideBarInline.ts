import tideBarDocument from './tideBarDocument.html?raw';
import type { TideBarTab } from './mountTideBar';

const STYLE_ID = 'wuwa-tide-inline-styles';

const INLINE_EXTRA_CSS = `
.wuwa-tide-inline-host {
  --glass-bg: #ffffff;
  --text-main: #1f2937;
  --text-sub: #6b7280;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: var(--text-main);
}
.wuwa-tide-inline-host .tide-card {
  flex: 1;
  min-height: 0;
  margin: 0;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  background: var(--glass-bg);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}
.wuwa-tide-inline-host .tide-header {
  cursor: default;
  flex-shrink: 0;
  border-radius: 12px 12px 0 0;
  background: linear-gradient(90deg, var(--accent-dim), transparent);
  border-bottom: 1px solid #e5e7eb;
}
.wuwa-tide-inline-host .time-badge {
  background: rgba(255, 255, 255, 0.85);
  color: var(--accent-color);
}
.wuwa-tide-inline-host .tide-viewport {
  flex: 1;
  min-height: 0;
  height: auto !important;
  opacity: 1 !important;
  padding: 10px !important;
  overflow-y: auto !important;
}
.wuwa-tide-inline-host .tide-nav,
.wuwa-tide-inline-host #page-opt {
  display: none !important;
}
.wuwa-tide-inline-host .data-block {
  background: #f9fafb;
  border-color: #e5e7eb;
}
.wuwa-tide-inline-host .item-tag {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}
.wuwa-tide-inline-host .editable-text {
  border-bottom-color: rgba(0, 0, 0, 0.15);
}
.wuwa-tide-inline-host[data-tide-tab="page-user"] #page-story {
  display: none !important;
}
.wuwa-tide-inline-host[data-tide-tab="page-story"] #page-user {
  display: none !important;
}
#phone-app-body.wuwa-tide-panel {
  padding: 12px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  background: #f8f9fa !important;
}
`;

function buildParentBridgeScript(): string {
  return `(function () {
  function pickHost() {
    try { if (window.top && window.top.Mvu) return window.top; } catch (e) {}
    try { if (window.top && window.top.getAllVariables) return window.top; } catch (e) {}
    try { if (window.parent && window.parent.Mvu) return window.parent; } catch (e) {}
    try { if (window.parent && window.parent.getAllVariables) return window.parent; } catch (e) {}
    return window;
  }
  const h = pickHost();
  try {
    window.$ = window.jQuery = h.$ || window.$;
    window.Mvu = h.Mvu || window.Mvu;
    window.eventOn = h.eventOn || window.eventOn;
    window.getAllVariables = h.getAllVariables || window.getAllVariables;
    window.getVariables = h.getVariables || window.getVariables;
    window.toastr = h.toastr || window.toastr;
    window.SillyTavern = h.SillyTavern || window.SillyTavern;
    window.calculateStoryLogic = h.calculateStoryLogic || window.calculateStoryLogic;
    if (h.waitGlobalInitialized) window.waitGlobalInitialized = h.waitGlobalInitialized.bind(h);
    else if (h.TavernHelper && h.TavernHelper.waitGlobalInitialized) {
      window.waitGlobalInitialized = h.TavernHelper.waitGlobalInitialized.bind(h.TavernHelper);
    }
  } catch (e) {
    console.error('[鸣潮浪潮] 桥接父窗口 API 失败', e);
  }
})();`;
}

function extractStyleBlock(): string {
  const match = tideBarDocument.match(/<style>([\s\S]*?)<\/style>/i);
  return match?.[1] ?? '';
}

function extractBodyHtml(): string {
  const match = tideBarDocument.match(/<body>([\s\S]*?)<\/body>/i);
  return match?.[1]?.trim() ?? '';
}

function extractModuleScript(): string {
  const match = tideBarDocument.match(/<script type="module">([\s\S]*?)<\/script>/i);
  return match?.[1]?.trim() ?? '';
}

function buildInlineScript(tab: TideBarTab): string {
  const body = extractModuleScript()
    .replace('$(() => setTimeout(init, 100));', 'init();')
    .replace(
      "document.documentElement.classList.add('wuwa-phone-embed');\n            document.documentElement.setAttribute('data-tide-tab', phoneTab);\n            ",
      '',
    )
    .replace("$('body').addClass('wuwa-phone-embed');\n            ", '')
    .replace(
      "window.addEventListener('message', (ev) => {\n                if (ev.data && ev.data.type === 'wuwa-tide-refresh') render();\n            });",
      "window.addEventListener('message', (ev) => { if (ev.data && ev.data.type === 'wuwa-tide-refresh') render(); });\n            window.addEventListener('wuwa-tide-refresh', () => render());",
    );
  return `${buildParentBridgeScript()}\nwindow.__TIDE_PHONE_TAB__='${tab}';\n${body}`;
}

function ensureInlineStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style_el = doc.createElement('style');
  style_el.id = STYLE_ID;
  style_el.textContent = extractStyleBlock() + INLINE_EXTRA_CSS;
  const phone_styles = doc.getElementById('mobile-phone-styles');
  if (phone_styles?.parentElement) {
    phone_styles.parentElement.insertBefore(style_el, phone_styles.nextSibling);
  } else {
    doc.head.appendChild(style_el);
  }
}

/** 直接挂载到手机 #phone-app-body，无 iframe */
export function mountTideBarInline(host: HTMLElement, tab: TideBarTab): () => void {
  const doc = host.ownerDocument;
  ensureInlineStyles(doc);

  host.classList.add('wuwa-tide-inline-host', 'wuwa-tide-panel');
  host.setAttribute('data-tide-tab', tab);
  host.replaceChildren();

  const root = doc.createElement('div');
  root.className = 'wuwa-tide-inline-root';
  root.innerHTML = extractBodyHtml();
  root.querySelector('.tide-nav')?.remove();
  root.querySelector('#page-opt')?.remove();
  host.appendChild(root);

  const script = doc.createElement('script');
  script.type = 'module';
  script.textContent = buildInlineScript(tab);
  host.appendChild(script);

  const refresh = () => {
    try {
      doc.defaultView?.dispatchEvent(new CustomEvent('wuwa-tide-refresh'));
    } catch {
      /* ignore */
    }
  };

  let mvu_cleanup: EventOnReturn | undefined;
  try {
    mvu_cleanup = eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, refresh);
  } catch {
    /* ignore */
  }
  const msg_cleanup = eventOn(tavern_events.MESSAGE_RECEIVED, refresh);
  const chat_cleanup = eventOn(tavern_events.CHAT_CHANGED, refresh);

  return () => {
    mvu_cleanup?.stop();
    msg_cleanup.stop();
    chat_cleanup.stop();
    host.classList.remove('wuwa-tide-inline-host', 'wuwa-tide-panel');
    host.removeAttribute('data-tide-tab');
    host.replaceChildren();
    script.remove();
  };
}

import tideBarDocument from './tideBarDocument.html?raw';

/** 浪潮状态栏 Tab：与小爱「当前状态」「剧情」一一对应 */
export type TideBarTab = 'page-user' | 'page-story';

function buildParentBridgeScript(): string {
  return `<script>
    (function () {
      function pickHost() {
        try { if (window.top && window.top.Mvu) return window.top; } catch (e) {}
        try { if (window.top && window.top.getAllVariables) return window.top; } catch (e) {}
        try { if (window.parent && window.parent.Mvu) return window.parent; } catch (e) {}
        try { if (window.parent && window.parent.getAllVariables) return window.parent; } catch (e) {}
        return window.parent || window;
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
    })();
  </script>`;
}

function buildTideBarSrcdoc(tab: TideBarTab): string {
  const tabScript = `<script>
    document.documentElement.classList.add('wuwa-phone-embed');
    document.documentElement.setAttribute('data-tide-tab', '${tab}');
    window.__TIDE_PHONE_TAB__='${tab}';
  </script>`;
  return tideBarDocument
    .replace('<script type="module">', `${buildParentBridgeScript()}${tabScript}<script type="module">`)
    .replace('<div id="raw-store" style="display:none">$1</div>', '<div id="raw-store" style="display:none"></div>');
}

/**
 * 挂载 regex「浪潮状态栏」完整 UI 的单一 Tab（page-user=状态 / page-story=剧情）。
 * 除小爱手机内嵌外，行为与 regex 版本一致。
 */
export function mountTideBar(host: HTMLElement, tab: TideBarTab): () => void {
  const iframe = host.ownerDocument.createElement('iframe');
  iframe.className = 'wuwa-tide-bar-frame';
  iframe.title = tab === 'page-user' ? '状态' : '剧情';
  iframe.srcdoc = buildTideBarSrcdoc(tab);
  iframe.style.cssText = 'width:100%;height:100%;min-height:100%;border:none;display:block;background:transparent';

  host.replaceChildren(iframe);

  const refresh = () => {
    try {
      iframe.contentWindow?.postMessage({ type: 'wuwa-tide-refresh' }, '*');
    } catch {
      /* ignore */
    }
  };

  iframe.addEventListener('load', refresh);

  let mvu_cleanup: EventOnReturn | undefined;
  try {
    mvu_cleanup = eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, refresh);
  } catch {
    /* MVU 不可用 */
  }
  const msg_cleanup = eventOn(tavern_events.MESSAGE_RECEIVED, refresh);
  const chat_cleanup = eventOn(tavern_events.CHAT_CHANGED, refresh);

  return () => {
    mvu_cleanup?.stop();
    msg_cleanup.stop();
    chat_cleanup.stop();
    host.replaceChildren();
  };
}

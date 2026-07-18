/** 酒馆主页面（#chat 所在 window），脚本 iframe 内须用此访问 DOM */
export function getTavernHostWindow(): Window {
  try {
    if (window.top && window.top !== window) return window.top;
  } catch {
    /* cross-origin */
  }
  try {
    if (window.parent && window.parent !== window) return window.parent;
  } catch {
    /* cross-origin */
  }
  return window;
}

export function getTavernHostDocument(): Document {
  return getTavernHostWindow().document;
}

/** 主页面 jQuery（#chat、.mes 在 parent/top，不在脚本 iframe 内） */
export function chat$(): JQueryStatic {
  const host = getTavernHostWindow() as Window & { $?: JQueryStatic };
  return host.$ ?? $;
}

export function getSillyTavernChat(): Array<{ is_user?: boolean; is_system?: boolean; mes?: string }> | null {
  const host = getTavernHostWindow() as Window & {
    SillyTavern?: { chat?: Array<{ is_user?: boolean; is_system?: boolean; mes?: string }> };
  };
  if (Array.isArray(host.SillyTavern?.chat)) return host.SillyTavern.chat;
  if (Array.isArray(SillyTavern?.chat)) return SillyTavern.chat;
  return null;
}

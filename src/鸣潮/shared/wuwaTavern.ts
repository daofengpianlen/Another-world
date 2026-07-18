/** 解析可调用酒馆助手的 window（伪同层 streaming iframe 内优先 parent/top） */
export function getTavernHost(): Window & { TavernHelper: typeof TavernHelper; Mvu?: typeof Mvu } {
  const candidates: Window[] = [];
  const seen = new Set<Window>();
  const push = (win: Window | null | undefined) => {
    if (!win || seen.has(win)) return;
    seen.add(win);
    candidates.push(win);
  };

  try {
    push(window.top);
  } catch {
    /* cross-origin */
  }
  try {
    push(window.parent);
  } catch {
    /* cross-origin */
  }
  push(window);

  for (const win of candidates) {
    const th = (win as Window & { TavernHelper?: typeof TavernHelper }).TavernHelper;
    if (th?.generate && th?.createChatMessages && th?.getChatMessages) {
      return win as Window & { TavernHelper: typeof TavernHelper; Mvu?: typeof Mvu };
    }
  }

  throw new Error('酒馆助手接口不可用，请确认已启用「酒馆助手」扩展');
}

export function getTavernHelper(): typeof TavernHelper {
  return getTavernHost().TavernHelper;
}

export function getMvuApi(): typeof Mvu {
  const host = getTavernHost();
  if (host.Mvu) return host.Mvu;
  if (typeof Mvu !== 'undefined') return Mvu;
  throw new Error('MVU 未加载，请确认已启用 MVU 变量框架');
}

export async function ensureMvuReady(timeout_ms = 12000): Promise<typeof Mvu> {
  try {
    return getMvuApi();
  } catch {
    /* continue */
  }

  const host = getTavernHost();
  const wait = host.TavernHelper.waitGlobalInitialized;
  if (typeof wait !== 'function') {
    throw new Error('MVU 未加载，请确认已启用 MVU 变量框架');
  }

  await Promise.race([
    wait.call(host.TavernHelper, 'Mvu'),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('MVU 初始化超时，请刷新酒馆后重试')), timeout_ms);
    }),
  ]);

  return getMvuApi();
}

export function formatWuwaError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  try {
    return JSON.stringify(error);
  } catch {
    return '未知错误';
  }
}

export function notifyWuwaError(message: string) {
  console.error('[鸣潮]', message);
  for (const win of [window.top, window.parent, window]) {
    try {
      const toastr = (win as Window & { toastr?: { error: (msg: string) => void } } | null)?.toastr;
      if (toastr?.error) {
        toastr.error(message);
        return;
      }
    } catch {
      /* cross-origin */
    }
  }
}

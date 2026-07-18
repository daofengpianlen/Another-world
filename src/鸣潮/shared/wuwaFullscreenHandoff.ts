/** 开场 iframe 卸载 → 伪同层 iframe 挂载时，保持全屏/页面内全屏 */
export type WuwaFullscreenHandoffMode = 'expanded' | 'browser';

declare global {
  interface Window {
    __WUWA_FULLSCREEN_HANDOFF__?: WuwaFullscreenHandoffMode;
  }
}

function handoffWindows(): Window[] {
  const wins: Window[] = [window];
  try {
    if (window.parent !== window) wins.push(window.parent);
  } catch {
    /* ignore */
  }
  try {
    if (window.top && window.top !== window) wins.push(window.top);
  } catch {
    /* ignore */
  }
  return wins;
}

export function markWuwaFullscreenHandoff(mode: WuwaFullscreenHandoffMode): void {
  for (const win of handoffWindows()) {
    win.__WUWA_FULLSCREEN_HANDOFF__ = mode;
  }
}

export function clearWuwaFullscreenHandoff(): void {
  for (const win of handoffWindows()) {
    delete win.__WUWA_FULLSCREEN_HANDOFF__;
  }
}

export function getWuwaFullscreenHandoff(): WuwaFullscreenHandoffMode | null {
  for (const win of handoffWindows()) {
    const mode = win.__WUWA_FULLSCREEN_HANDOFF__;
    if (mode) return mode;
  }
  return null;
}

export function consumeWuwaFullscreenHandoff(): WuwaFullscreenHandoffMode | null {
  const mode = getWuwaFullscreenHandoff();
  if (!mode) return null;
  clearWuwaFullscreenHandoff();
  return mode;
}

/** 与开场一致：优先对整个 script iframe 请求浏览器全屏 */
export function resolveWuwaFullscreenTarget(shell: HTMLElement | null): HTMLElement | null {
  if (window.frameElement instanceof HTMLElement) return window.frameElement;
  return shell;
}

export function isWuwaBrowserFullscreen(): boolean {
  try {
    if (document.fullscreenElement) return true;
    if (window.parent !== window && window.parent.document.fullscreenElement === window.frameElement) return true;
  } catch {
    /* cross-origin */
  }
  return false;
}

/** @returns 是否已进入浏览器原生全屏 */
export async function requestWuwaBrowserFullscreen(shell: HTMLElement | null): Promise<boolean> {
  const target = resolveWuwaFullscreenTarget(shell);
  if (!target) return false;
  try {
    await target.requestFullscreen();
    return isWuwaBrowserFullscreen();
  } catch {
    return false;
  }
}

export async function exitWuwaBrowserFullscreen(): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (document.fullscreenElement) {
    tasks.push(document.exitFullscreen().then(() => undefined).catch(() => undefined));
  }
  try {
    if (window.parent !== window && window.parent.document.fullscreenElement) {
      tasks.push(window.parent.document.exitFullscreen().then(() => undefined).catch(() => undefined));
    }
  } catch {
    /* ignore */
  }
  if (tasks.length) await Promise.all(tasks);
}

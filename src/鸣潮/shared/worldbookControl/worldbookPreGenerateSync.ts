/** 伪同层 / 手机发消息前，按 GAL 与玩家输入同步世界书 [Pro]/[Lite] 开关 */

let core_loading: Promise<void> | null = null;

async function ensureWorldbookCoreLoaded(): Promise<void> {
  if (typeof window.__WUWA_WB_SYNC_BEFORE_GENERATE__ === 'function') return;
  if (!core_loading) {
    core_loading = import('./worldbookControlCore.js').then(() => undefined);
  }
  await core_loading;
}

export async function syncWorldbookBeforeGenerate(plainInput?: string): Promise<void> {
  await ensureWorldbookCoreLoaded();
  const fn = window.__WUWA_WB_SYNC_BEFORE_GENERATE__;
  if (typeof fn !== 'function') return;
  await fn(plainInput ?? '');
}

declare global {
  interface Window {
    __WUWA_WB_SYNC_BEFORE_GENERATE__?: (plainInput: string) => Promise<void>;
    __WUWA_WB_PENDING_INPUT__?: string;
  }
}

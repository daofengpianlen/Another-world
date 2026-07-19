import { isLegacyPicRef, lookupCgScene } from '../../shared/cgLookup';
import { ensureWuWaSharedRegistered } from '../../shared/register';
import { registerHeroineGuard } from '../../shared/heroineGuard';
import { exposeWuwaConsoleTools } from '../../shared/wuwaConsoleTools';
import { publishWuwaAssetsBase, resolveWuwaAssetPath, resolveWuwaMediaUrl, WUWA_DEFAULT_CDN_ASSETS_BASE } from '../../shared/wuwaMedia';

let heroine_guard_cleanups: EventOnReturn[] = [];

/** 解析 pic 引用（场景名或 catbox 文件名）为完整资源 URL，与伪同层 resolvePicUrl 对齐 */
function resolveWuwaPic(picRef: string, characterName?: string): string {
  const raw = picRef.trim();
  if (!raw) return '';

  if (!isLegacyPicRef(raw)) {
    const rel = lookupCgScene(characterName ?? '', raw);
    if (rel) {
      const local = resolveWuwaAssetPath(rel);
      if (local) return local;
    }
  }

  if (isLegacyPicRef(raw)) {
    return resolveWuwaMediaUrl(raw);
  }

  return '';
}

$(async () => {
  await Promise.race([
    waitGlobalInitialized('Mvu'),
    new Promise<void>(resolve => setTimeout(resolve, 8000)),
  ]);

  errorCatched(() => {
    window.__WUWA_ASSETS_BASE__ = WUWA_DEFAULT_CDN_ASSETS_BASE;
    publishWuwaAssetsBase();
    ensureWuWaSharedRegistered();
    exposeWuwaConsoleTools();
    heroine_guard_cleanups = registerHeroineGuard();

    // 向宿主页面暴露 pic 解析函数（供 regex 替换脚本等使用）
    const resolvePic = resolveWuwaPic;
    window.__WUWA_RESOLVE_PIC__ = resolvePic;
    try {
      if (window.parent && window.parent !== window) {
        (window.parent as Window & typeof globalThis).__WUWA_RESOLVE_PIC__ = resolvePic;
      }
    } catch {
      /* cross-origin */
    }

    console.info('[鸣潮共享] 已加载（控制台: await __WUWA_REPAIR_HEROINES__("秧秧")）');
  })();

  $(window).on('pagehide', () => {
    heroine_guard_cleanups.forEach(off => off.stop());
    heroine_guard_cleanups = [];
  });
});

declare global {
  interface Window {
    __WUWA_RESOLVE_PIC__?: (picRef: string, characterName?: string) => string;
  }
}

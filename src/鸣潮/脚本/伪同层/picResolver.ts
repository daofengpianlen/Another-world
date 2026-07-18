import { isLegacyPicRef, lookupCgScene } from '../../shared/cgLookup';
import { resolveWuwaAssetPath, resolveWuwaMediaUrl } from '../../shared/wuwaMedia';
import { tryUnlockCgByRoleAndScene } from '../../shared/cgUnlockBridge';

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

/**
 * 解析 <z> 内 <pic> 引用。
 * 新格式：<z>漂泊者<pic>日常</pic>… → 按角色名+场景名查 CG 索引，走本地 assets。
 * 旧格式（catbox 短文件名 / URL）仍兼容一层。
 */
export function resolvePicUrl(ref: string, character?: string): string {
  const raw = ref.trim();
  if (!raw) return '';

  if (!isLegacyPicRef(raw)) {
    const rel = lookupCgScene(character ?? '', raw);
    if (rel) {
      tryUnlockCgByRoleAndScene(character ?? '', raw);
      const local = resolveWuwaAssetPath(rel);
      if (local) return local;
    }
  }

  if (isLegacyPicRef(raw)) {
    return resolveWuwaMediaUrl(raw);
  }

  return '';
}

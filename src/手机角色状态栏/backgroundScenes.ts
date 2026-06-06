import { CG_CHARACTER_ORDER, CG_LIST, lookupCgSceneFile, normalizeCgSceneName } from './config';
import { findMapAreaLabel, listMapAreaLabels, resolveMapAreaRef } from './mapAreaScenes';
import { resolveMediaUrl } from './media';

const CG_CHARACTERS_BY_LENGTH = [...CG_CHARACTER_ORDER].sort((a, b) => b.length - a.length);

function looks_like_cg_ref(ref: string): boolean {
  return CG_CHARACTERS_BY_LENGTH.some(character => ref.startsWith(character));
}

function is_direct_media_ref(ref: string): boolean {
  if (/^(https?:|data:|blob:|\/)/i.test(ref)) return true;
  return /\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mov)(\?|$)/i.test(ref);
}

function resolve_cg_background_ref(ref: string): string | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  for (const character of CG_CHARACTERS_BY_LENGTH) {
    if (!trimmed.startsWith(character)) continue;
    const scene_part = trimmed.slice(character.length).trim();
    if (!scene_part) continue;

    const file =
      lookupCgSceneFile(character, scene_part) ??
      lookupCgSceneFile(character, normalizeCgSceneName(scene_part));
    if (file) return resolveMediaUrl(file);

    console.warn(
      `[background] 未识别的角色 CG：「${trimmed}」。请使用世界书「角色CG白名单」中的「${character}」场景名，勿自创同义词。`,
    );
    return null;
  }

  return null;
}

/**
 * 解析 `<background>` 标签正文：
 * - 地图次级区域：`召唤祭坛`、`圣骑士验武台`（见 `mapAreaScenes.ts`）
 * - 角色 CG：`莉莉安口交`、`凛正常位做爱`
 * - 仍支持 catbox 短文件名与完整 URL（不推荐）
 */
export function resolveBackgroundRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) return '';

  if (is_direct_media_ref(trimmed)) {
    return resolveMediaUrl(trimmed);
  }

  const map_url = resolveMapAreaRef(trimmed);
  if (map_url) return map_url;

  const cg_url = resolve_cg_background_ref(trimmed);
  if (cg_url) return cg_url;
  if (looks_like_cg_ref(trimmed)) return '';

  return resolveMediaUrl(trimmed);
}

/** 可用于 `<background>` 的地图次级区域名列表 */
export function listBackgroundSceneLabels(): string[] {
  return listMapAreaLabels();
}

/** 由已解析 URL 反查 `<background>` 标签原文（兼容旧楼层仅存 URL） */
export function findBackgroundSceneLabel(resolved_url: string): string | null {
  const resolved = resolveMediaUrl(resolved_url.trim());
  if (!resolved) return null;

  const map_label = findMapAreaLabel(resolved);
  if (map_label) return map_label;

  for (const character of CG_CHARACTERS_BY_LENGTH) {
    const scenes = CG_LIST[character];
    if (!scenes) continue;
    for (const [scene, file] of Object.entries(scenes)) {
      if (resolveMediaUrl(file) === resolved) return `${character}${scene}`;
    }
  }

  return null;
}

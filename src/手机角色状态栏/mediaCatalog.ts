import { CG_LIST, EXPRESSION_LIST, NPC_AVATAR_URLS } from './config';
import { MAP_AREA_FILES } from './mapAreaScenes';
import { resolveMediaUrl } from './media';

/** 收集角色卡内置的全部插图 / 视频 / CG / 头像 / 地图背景 URL */
export function collectBundledMediaUrls(): string[] {
  const files = new Set<string>();

  for (const scenes of Object.values(CG_LIST)) {
    for (const file of Object.values(scenes)) {
      if (file) files.add(file);
    }
  }

  for (const file of Object.values(NPC_AVATAR_URLS)) {
    if (file) files.add(file);
  }

  for (const expressions of Object.values(EXPRESSION_LIST)) {
    for (const file of Object.values(expressions)) {
      if (file) files.add(file);
    }
  }

  for (const file of Object.values(MAP_AREA_FILES)) {
    if (file) files.add(file);
  }

  return [...files].map(resolveMediaUrl).filter(Boolean);
}

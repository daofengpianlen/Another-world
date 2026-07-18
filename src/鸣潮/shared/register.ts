import { getPatchedStoryMap, FALLBACK_STORY_MAP } from './storyMapData';
import { calculateStoryLogic } from './storyLogic';
import type { StoryVersion } from './types';

export type WuWaSharedGlobal = {
  STORY_MAP: StoryVersion[];
  calculateStoryLogic: typeof calculateStoryLogic;
};

function readExistingShared(): WuWaSharedGlobal | null {
  const sources: unknown[] = [globalThis, window];
  try {
    sources.push(window.parent);
  } catch {
    /* cross-origin */
  }
  for (const src of sources) {
    const shared = (src as { WuWaShared?: WuWaSharedGlobal } | null)?.WuWaShared;
    if (shared?.STORY_MAP?.length) return shared;
  }
  return null;
}

/** 若角色卡未提供 WuWaShared，则注入内置 STORY_MAP 与 calculateStoryLogic */
export function ensureWuWaSharedRegistered(): WuWaSharedGlobal {
  const existing = readExistingShared();
  if (existing) return existing;

  const STORY_MAP = getPatchedStoryMap(FALLBACK_STORY_MAP);
  const shared: WuWaSharedGlobal = { STORY_MAP, calculateStoryLogic };

  initializeGlobal('WuWaShared', shared);
  (globalThis as { WuWaShared?: WuWaSharedGlobal }).WuWaShared = shared;
  (globalThis as { calculateStoryLogic?: typeof calculateStoryLogic }).calculateStoryLogic = calculateStoryLogic;

  console.info(`[鸣潮共享] 已注入内置 STORY_MAP（${STORY_MAP.length} 个版本）`);
  return shared;
}

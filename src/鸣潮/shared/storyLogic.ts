import { getPatchedStoryMap } from './storyMapData';
import type { StoryVersion } from './types';

type StoryState = {
  majorVerIdx?: number;
  partIdx?: number;
  isPostScript?: boolean;
  _anchorVer?: string;
};

/** 根据 _storyState 同步剧情相关展示字段（简化版，兼容无外部共享脚本的情况） */
export function calculateStoryLogic(stat_data: Record<string, unknown>): Record<string, unknown> {
  const storyState = stat_data._storyState as StoryState | undefined;
  if (!storyState) return stat_data;

  const storyMap = getStoryMapFromGlobals();
  const majorIdx = storyState.majorVerIdx;
  const partIdx = storyState.partIdx;
  if (majorIdx === undefined || partIdx === undefined || !storyMap?.[majorIdx]?.parts[partIdx]) {
    return stat_data;
  }

  const verObj = storyMap[majorIdx];
  const partTitle = verObj.parts[partIdx];
  const isPostScript = storyState.isPostScript === true;
  const cleanTitle = partTitle.replace(/\s*[（(](上|中|下)[）)]/g, '');

  if (isPostScript) {
    stat_data.剧情显示 = `v${verObj.version} 后日谈: ${cleanTitle} (已完结)`;
    stat_data.是否为后日谈 = 'true';
  } else {
    stat_data.剧情显示 = `v${verObj.version} Part ${partIdx + 1}: ${partTitle}`;
    stat_data.是否为后日谈 = 'false';
  }

  return stat_data;
}

function getStoryMapFromGlobals(): StoryVersion[] | null {
  const sources: unknown[] = [globalThis, window];
  try {
    sources.push(window.parent);
  } catch {
    /* cross-origin */
  }
  for (const src of sources) {
    const map = (src as { WuWaShared?: { STORY_MAP?: StoryVersion[] } } | null)?.WuWaShared?.STORY_MAP;
    if (map?.length) return map;
  }
  return getPatchedStoryMap();
}

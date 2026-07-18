import cgSceneIndex from '../assets/cgSceneIndex.json';
import type { StatData } from './tideMvuReader';

type CgIndex = { index?: Record<string, Record<string, string>> };

const MALE_NPC_NAMES = (() => {
  const set = new Set<string>();
  const index = (cgSceneIndex as CgIndex).index ?? {};
  for (const [char, scenes] of Object.entries(index)) {
    const sample = Object.values(scenes)[0];
    if (sample?.includes('cg/男性角色/')) set.add(char);
  }
  return set;
})();

/** CG 库中归类为「男性角色」的 NPC（伤痕、忌炎等） */
export function isKnownMaleNpc(name: string): boolean {
  const n = name?.trim();
  return !!n && MALE_NPC_NAMES.has(n);
}

export function getKnownMaleNpcNames(): string[] {
  return [...MALE_NPC_NAMES];
}

export function filterFemaleHeroineNames(names: string[]): string[] {
  return names.filter(n => n?.trim() && !isKnownMaleNpc(n));
}

/** 从 stat_data.女性角色 移除误写入的男性 NPC，返回被移除的名字 */
export function purgeMaleNpcFromHeroines(stat: StatData): string[] {
  const heroines = stat.女性角色 as Record<string, unknown> | undefined;
  if (!heroines || typeof heroines !== 'object') return [];

  const removed: string[] = [];
  for (const name of Object.keys(heroines)) {
    if (isKnownMaleNpc(name)) {
      delete heroines[name];
      removed.push(name);
    }
  }
  return removed;
}

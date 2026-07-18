import type { StatData } from './tideMvuReader';
import { extractNamesFromLegacyStat } from './statDataCompat';
import { applyHeroinesViaMvu } from './mvuPatch';
import { getMvuApi } from './wuwaTavern';
import { mergeHeroinesPreferGalFloor } from './heroineMerge';

type HeroinesMap = Record<string, Record<string, unknown>>;

export function getHeroinesFromStat(stat_data: StatData | undefined): HeroinesMap {
  if (!stat_data?.女性角色 || typeof stat_data.女性角色 !== 'object') return {};
  return stat_data.女性角色 as HeroinesMap;
}

/** 将 fallback 中的女性角色合并进 primary（primary / AI 更新优先，缺的键从 fallback 补） */
export function mergeHeroinesIntoStatData(primary: StatData, fallback: StatData): StatData {
  const base = getHeroinesFromStat(fallback);
  if (!Object.keys(base).length) return primary;

  const current = getHeroinesFromStat(primary);
  return {
    ...primary,
    女性角色: mergeHeroinesPreferGalFloor(current, base),
  };
}

/** parseMessage 之后保留 baseline 里已有、但 AI 未写入的女性角色 */
export function preserveHeroinesAfterParse(result: Mvu.MvuData, baseline: Mvu.MvuData): Mvu.MvuData {
  const merged_stat = mergeHeroinesIntoStatData(result.stat_data ?? {}, baseline.stat_data ?? {});
  return { ...result, stat_data: merged_stat };
}

/** 把 0 楼女性角色同步到指定楼层（用 insert patch，非直接 merge 对象） */
export async function syncHeroinesFromFloorZero(message_id: number | 'latest' = 'latest'): Promise<string[]> {
  try {
    const MvuApi = getMvuApi();
    const floor0 = MvuApi.getMvuData({ type: 'message', message_id: 0 });
    const floor0_heroines = getHeroinesFromStat(floor0?.stat_data);
    const names = collectSyncNames(floor0?.stat_data, floor0_heroines);
    if (!names.length) return [];

    let current = MvuApi.getMvuData({ type: 'message', message_id }) ?? { stat_data: {} };
    current = await applyHeroinesViaMvu(current, names);
    await MvuApi.replaceMvuData(current, { type: 'message', message_id });
    console.info(`[鸣潮] 已从 0 楼 insert 同步女性角色到 message ${String(message_id)}:`, names);
    return names;
  } catch (error) {
    console.warn('[鸣潮] syncHeroinesFromFloorZero 失败', error);
    return [];
  }
}

function collectSyncNames(
  floor0_stat: StatData | undefined,
  floor0_heroines: HeroinesMap,
): string[] {
  const names = new Set<string>(Object.keys(floor0_heroines));
  extractNamesFromLegacyStat(floor0_stat).forEach(name => names.add(name));
  return [...names];
}

export function readFloorZeroStatData(): StatData {
  try {
    const floor0 = getMvuApi().getMvuData({ type: 'message', message_id: 0 });
    return (floor0?.stat_data as StatData) ?? {};
  } catch {
    return {};
  }
}

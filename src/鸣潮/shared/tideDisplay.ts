import { isWuwaTruthy, type StatData } from './tideMvuReader';

export type HeroineEntry = {
  name: string;
  affection: number;
  here: boolean;
  title: string;
  thought: string;
  wear_text: string;
  appearance: string;
};

export function tideSafe(value: unknown, fallback = '--'): string {
  return value !== undefined && value !== null && value !== '' ? String(value) : fallback;
}

export function formatWearValue(wear: unknown): string {
  if (typeof wear === 'string') return wear.trim() || '--';
  if (!wear || typeof wear !== 'object') return '--';
  const record = wear as Record<string, unknown>;
  const parts = ['上装', '下装', '饰品', '其它']
    .map(key => {
      const val = record[key];
      return val ? `${key}:${String(val)}` : '';
    })
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : '--';
}

export function formatSexStatus(label: string, active: boolean): string {
  return active ? `🔞 ${label}性爱中` : `✅ ${label}正常`;
}

export function buildHeroineEntries(stat_data: StatData): HeroineEntry[] {
  const heroines = (stat_data.女性角色 as Record<string, Record<string, unknown>>) ?? {};
  return Object.entries(heroines)
    .map(([name, char]) => {
      const extra = (char.额外信息 as Record<string, unknown>) ?? {};
      const base = (char.基础信息 as Record<string, unknown>) ?? {};
      return {
        name,
        affection: Number(char.好感度 ?? 0),
        here: isWuwaTruthy(char.是否在场),
        title: tideSafe(extra.角色称号 ?? base.角色名字, ''),
        thought: tideSafe(extra.内心想法, ''),
        wear_text: formatWearValue(char.当前穿着),
        appearance: tideSafe(base.外貌, ''),
      };
    })
    .sort((a, b) => Number(b.here) - Number(a.here));
}

export function buildInventoryEntries(stat_data: StatData): Array<{ name: string; count: number; desc: string; type: string }> {
  const bag = ((stat_data.主角信息 as Record<string, unknown>)?.物品栏 as Record<string, Record<string, unknown>>) ?? {};
  return Object.entries(bag).map(([name, item]) => ({
    name,
    count: Number(item.数量 ?? 1),
    desc: tideSafe(item.描述, ''),
    type: tideSafe(item.类型, '杂物'),
  }));
}

export function hasMeaningfulStatData(stat_data: StatData): boolean {
  if (!stat_data || !Object.keys(stat_data).length) return false;
  const meaningful_keys = [
    '当前时间',
    '所在地点',
    '剧情显示',
    '主角信息',
    '女性角色',
    '当前演绎事件',
    '当前长期目标',
  ];
  return meaningful_keys.some(key => {
    const val = stat_data[key];
    if (val === undefined || val === null || val === '') return false;
    if (typeof val === 'object') return Object.keys(val as object).length > 0;
    return true;
  });
}

/** 女性角色条目深度合并（局部 patch 不得覆盖已有完整字段） */

const PLACEHOLDER_MARKERS = ['等待AI填入', '等待AI根据'];

export function isPlaceholderHeroineValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  if (!text) return true;
  return PLACEHOLDER_MARKERS.some(m => text.includes(m));
}

/** 开场面板预置骨架：好感 10 + 外貌等待填入，且尚无真实描写 */
export function isOpeningHeroineSkeleton(entry: Record<string, unknown> | undefined): boolean {
  if (!entry || typeof entry !== 'object' || !Object.keys(entry).length) return true;
  const base = (entry.基础信息 as Record<string, unknown>) ?? {};
  const aff = Number(entry.好感度 ?? 10);
  const noRealLook = isPlaceholderHeroineValue(base.外貌);
  return aff <= 10 && noRealLook;
}

export function deepMergeHeroineEntry(
  base?: Record<string, unknown>,
  patch?: Record<string, unknown>,
): Record<string, unknown> {
  return _.merge({}, base ?? {}, patch ?? {});
}

/** 按角色名合并多张 女性角色 表；后者覆盖前者同路径，但保留深合并 */
export function mergeHeroinesMap(
  ...maps: Array<Record<string, Record<string, unknown>>>
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const map of maps) {
    if (!map || typeof map !== 'object') continue;
    for (const [name, entry] of Object.entries(map)) {
      if (!entry || typeof entry !== 'object') continue;
      result[name] = deepMergeHeroineEntry(result[name], entry as Record<string, unknown>);
    }
  }
  return result;
}

/**
 * GAL 楼层数据优先；floor0 仅补「尚不存在」或仍为开场面板骨架的角色。
 * 避免第二条 partial patch 后，floor0 骨架（好感 10、空外貌）污染已登场角色。
 */
export function mergeHeroinesPreferGalFloor(
  primary: Record<string, Record<string, unknown>> | undefined,
  floor0: Record<string, Record<string, unknown>> | undefined,
): Record<string, Record<string, unknown>> {
  const p = primary ?? {};
  const f = floor0 ?? {};
  const names = new Set([...Object.keys(p), ...Object.keys(f)]);
  const merged: Record<string, Record<string, unknown>> = {};

  for (const name of names) {
    const primaryEntry = p[name];
    const floorEntry = f[name];

    if (primaryEntry && !isOpeningHeroineSkeleton(primaryEntry as Record<string, unknown>)) {
      merged[name] = deepMergeHeroineEntry(
        floorEntry as Record<string, unknown>,
        primaryEntry as Record<string, unknown>,
      );
      continue;
    }

    if (primaryEntry && floorEntry) {
      merged[name] = deepMergeHeroineEntry(
        floorEntry as Record<string, unknown>,
        primaryEntry as Record<string, unknown>,
      );
      continue;
    }

    merged[name] = (primaryEntry ?? floorEntry) as Record<string, unknown>;
  }

  return merged;
}

/** contact.relationship.affection 与 女性角色.好感度 对齐（取较大值，防止旧 contact 卡住） */
export function syncContactAffectionFromHeroine(
  contact: Record<string, unknown>,
  heroine: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!heroine || typeof heroine !== 'object') return contact;
  const aff = Number(heroine.好感度);
  if (Number.isNaN(aff)) return contact;

  const rel = (contact.relationship as Record<string, unknown>) ?? {};
  const current = Number(rel.affection ?? NaN);
  if (Number.isNaN(current) || aff > current) {
    return { ...contact, relationship: { ...rel, affection: aff } };
  }
  return contact;
}

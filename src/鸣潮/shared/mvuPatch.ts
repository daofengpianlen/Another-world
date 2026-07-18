import { createDefaultHeroineEntry } from './heroineDefaults';
import { filterFemaleHeroineNames, isKnownMaleNpc, purgeMaleNpcFromHeroines } from './knownMaleNpcs';
import type { StatData } from './tideMvuReader';

/** MVU JSON Patch 操作（见世界书 [mvu_update]变量输出格式；新键用 insert，不是 RFC 的 add） */
export type MvuJsonPatchOp =
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'insert'; path: string; value: unknown }
  | { op: 'delta'; path: string; value: number }
  | { op: 'remove'; path: string }
  | { op: 'move'; from: string; to: string };

export function buildUpdateVariableMessage(patches: MvuJsonPatchOp[], analysis = 'Script-side MVU update.'): string {
  return `<UpdateVariable>
<Analysis>${analysis}</Analysis>
<JSONPatch>
${JSON.stringify(patches, null, 2)}
</JSONPatch>
</UpdateVariable>`;
}

/** 通过 Mvu.parseMessage 应用 JSON Patch（走 zod schema 与 MVU 解析链） */
export async function applyMvuJsonPatches(
  old_data: Mvu.MvuData,
  patches: MvuJsonPatchOp[],
): Promise<Mvu.MvuData> {
  if (!patches.length) return old_data;
  const message = buildUpdateVariableMessage(patches);
  try {
    const parsed = await Mvu.parseMessage(message, old_data);
    return parsed ?? old_data;
  } catch (error) {
    console.error('[鸣潮 MVU] JSON Patch 解析失败', error, patches);
    throw error;
  }
}

function heroineExists(stat_data: StatData, name: string): boolean {
  const entry = (stat_data.女性角色 as Record<string, unknown> | undefined)?.[name];
  return !!entry && typeof entry === 'object' && Object.keys(entry).length > 0;
}

/**
 * 构建女性角色 patch：
 * - **首次登场** → `insert` `/女性角色/{名}`
 * - **已存在** → `replace` 是否在场 等（禁止对不存在路径 replace）
 * - **好感变化** → 单独用 buildHeroineAffectionDeltaPatch（`delta`）
 */
export function buildHeroinePatches(
  stat_data: StatData,
  names: string[],
  options?: { default_affection?: number; force_present?: boolean },
): MvuJsonPatchOp[] {
  const patches: MvuJsonPatchOp[] = [];
  const affection = options?.default_affection ?? 10;
  const force_present = options?.force_present ?? true;

  for (const name of names) {
    if (!name || isKnownMaleNpc(name)) continue;
    if (!heroineExists(stat_data, name)) {
      patches.push({
        op: 'insert',
        path: `/女性角色/${name}`,
        value: createDefaultHeroineEntry(name, { 好感度: affection, 是否在场: 'true' }),
      });
      continue;
    }
    if (force_present) {
      patches.push({ op: 'replace', path: `/女性角色/${name}/是否在场`, value: 'true' });
    }
  }
  return patches;
}

export function buildHeroineAffectionDeltaPatch(name: string, delta: number): MvuJsonPatchOp {
  return { op: 'delta', path: `/女性角色/${name}/好感度`, value: delta };
}

/** 角色卡 legacy 名单为对象时，补 insert 键避免 story logic 认为「未登场」 */
export function buildLegacyListPatches(stat_data: StatData, names: string[]): MvuJsonPatchOp[] {
  const patches: MvuJsonPatchOp[] = [];
  for (const field of ['_已知角色名单', '_现场女性角色显示'] as const) {
    const current = stat_data[field];
    if (!current || typeof current !== 'object' || Array.isArray(current)) continue;
    const record = current as Record<string, unknown>;
    for (const name of names) {
      if (record[name] === undefined) {
        patches.push({ op: 'insert', path: `/${field}/${name}`, value: true });
      }
    }
  }
  return patches;
}

export async function applyHeroinesViaMvu(data: Mvu.MvuData, names: string[]): Promise<Mvu.MvuData> {
  const filtered = filterFemaleHeroineNames(names);
  if (!filtered.length) return data;
  const stat = (data.stat_data ?? {}) as StatData;
  const heroinePatches = buildHeroinePatches(stat, filtered);
  const legacyPatches = buildLegacyListPatches(stat, filtered);
  const patches = [...heroinePatches, ...legacyPatches];
  if (!patches.length) return data;
  return applyMvuJsonPatches(data, patches);
}

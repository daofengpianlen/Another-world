import { createDefaultHeroineEntry } from './heroineDefaults';
import { filterFemaleHeroineNames, isKnownMaleNpc, purgeMaleNpcFromHeroines } from './knownMaleNpcs';
import { deepMergeHeroineEntry, isOpeningHeroineSkeleton } from './heroineMerge';
import type { MvuJsonPatchOp } from './mvuPatch';
import { collectHeroineNames, extractNamesFromLegacyStat } from './statDataCompat';
import { getHeroinesFromStat } from './statDataMerge';
import type { StatData } from './tideMvuReader';

/** 从 assistant 消息的 <JSONPatch> 提取 insert/replace 的女性角色 */
export function extractHeroinesFromMessagePatch(message: string): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  if (!message) return result;

  const patch_match = message.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/i);
  if (!patch_match?.[1]) return result;

  try {
    const patches = JSON.parse(patch_match[1]) as MvuJsonPatchOp[];
    if (!Array.isArray(patches)) return result;

    for (const patch of patches) {
      const path = patch.path ?? '';
      if (!path.startsWith('/女性角色/')) continue;

      const segments = path.split('/').filter(Boolean);
      const name = segments[1];
      if (!name || isKnownMaleNpc(name)) continue;

      if (patch.op === 'insert' || patch.op === 'add') {
        if (patch.value && typeof patch.value === 'object') {
          result[name] = patch.value as Record<string, unknown>;
        }
        continue;
      }

      if (patch.op === 'replace' && segments.length >= 3) {
        if (!result[name]) result[name] = {};
        _.set(result[name], segments.slice(2).join('.'), patch.value);
        continue;
      }

      if (patch.op === 'delta' && segments.length >= 3 && segments[1] === name) {
        if (!result[name]) result[name] = {};
        const fieldPath = segments.slice(2).join('.');
        const current = Number(_.get(result[name], fieldPath) ?? 0);
        const delta = Number(patch.value ?? 0);
        if (!Number.isNaN(current) && !Number.isNaN(delta)) {
          _.set(result[name], fieldPath, current + delta);
        }
      }
    }
  } catch (error) {
    console.warn('[鸣潮 heroineGuard] 解析 JSONPatch 失败', error);
  }

  return result;
}

export function extractGalSpeakerNames(message: string): string[] {
  const names = new Set<string>();
  if (!message) return [];
  for (const match of message.matchAll(/<other\s+name=["']([^"']+)["']/gi)) {
    const name = match[1]?.trim();
    if (name) names.add(name);
  }
  return [...names];
}

function syncLegacyPresenceFields(stat: StatData, names: string[]) {
  if (!names.length) return;

  for (const field of ['_已知角色名单', '_现场女性角色显示'] as const) {
    const current = stat[field];
    if (current === undefined) {
      stat[field] = Object.fromEntries(names.map(name => [name, true]));
      continue;
    }
    if (typeof current === 'object' && !Array.isArray(current)) {
      const record = { ...(current as Record<string, unknown>) };
      names.forEach(name => {
        record[name] = record[name] ?? true;
      });
      stat[field] = record;
    }
  }
}

/**
 * 当角色卡 WuWa Logic 清空/忽略 女性角色 时，从本楼 UpdateVariable 与更新前数据恢复。
 * 在 Mvu.events.VARIABLE_UPDATE_ENDED / BEFORE_MESSAGE_UPDATE 内同步调用，直接改 variables。
 */
export function ensureHeroinesAfterCardLogic(
  variables: Mvu.MvuData,
  variables_before: Mvu.MvuData | undefined,
  message_content: string,
): boolean {
  const stat = (variables.stat_data ?? {}) as StatData;
  const before_stat = (variables_before?.stat_data ?? {}) as StatData;

  const purged = purgeMaleNpcFromHeroines(stat);
  if (purged.length) {
    console.warn('[鸣潮 heroineGuard] 已移除误写入 女性角色 的男性 NPC:', purged.join('、'));
    variables.stat_data = stat;
  }

  const after_heroines = getHeroinesFromStat(stat);
  const before_heroines = getHeroinesFromStat(before_stat);
  const patch_heroines = extractHeroinesFromMessagePatch(message_content);
  const patch_names = Object.keys(patch_heroines);
  const gal_names = extractGalSpeakerNames(message_content);

  const candidate_names = [
    ...patch_names,
    ...gal_names,
    ...Object.keys(before_heroines),
    ...collectHeroineNames(before_stat, stat),
    ...extractNamesFromLegacyStat(stat),
  ].filter(Boolean);

  const names_to_fix = filterFemaleHeroineNames(
    patch_names.length
      ? patch_names
      : [...new Set(candidate_names)].filter(name => {
          const entry = after_heroines[name];
          return !entry || !Object.keys(entry).length;
        }),
  );

  if (!names_to_fix.length) return false;

  let restored = false;
  if (!stat.女性角色 || typeof stat.女性角色 !== 'object') {
    stat.女性角色 = {};
  }
  const heroines = stat.女性角色 as Record<string, Record<string, unknown>>;

  for (const name of names_to_fix) {
    const current = heroines[name];
    const from_patch = patch_heroines[name];
    const from_before = before_heroines[name];

    if (current && Object.keys(current).length > 0) {
      if (isOpeningHeroineSkeleton(current) || (from_before && !isOpeningHeroineSkeleton(from_before))) {
        heroines[name] = deepMergeHeroineEntry(
          from_before as Record<string, unknown>,
          deepMergeHeroineEntry(from_patch as Record<string, unknown>, current as Record<string, unknown>),
        );
        restored = true;
      }
      continue;
    }

    heroines[name] = from_patch ?? from_before ?? createDefaultHeroineEntry(name, { 是否在场: 'true' });
    restored = true;
  }

  if (!restored) return false;

  syncLegacyPresenceFields(stat, names_to_fix);
  variables.stat_data = stat;
  console.info('[鸣潮 heroineGuard] 已恢复被 WuWa Logic 拦截的女性角色:', names_to_fix);
  return true;
}

let last_update_message = '';

export function peekLastMvuUpdateMessage(): string {
  return last_update_message;
}

function resolveMessageContent(message_content?: string): string {
  if (message_content?.trim()) return message_content;
  if (last_update_message.trim()) return last_update_message;

  try {
    const messages = getChatMessages(-1);
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant') return last.message ?? '';
  } catch {
    /* ignore */
  }
  return '';
}

/** 注册 MVU 事件：在角色卡 calculateStoryLogic 清空 女性角色 后强制写回 */
export function registerHeroineGuard(): EventOnReturn[] {
  const cleanups: EventOnReturn[] = [];

  cleanups.push(
    eventOn(Mvu.events.COMMAND_PARSED, (_variables, _commands, message_content) => {
      if (message_content?.includes('<UpdateVariable>')) {
        last_update_message = message_content;
      }
    }),
  );

  cleanups.push(
    eventOn(Mvu.events.BEFORE_MESSAGE_UPDATE, context => {
      const message = resolveMessageContent(context.message_content);
      ensureHeroinesAfterCardLogic(context.variables, undefined, message);
    }),
  );

  cleanups.push(
    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, variables_before) => {
      const message = resolveMessageContent();
      ensureHeroinesAfterCardLogic(variables, variables_before, message);
    }),
  );

  console.info('[鸣潮 heroineGuard] 已监听 MVU 更新（对抗 WuWa Logic 清空 女性角色）');
  return cleanups;
}

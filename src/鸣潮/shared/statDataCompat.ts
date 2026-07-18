import { filterFemaleHeroineNames } from './knownMaleNpcs';
import { createDefaultHeroineEntry, parseTargetCharacterNames } from './heroineDefaults';
import { extractHeroinesFromMessagePatch } from './heroineGuard';
import { applyHeroinesViaMvu } from './mvuPatch';
import { getHeroinesFromStat, syncHeroinesFromFloorZero } from './statDataMerge';
import type { StatData } from './tideMvuReader';
import { getMvuApi } from './wuwaTavern';

/** 从角色卡 legacy 字段解析角色名（_已知角色名单 / _现场女性角色显示） */
export function extractNamesFromLegacyStat(stat_data: StatData | undefined): string[] {
  if (!stat_data) return [];
  const names = new Set<string>();

  const push = (raw: unknown) => {
    if (typeof raw === 'string') {
      parseTargetCharacterNames(raw).forEach(name => names.add(name));
      return;
    }
    if (Array.isArray(raw)) {
      raw.forEach(item => {
        if (typeof item === 'string') names.add(item.trim());
        else if (item && typeof item === 'object' && 'name' in item) names.add(String((item as { name: unknown }).name).trim());
      });
      return;
    }
    if (raw && typeof raw === 'object') {
      Object.entries(raw as Record<string, unknown>).forEach(([key, val]) => {
        if (val === false || val === 'false') return;
        names.add(key.trim());
      });
    }
  };

  push(stat_data._已知角色名单);
  push(stat_data._现场女性角色显示);

  return [...names].filter(Boolean);
}

export function collectHeroineNames(...sources: Array<StatData | string[] | undefined>): string[] {
  const names = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source)) {
      source.forEach(name => names.add(name));
      continue;
    }
    Object.keys((source.女性角色 as Record<string, unknown>) ?? {}).forEach(name => names.add(name));
    extractNamesFromLegacyStat(source).forEach(name => names.add(name));
  }
  return filterFemaleHeroineNames([...names]);
}

/** @deprecated 仅作无 MVU 降级；正常路径请用 applyHeroinesViaMvu + insert patch */
export function writeHeroinesToStatData(stat_data: StatData, names: string[]): StatData {
  if (!names.length) return stat_data;

  if (!stat_data.女性角色 || typeof stat_data.女性角色 !== 'object') {
    stat_data.女性角色 = {};
  }
  const heroines = stat_data.女性角色 as Record<string, Record<string, unknown>>;

  for (const name of names) {
    const existing = heroines[name];
    if (!existing || !Object.keys(existing).length) {
      heroines[name] = createDefaultHeroineEntry(name, { 好感度: 10, 是否在场: 'true' });
    }
  }

  syncLegacyCharacterLists(stat_data, names);
  return stat_data;
}

function syncLegacyCharacterLists(stat_data: StatData, names: string[]) {
  if (!names.length) return;

  if (stat_data._已知角色名单 !== undefined) {
    const current = stat_data._已知角色名单;
    if (Array.isArray(current)) {
      stat_data._已知角色名单 = [...new Set([...current.map(String), ...names])];
    } else if (current && typeof current === 'object') {
      const record = { ...(current as Record<string, unknown>) };
      names.forEach(name => {
        record[name] = record[name] ?? true;
      });
      stat_data._已知角色名单 = record;
    } else if (typeof current === 'string') {
      stat_data._已知角色名单 = [...new Set([...parseTargetCharacterNames(current), ...names])].join('、');
    } else {
      stat_data._已知角色名单 = [...names];
    }
  }

  if (stat_data._现场女性角色显示 !== undefined) {
    const current = stat_data._现场女性角色显示;
    if (Array.isArray(current)) {
      stat_data._现场女性角色显示 = [...new Set([...current.map(String), ...names])];
    } else if (current && typeof current === 'object') {
      const record = { ...(current as Record<string, unknown>) };
      names.forEach(name => {
        record[name] = record[name] ?? true;
      });
      stat_data._现场女性角色显示 = record;
    } else if (typeof current === 'string') {
      stat_data._现场女性角色显示 = [...new Set([...parseTargetCharacterNames(current), ...names])].join('、');
    } else {
      stat_data._现场女性角色显示 = [...names];
    }
  }
}

/** 读取世界书 [opening] 条目的 目标角色 */
export function parseTargetCharactersFromOpeningYaml(content: string): string[] {
  const match = content.match(/^目标角色:\s*"?([^"\n]*)"?/m);
  if (!match?.[1]) return [];
  return parseTargetCharacterNames(match[1]);
}

/** 从最新 GAL 消息的 <other name="…"> 提取角色名 */
export function extractNamesFromGalMessages(): string[] {
  try {
    const messages = getChatMessages('0-{{lastMessageId}}');
    const names = new Set<string>();
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      const body = msg.message ?? '';
      for (const match of body.matchAll(/<other\s+name=["']([^"']+)["']/gi)) {
        const name = match[1]?.trim();
        if (name) names.add(name);
      }
    }
    return [...names];
  } catch {
    return [];
  }
}

/** 修复当前聊天 0 楼：从 [opening] 世界书 + legacy 字段 + GAL 补写 女性角色 */
export async function repairFloorZeroHeroines(manualNames?: string[]): Promise<string[]> {
  let names = manualNames?.filter(Boolean) ?? [];
  if (!names.length) {
    try {
      const books = getWorldbookNames();
      for (const book_name of books) {
        const entries = getWorldbook(book_name);
        const opening = entries.find(
          e =>
            e.name.includes('[opening]') ||
            e.strategy.keys.some(k => String(k).includes('[opening]')) ||
            e.content.includes('目标角色:'),
        );
        if (opening?.content) {
          names = parseTargetCharactersFromOpeningYaml(opening.content);
          if (names.length) break;
        }
      }
    } catch (error) {
      console.warn('[鸣潮] 读取 [opening] 失败', error);
    }
  }

  if (!names.length) {
    names = extractNamesFromGalMessages();
  }

  let patch_heroines: Record<string, Record<string, unknown>> = {};
  try {
    const messages = getChatMessages('0-{{lastMessageId}}');
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;
      patch_heroines = extractHeroinesFromMessagePatch(msg.message ?? '');
      if (Object.keys(patch_heroines).length) {
        names = [...new Set([...names, ...Object.keys(patch_heroines)])];
        break;
      }
    }
  } catch {
    /* ignore */
  }

  const MvuApi = getMvuApi();
  let shell = MvuApi.getMvuData({ type: 'message', message_id: 0 }) ?? { stat_data: {} };
  const stat = { ...(shell.stat_data ?? {}) } as StatData;

  names = collectHeroineNames(stat, names);
  if (!names.length) {
    console.warn(
      '[鸣潮] 未找到角色名。请执行 __WUWA_REPAIR_HEROINES__("秧秧") 或在 [opening] 填写 目标角色',
    );
    return [];
  }

  const fn = (globalThis as { calculateStoryLogic?: (d: Record<string, unknown>) => Record<string, unknown> })
    .calculateStoryLogic;
  const after_logic = typeof fn === 'function' ? (fn(stat) as StatData) : stat;
  shell.stat_data = after_logic;

  try {
    shell = await applyHeroinesViaMvu(shell, names);
  } catch (error) {
    console.warn('[鸣潮] MVU insert 失败，降级为直接写入', error);
    shell.stat_data = writeHeroinesToStatData(after_logic, names);
  }

  if (Object.keys(patch_heroines).length && shell.stat_data?.女性角色) {
    const heroines = shell.stat_data.女性角色 as Record<string, Record<string, unknown>>;
    for (const [name, entry] of Object.entries(patch_heroines)) {
      heroines[name] = _.merge({}, createDefaultHeroineEntry(name), entry, heroines[name] ?? {});
    }
    shell.stat_data = writeHeroinesToStatData(shell.stat_data as StatData, Object.keys(patch_heroines));
  }

  await MvuApi.replaceMvuData(shell, { type: 'message', message_id: 0 });
  await MvuApi.replaceMvuData(shell, { type: 'message', message_id: 'latest' });

  const verify = MvuApi.getMvuData({ type: 'message', message_id: 0 }) ?? { stat_data: {} };
  if (!Object.keys(getHeroinesFromStat(verify.stat_data)).length) {
    console.warn('[鸣潮] insert 后仍为空，重试 insert patch（跳过 story logic）');
    const retry = await applyHeroinesViaMvu(verify, names);
    await MvuApi.replaceMvuData(retry, { type: 'message', message_id: 0 });
    shell = retry;
  }

  await syncHeroinesFromFloorZero('latest');

  const written = Object.keys((shell.stat_data.女性角色 as Record<string, unknown>) ?? {});
  console.info('[鸣潮] repairFloorZeroHeroines 完成:', written);
  return written;
}

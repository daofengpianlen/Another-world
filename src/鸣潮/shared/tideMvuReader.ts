import { ensureMvuReady, getMvuApi, getTavernHelper, getTavernHost } from './wuwaTavern';
import { getHeroinesFromStat, mergeHeroinesIntoStatData, readFloorZeroStatData } from './statDataMerge';
import { extractNamesFromLegacyStat, writeHeroinesToStatData } from './statDataCompat';
import { normalizeWuwaStatData, coerceStatArray } from './statDataDefaults';
import { mergeHeroinesMap, syncContactAffectionFromHeroine } from './heroineMerge';

export type StatData = Record<string, unknown>;

type JsonPatchOp = {
  op?: string;
  path?: string;
  value?: unknown;
};

const JSON_PATCH_WRITE_OPS = new Set(['replace', 'insert', 'add', 'delta']);

function isJsonPatchWriteOp(op: string | undefined): boolean {
  return JSON_PATCH_WRITE_OPS.has(op ?? '');
}

/** 按 JSONPatch 顺序写入 stat（支持 delta；用于累积多楼 patch） */
export function applyJsonPatchOp(stat: StatData, patch: JsonPatchOp): void {
  const path = patch.path ?? '';
  if (!path.startsWith('/')) return;
  const segments = path.split('/').filter(Boolean);
  if (!segments.length) return;

  const op = patch.op ?? '';
  if (op === 'delta') {
    const current = Number(_.get(stat, segments.join('.')) ?? 0);
    const delta = Number(patch.value ?? 0);
    if (!Number.isNaN(current) && !Number.isNaN(delta)) {
      _.set(stat, segments.join('.'), current + delta);
    }
    return;
  }
  if (!isJsonPatchWriteOp(op)) return;

  /* 整对象写入：/女性角色/名 或 /contact/名（add / insert） */
  if (
    segments.length === 2
    && (segments[0] === '女性角色' || segments[0] === 'contact')
    && patch.value
    && typeof patch.value === 'object'
    && !Array.isArray(patch.value)
  ) {
    const bucket = segments[0];
    if (!stat[bucket] || typeof stat[bucket] !== 'object') stat[bucket] = {};
    (stat[bucket] as Record<string, unknown>)[segments[1]] = patch.value;
    return;
  }

  /* JSON Patch 数组追加：/剧情触发器/- 、 /伏笔/- */
  if (segments[segments.length - 1] === '-') {
    const arrayPath = segments.slice(0, -1).join('.');
    const existing = _.get(stat, arrayPath);
    const arr = Array.isArray(existing) ? [...existing] : [];
    arr.push(patch.value);
    _.set(stat, arrayPath, arr);
    return;
  }

  _.set(stat, segments.join('.'), patch.value);
}

export function parseJsonPatchFromMessage(message: string): JsonPatchOp[] {
  if (!message) return [];
  const patch_match = message.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/i);
  if (!patch_match?.[1]) return [];
  try {
    const patches = JSON.parse(patch_match[1]) as JsonPatchOp[];
    return Array.isArray(patches) ? patches : [];
  } catch (error) {
    console.warn('[鸣潮浪潮] 解析消息 JSONPatch 失败', error);
    return [];
  }
}

/** 从 assistant 消息 JSONPatch 还原 stat_data（含 add/insert 的 contact 与 女性角色） */
export function extractFullStatFromMessagePatch(message: string): StatData {
  const stat: StatData = {};
  for (const patch of parseJsonPatchFromMessage(message)) {
    applyJsonPatchOp(stat, patch);
  }
  return stat;
}

/** 按时间顺序累积所有 assistant 楼层的 JSONPatch（与 MVU 持久化结果对齐） */
export function readCumulativeMessagePatch(): StatData {
  const stat: StatData = {};
  try {
    const messages = getTavernHelper().getChatMessages('0-{{lastMessageId}}');
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue;
      const body = msg.message ?? '';
      if (!body.includes('<UpdateVariable>')) continue;
      for (const patch of parseJsonPatchFromMessage(body)) {
        applyJsonPatchOp(stat, patch);
      }
    }
  } catch (error) {
    console.warn('[鸣潮浪潮] 累积消息 JSONPatch 读取失败', error);
  }
  return stat;
}

function readFromLatestMessagePatch(): StatData {
  return readCumulativeMessagePatch();
}

const STORY_DISPLAY_FIELDS = [
  '当前长期目标',
  '当前演绎事件',
  '当前演绎事件节点',
  '即将进行的下一个事件节点',
  '已完成的上一个事件',
  '已完成的上一个事件节点',
  '章节终止条件',
] as const;

/** 角色卡 WuWa Logic / 开场占位文案，展示时应忽略并尝试从 JSONPatch 补全 */
export function isWuwaStoryPlaceholder(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  if (!text) return true;
  return text.includes('等待AI');
}

function scoreStatData(stat: StatData): number {
  let score = 0;
  if (stat.当前时间 && !isWuwaStoryPlaceholder(stat.当前时间)) score += 2;
  if (stat.所在地点 && !isWuwaStoryPlaceholder(stat.所在地点)) score += 2;
  if (
    (!isWuwaStoryPlaceholder(stat.当前演绎事件) || !isWuwaStoryPlaceholder(stat.当前演绎事件节点))
  ) {
    score += 2;
  }
  for (const key of STORY_DISPLAY_FIELDS) {
    if (!isWuwaStoryPlaceholder(stat[key])) score += 3;
  }
  if (stat.主角信息 && typeof stat.主角信息 === 'object') score += 1;
  score += Object.keys(getHeroinesFromStat(stat)).length * 3;
  const contact = stat.contact;
  if (contact && typeof contact === 'object') {
    score += Object.keys(contact as object).length * 3;
  }
  const trigs = coerceStatArray(stat.剧情触发器);
  if (trigs.length) score += trigs.length * 2;
  const fores = coerceStatArray(stat.伏笔);
  if (fores.length) score += fores.length * 2;
  return score;
}

function mergeContactMaps(
  primary: Record<string, unknown> | undefined,
  patch: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const base = (primary && typeof primary === 'object' ? primary : {}) as Record<string, unknown>;
  const extra = (patch && typeof patch === 'object' ? patch : {}) as Record<string, unknown>;
  const names = new Set([...Object.keys(base), ...Object.keys(extra)]);
  const merged: Record<string, unknown> = { ...base };
  for (const name of names) {
    const left = base[name];
    const right = extra[name];
    if (right && typeof right === 'object') {
      merged[name] = _.merge({}, left && typeof left === 'object' ? left : {}, right);
    } else if (right !== undefined) {
      merged[name] = right;
    }
  }
  return merged;
}

function mergeStatArrayField(primary: unknown, patch: unknown): unknown[] {
  const from_primary = coerceStatArray(primary);
  const from_patch = coerceStatArray(patch);
  /* MVU 已持久化的完整数组优先；patch 仅在本楼提取且 primary 为空时补全 */
  if (from_primary.length >= from_patch.length) return from_primary;
  return from_patch.length ? from_patch : from_primary;
}

function mergeMessagePatchOntoStat(primary: StatData, patch: StatData): StatData {
  if (!Object.keys(patch).length) return primary;

  const mergedHeroines = mergeHeroinesMap(getHeroinesFromStat(primary), getHeroinesFromStat(patch));
  let mergedContact = mergeContactMaps(
    primary.contact as Record<string, unknown> | undefined,
    patch.contact as Record<string, unknown> | undefined,
  );
  for (const [name, entry] of Object.entries(mergedHeroines)) {
    if (mergedContact[name] && typeof mergedContact[name] === 'object') {
      mergedContact[name] = syncContactAffectionFromHeroine(
        mergedContact[name] as Record<string, unknown>,
        entry,
      );
    }
  }

  return {
    ...primary,
    ...patch,
    主角信息: _.merge({}, (primary.主角信息 as object) ?? {}, (patch.主角信息 as object) ?? {}),
    女性角色: mergedHeroines,
    contact: mergedContact,
    剧情触发器: mergeStatArrayField(primary.剧情触发器, patch.剧情触发器),
    伏笔: mergeStatArrayField(primary.伏笔, patch.伏笔),
  };
}

export function extractStatData(mvu_data: unknown): StatData {
  if (!mvu_data || typeof mvu_data !== 'object') return {};

  const stat_data = _.get(mvu_data, 'stat_data');
  if (stat_data && typeof stat_data === 'object' && Object.keys(stat_data as object).length > 0) {
    return stat_data as StatData;
  }

  const root_keys = Object.keys(mvu_data as object).filter(key => !key.startsWith('$') && key !== 'stat_data');
  if (root_keys.length > 0) return mvu_data as StatData;

  return {};
}

/** 与 regex 浪潮状态栏一致：优先 getAllVariables */
function readFromGetAllVariables(): StatData {
  try {
    if (typeof getAllVariables === 'function') {
      return extractStatData(getAllVariables());
    }
  } catch (error) {
    console.warn('[鸣潮浪潮] getAllVariables 读取失败', error);
  }
  return {};
}

function readFromGetVariables(): StatData {
  try {
    if (typeof getVariables === 'function') {
      for (const message_id of ['latest', -1, 0] as const) {
        const stat = extractStatData(getVariables({ type: 'message', message_id }));
        if (Object.keys(stat).length > 0) return stat;
      }
      const chat_stat = extractStatData(getVariables({ type: 'chat' }));
      if (Object.keys(chat_stat).length > 0) return chat_stat;
    }
  } catch (error) {
    console.warn('[鸣潮浪潮] getVariables 读取失败', error);
  }
  return {};
}

function readFromTavernMessages(): StatData {
  try {
    const messages = getTavernHelper().getChatMessages('0-{{lastMessageId}}');
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      const from_data = extractStatData((msg as { data?: unknown }).data);
      if (Object.keys(from_data).length > 0) return from_data;
    }
  } catch (error) {
    console.warn('[鸣潮浪潮] 从 TavernHelper 消息读取 stat_data 失败', error);
  }
  return {};
}

function readFromSillyTavernChat(): StatData {
  try {
    const host = getTavernHost() as Window & { SillyTavern?: { chat?: Array<Record<string, unknown>> } };
    const chat = host.SillyTavern?.chat;
    if (!Array.isArray(chat) || !chat.length) return {};

    for (let i = chat.length - 1; i >= 0; i -= 1) {
      const msg = chat[i];
      const swipe_id = (msg.swipe_id as number | undefined) ?? 0;
      const variables = _.get(msg, ['variables', swipe_id]);
      const stat = extractStatData(variables);
      if (Object.keys(stat).length > 0) return stat;
    }
  } catch (error) {
    console.warn('[鸣潮浪潮] 从 SillyTavern.chat 读取 stat_data 失败', error);
  }
  return {};
}

function readFromLatestGalFloor(): StatData {
  try {
    const messages = getTavernHelper().getChatMessages('0-{{lastMessageId}}');
    const MvuApi = getMvuApi();

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;
      if (!/<gal[\s>]/i.test(msg.message ?? '')) continue;

      const stat = extractStatData(MvuApi.getMvuData({ type: 'message', message_id: msg.message_id }));
      if (Object.keys(stat).length > 0) return stat;

      const from_data = extractStatData((msg as { data?: unknown }).data);
      if (Object.keys(from_data).length > 0) return from_data;
    }

    const opening_stat = extractStatData(MvuApi.getMvuData({ type: 'message', message_id: 0 }));
    if (Object.keys(opening_stat).length > 0) return opening_stat;
  } catch (error) {
    console.warn('[鸣潮浪潮] 从最新 GAL 楼层读取 stat_data 失败', error);
  }
  return {};
}

/** 从 MVU / getAllVariables / 聊天记录 / 消息 JSONPatch 等多源读取 */
export function readWuwaStatData(): StatData {
  const floor0 = readFloorZeroStatData();
  const from_patch = readFromLatestMessagePatch();

  const candidates: StatData[] = [
    readFromGetAllVariables(),
    readFromLatestGalFloor(),
    readFromGetVariables(),
    readFromTavernMessages(),
    readFromSillyTavernChat(),
    floor0,
    from_patch,
  ];

  try {
    const MvuApi = getMvuApi();
    for (const message_id of [-1, 'latest', 0] as const) {
      candidates.push(extractStatData(MvuApi.getMvuData({ type: 'message', message_id })));
    }
    candidates.push(extractStatData(MvuApi.getMvuData({ type: 'chat' })));
  } catch (error) {
    console.warn('[鸣潮浪潮] Mvu.getMvuData 不可用，尝试降级读取', error);
  }

  let best = {} as StatData;
  let best_score = -1;
  for (const candidate of candidates) {
    const merged = mergeMessagePatchOntoStat(
      mergeHeroinesIntoStatData(candidate, floor0),
      from_patch,
    );
    const score = scoreStatData(merged);
    if (score > best_score) {
      best_score = score;
      best = merged;
    }
  }

  return normalizeWuwaStatData(enrichEmptyHeroines(best));
}

function enrichEmptyHeroines(stat: StatData): StatData {
  const current = (stat.女性角色 as Record<string, unknown>) ?? {};
  if (Object.keys(current).length > 0) return stat;

  const legacy_names = extractNamesFromLegacyStat(stat);
  if (!legacy_names.length) return stat;
  return writeHeroinesToStatData({ ...stat }, legacy_names);
}

export async function ensureWuwaStatDataReady(): Promise<StatData> {
  try {
    await ensureMvuReady(8000);
  } catch (error) {
    console.warn('[鸣潮浪潮] MVU 等待超时，仍尝试读取已有变量', error);
  }
  return readWuwaStatData();
}

export function isWuwaTruthy(value: unknown): boolean {
  return value === true || value === 'true';
}

/** 浪潮状态栏编辑变量时使用的 message_id（对齐伪同层 GAL 楼层） */
export function resolveTideEditMessageId(): number {
  try {
    const messages = getTavernHelper().getChatMessages('0-{{lastMessageId}}');
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.role !== 'assistant') continue;
      if (!/<gal[\s>]/i.test(msg.message ?? '')) continue;
      return msg.message_id;
    }
    const opening = messages[0];
    if (opening) return opening.message_id;
  } catch (error) {
    console.warn('[鸣潮浪潮] resolveTideEditMessageId 失败', error);
  }
  return -1;
}

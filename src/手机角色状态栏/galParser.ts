import { resolveBackgroundRef } from './backgroundScenes';
import type { CombatEnemyTemplate } from './combat';
import { resolveJPic } from './config';
import { resolveMediaUrl as resolveUrl } from './media';

export type GalDialogueKind = 'character' | 'narrator' | 'other';

export interface GalBattleData {
  name: string;
  level: number;
  能力: {
    生命: number;
    力量: number;
    体魄: number;
    智慧: number;
  };
  region: string;
  desc: string;
}

export interface GalEventData {
  desc: string;
  resolve_label: string;
  ignore_label: string;
  check_stat?: '生命' | '力量' | '体魄' | '智慧' | '金币';
  check_threshold?: number;
  battle?: GalBattleData;
}

export interface GalTimelineEntry {
  kind: 'bgm' | 'background' | 'dialogue' | 'battle' | 'event';
  bgm?: string;
  background?: string;
  /** `<background>` 标签原文，如 `召唤祭坛` */
  background_label?: string;
  dialogue_kind?: GalDialogueKind;
  speaker?: string;
  pic?: string;
  text?: string;
  battle?: GalBattleData;
  event?: GalEventData;
}

export interface ParsedGal {
  timeline: GalTimelineEntry[];
  dialogues: GalTimelineEntry[];
}

const GAL_BLOCK_RE = /<gal>([\s\S]*?)<\/gal>/i;

function parse_tag_attrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w\u4e00-\u9fff]+)\s*=\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    attrs[match[1].toLowerCase()] = match[2].trim();
  }
  return attrs;
}

function read_attr(attrs: Record<string, string>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = attrs[key.toLowerCase()];
    if (value) return value;
  }
  return fallback;
}

function read_number_attr(attrs: Record<string, string>, keys: string[], fallback: number): number {
  const raw = read_attr(attrs, keys);
  if (!raw) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

function parse_event_tag(attr_raw: string, body: string): GalEventData {
  const attrs = parse_tag_attrs(attr_raw);
  const battle_match = body.match(/<battle([^>]*?)(?:\/>|>([\s\S]*?)<\/battle>)/i);
  let battle: GalBattleData | undefined;
  let desc = body.trim();

  if (battle_match) {
    battle = parse_battle_tag(battle_match[1], battle_match[2] ?? '');
    desc = desc.replace(battle_match[0], '').trim();
  }

  const check_raw = read_attr(attrs, ['check', '判定', '属性'], '');
  const stat_map: Record<string, GalEventData['check_stat']> = {
    生命: '生命',
    力量: '力量',
    体魄: '体魄',
    智慧: '智慧',
    金币: '金币',
  };
  const check_stat = stat_map[check_raw] ?? stat_map[check_raw.replace(/\s/g, '')];

  const threshold_raw = read_attr(attrs, ['threshold', '阈值', '数值'], '');
  const check_threshold = threshold_raw ? Number(threshold_raw) : undefined;

  return {
    desc,
    resolve_label: read_attr(attrs, ['resolve', '解决', '选项1'], '尝试处理'),
    ignore_label: read_attr(attrs, ['ignore', '忽视', '选项2'], '不予理睬'),
    check_stat,
    check_threshold: Number.isFinite(check_threshold) ? check_threshold : undefined,
    battle,
  };
}

function parse_battle_tag(attr_raw: string, body: string): GalBattleData {
  const attrs = parse_tag_attrs(attr_raw);
  return {
    name: read_attr(attrs, ['name', '名称'], '未知敌人'),
    level: _.clamp(read_number_attr(attrs, ['level', '等级'], 1), 1, 100),
    能力: {
      生命: _.clamp(read_number_attr(attrs, ['生命', 'hp', '生命值'], 50), 1, 9999),
      力量: _.clamp(read_number_attr(attrs, ['力量', '攻击', 'atk', '攻击力'], 10), 0, 999),
      体魄: _.clamp(read_number_attr(attrs, ['体魄', '防御', 'def', '防御力'], 8), 0, 999),
      智慧: _.clamp(read_number_attr(attrs, ['智慧', '敏捷', 'agi'], 8), 0, 999),
    },
    region: read_attr(attrs, ['region', '区域'], '未知'),
    desc: body.trim(),
  };
}

export function battle_data_to_template(data: GalBattleData): CombatEnemyTemplate {
  return {
    id: `tag_${data.name}`,
    name: data.name,
    regions: data.region ? [data.region] : [],
    level: data.level,
    能力: { ...data.能力 },
  };
}

function parse_character_dialogue(body: string): GalTimelineEntry {
  // 标准 </pic>；兼容 AI 常见笔误 </p>（勿与旁白 <p> 混淆，此处仅在 <j>/<s> 内解析）
  const pic_match = body.match(/^([\s\S]*?)<pic>([\s\S]*?)<\/(?:pic|p)>([\s\S]*)$/i);
  if (pic_match) {
    const speaker = pic_match[1].trim();
    const expression = pic_match[2].trim();
    if (expression && !expression.includes('<')) {
      return {
        kind: 'dialogue',
        dialogue_kind: 'character',
        speaker,
        pic: resolveJPic(speaker, expression),
        text: pic_match[3].trim(),
      };
    }
  }

  return {
    kind: 'dialogue',
    dialogue_kind: 'character',
    speaker: body.split(/[\n\r]/)[0]?.trim() || '角色',
    text: body,
  };
}

function parse_ordered_tags(inner: string): GalTimelineEntry[] {
  const event_re = /<event([^>]*?)>([\s\S]*?)<\/event>/gi;
  const battle_re = /<battle([^>]*?)(?:\/>|>([\s\S]*?)<\/battle>)/gi;
  const tag_re =
    /<(bgm|background|j|s|p|other)(?:\s+name="([^"]*)")?\s*>([\s\S]*?)<\/\1>/gi;

  const merged: { index: number; entry: GalTimelineEntry }[] = [];

  let event_match: RegExpExecArray | null;
  while ((event_match = event_re.exec(inner)) !== null) {
    merged.push({
      index: event_match.index,
      entry: {
        kind: 'event',
        event: parse_event_tag(event_match[1], event_match[2] ?? ''),
      },
    });
  }

  let battle_match: RegExpExecArray | null;
  while ((battle_match = battle_re.exec(inner)) !== null) {
    merged.push({
      index: battle_match.index,
      entry: {
        kind: 'battle',
        battle: parse_battle_tag(battle_match[1], battle_match[2] ?? ''),
      },
    });
  }

  let match: RegExpExecArray | null;
  while ((match = tag_re.exec(inner)) !== null) {
    const tag = match[1].toLowerCase();
    const attr = match[2]?.trim();
    const body = match[3].trim();
    let entry: GalTimelineEntry | null = null;

    if (tag === 'bgm') entry = { kind: 'bgm', bgm: resolveUrl(body) };
    else if (tag === 'background') {
      const label = body.trim();
      entry = { kind: 'background', background: resolveBackgroundRef(label), background_label: label };
    }
    else if (tag === 'p') {
      entry = { kind: 'dialogue', dialogue_kind: 'narrator', speaker: '旁白', text: body };
    } else if (tag === 'other') {
      entry = { kind: 'dialogue', dialogue_kind: 'other', speaker: attr || '未知', text: body };
    } else if (tag === 'j' || tag === 's') {
      entry = parse_character_dialogue(body);
    }

    if (entry) {
      merged.push({ index: match.index, entry });
    }
  }

  merged.sort((a, b) => a.index - b.index);
  return merged.map(item => item.entry);
}

export function parseGalFromMessage(message: string): ParsedGal | null {
  const block = message.match(GAL_BLOCK_RE)?.[1];
  if (!block) return null;

  const timeline = parse_ordered_tags(block);
  const dialogues = timeline.filter(entry => entry.kind === 'dialogue');

  return { timeline, dialogues };
}

/** dialogue 序号 → timeline 下标 */
export function timelineIndexOfDialogue(timeline: GalTimelineEntry[], dialogue_index: number): number {
  let seen = -1;
  for (let i = 0; i < timeline.length; i += 1) {
    if (timeline[i].kind === 'dialogue') {
      seen += 1;
      if (seen === dialogue_index) return i;
    }
  }
  return Math.max(timeline.length - 1, 0);
}

/** timeline 下标之前最后一条 dialogue 的 dialogue 序号 */
export function lastDialogueIndexBefore(timeline: GalTimelineEntry[], before_timeline_index: number): number {
  let last = -1;
  for (let i = 0; i < before_timeline_index; i += 1) {
    if (timeline[i].kind === 'dialogue') last += 1;
  }
  return Math.max(last, 0);
}

/** 时间轴中第一个 battle */
export function primaryBattleTimelineIndex(timeline: GalTimelineEntry[]): number | null {
  const idx = timeline.findIndex(entry => entry.kind === 'battle');
  return idx >= 0 ? idx : null;
}

export function isEventTimelineStep(timeline: GalTimelineEntry[], timeline_step: number): boolean {
  return timeline[timeline_step]?.kind === 'event';
}

/** 时间轴中第一个 event */
export function primaryEventTimelineIndex(timeline: GalTimelineEntry[]): number | null {
  const idx = timeline.findIndex(entry => entry.kind === 'event');
  return idx >= 0 ? idx : null;
}

export function isBattleTimelineStep(timeline: GalTimelineEntry[], timeline_step: number): boolean {
  return timeline[timeline_step]?.kind === 'battle';
}

export function resolveMediaState(timeline: GalTimelineEntry[], timeline_step: number): {
  bgm: string;
  background: string;
  background_label: string;
} {
  let bgm = '';
  let background = '';
  let background_label = '';
  const upto = _.clamp(timeline_step, 0, Math.max(timeline.length - 1, 0));

  for (let i = 0; i < timeline.length && i <= upto; i += 1) {
    const entry = timeline[i];
    if (entry.kind === 'bgm' && entry.bgm) bgm = entry.bgm;
    if (entry.kind === 'background' && entry.background) {
      background = entry.background;
      background_label = entry.background_label?.trim() || background_label;
    }
  }

  return { bgm, background, background_label };
}

export { isVideoUrl, resolveMediaUrl } from './media';

import type { GalBattleData, GalEventData } from './galParser';
import type { Schema } from './schema';

export type EventCheckStat = '生命' | '力量' | '体魄' | '智慧' | '金币';

export interface EventCheck {
  stat: EventCheckStat;
  threshold: number;
}

export interface EventDelta {
  stat: EventCheckStat;
  amount: number;
  reason: string;
}

export interface EventResolveOutcome {
  success: boolean;
  player_value: number;
  check: EventCheck;
  deltas: EventDelta[];
  summary: string;
}

export interface EventIgnoreOutcome {
  kind: 'none' | 'reward' | 'punish' | 'battle';
  deltas: EventDelta[];
  summary: string;
}

const CHECK_STATS: EventCheckStat[] = ['生命', '力量', '体魄', '智慧', '金币'];

/** 突发事件判定成功时的属性奖励区间（金币单独随机） */
const EVENT_REWARD_RANGES: Record<Exclude<EventCheckStat, '金币'>, [number, number]> = {
  生命: [10, 20],
  力量: [5, 10],
  体魄: [5, 10],
  智慧: [1, 5],
};

export function read_player_stat(hero: Schema['主角'], stat: EventCheckStat): number {
  if (stat === '金币') return hero.金币;
  return hero.能力[stat];
}

export function format_stat_label(stat: EventCheckStat): string {
  return stat;
}

/** 展示用：事件出现时生成或读取判定（可指定属性/阈值） */
export function roll_event_check(hero: Schema['主角'], preset?: Partial<EventCheck>): EventCheck {
  if (preset?.stat && preset.threshold !== undefined) {
    return { stat: preset.stat, threshold: preset.threshold };
  }

  const stat = preset?.stat ?? CHECK_STATS[_.random(0, CHECK_STATS.length - 1)];
  const current = read_player_stat(hero, stat);

  if (preset?.threshold !== undefined) {
    return { stat, threshold: preset.threshold };
  }

  let threshold: number;
  if (stat === '金币') {
    const hi = Math.max(30, Math.floor(current * 0.8));
    threshold = _.random(10, hi);
  } else {
    const lo = Math.max(5, Math.floor(current * 0.65));
    const hi = Math.max(lo + 1, Math.ceil(current * 1.15));
    threshold = _.random(lo, hi);
  }

  return { stat, threshold: Math.max(1, threshold) };
}

function reward_delta(_hero: Schema['主角']): EventDelta {
  const roll = _.random(0, 4);
  if (roll === 4) {
    const amount = _.random(8, 35);
    return { stat: '金币', amount, reason: `金币 +${amount}` };
  }
  const stat = CHECK_STATS[roll] as Exclude<EventCheckStat, '金币'>;
  const [lo, hi] = EVENT_REWARD_RANGES[stat];
  const amount = _.random(lo, hi);
  return { stat, amount, reason: `${stat} +${amount}` };
}

function punish_delta(hero: Schema['主角'], harsh = false): EventDelta {
  if (harsh && _.random(0, 1) === 0) {
    const stat = (['生命', '力量', '体魄', '智慧'] as const)[_.random(0, 3)];
    const amount = -_.random(1, 2);
    return { stat, amount, reason: `${stat} ${amount}` };
  }
  const amount = -_.random(5, harsh ? 45 : 25);
  return { stat: '金币', amount, reason: `金币 ${amount}` };
}

export function apply_event_deltas(hero: Schema['主角'], deltas: EventDelta[]): void {
  for (const delta of deltas) {
    if (delta.stat === '金币') {
      hero.金币 = _.clamp(hero.金币 + delta.amount, 0, 9999999);
      continue;
    }
    hero.能力[delta.stat] = _.clamp(hero.能力[delta.stat] + delta.amount, 0, 9999);
  }
}

export function resolve_event_choice(
  hero: Schema['主角'],
  event: GalEventData,
  check: EventCheck,
): EventResolveOutcome {
  const player_value = read_player_stat(hero, check.stat);
  const success = player_value >= check.threshold;

  const deltas: EventDelta[] = [];
  if (success) {
    deltas.push(reward_delta(hero));
  } else {
    deltas.push(punish_delta(hero, true));
  }

  apply_event_deltas(hero, deltas);

  const summary = success
    ? `判定成功（${check.stat} ${player_value} ≥ ${check.threshold}），获得：${deltas.map(d => d.reason).join('、')}`
    : `判定失败（${check.stat} ${player_value} < ${check.threshold}），受到：${deltas.map(d => d.reason).join('、')}`;

  return { success, player_value, check, deltas, summary };
}

/** 不理睬：70% 无、10% 奖励、20% 惩罚；若事件带 battle 则惩罚分支可触发遭遇战 */
export function resolve_event_ignore(
  hero: Schema['主角'],
  event: GalEventData,
): EventIgnoreOutcome {
  const roll = _.random(1, 100);

  if (roll <= 70) {
    return { kind: 'none', deltas: [], summary: '玩家选择不予理睬，未发生额外变化。' };
  }

  if (roll <= 80) {
    const delta = reward_delta(hero);
    apply_event_deltas(hero, [delta]);
    return {
      kind: 'reward',
      deltas: [delta],
      summary: `虽未介入，仍意外获得：${delta.reason}`,
    };
  }

  if (event.battle && _.random(0, 1) === 1) {
    return {
      kind: 'battle',
      deltas: [],
      summary: '玩家不予理睬，却因此卷入遭遇战！',
    };
  }

  const delta = punish_delta(hero);
  apply_event_deltas(hero, [delta]);
  return {
    kind: 'punish',
    deltas: [delta],
    summary: `不予理睬的代价：${delta.reason}`,
  };
}

export function build_event_ai_prompt(
  event: GalEventData,
  action: 'resolve' | 'ignore',
  detail: string,
): string {
  return `[突发事件·玩家已做出选择]
${event.desc.trim()}

玩家选择：${action === 'resolve' ? event.resolve_label : event.ignore_label}
${detail}

【输出要求】
1. 用 <gal> 描写该选择带来的后续（不要再次输出 <event>）。
2. 前端已应用部分 MVU 变化；<UpdateVariable> 仅补充剧情需要的其他变量，勿重复写入已变更项。
3. 剧情结束后由玩家在界面底部输入框自由输入行动或对话，**不要**输出 <choice> 选项标签。`;
}

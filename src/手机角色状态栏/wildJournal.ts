import type { CombatEnemyTier } from './combatRoster';
import { format_exp_progress } from './progression';
import type { Schema } from './schema';
import { read_current_region } from './regionState';

export type WildJournalEntryKind =
  | 'encounter'
  | 'victory'
  | 'defeat_retreat'
  | 'retry'
  | 'flee_encounter'
  | 'flee_battle';

export interface WildJournalEntry {
  ts: number;
  kind: WildJournalEntryKind;
  region: string;
  foe_name: string;
  foe_level: number;
  tier?: CombatEnemyTier;
  exp?: number;
  gold?: number;
  levels_gained?: number;
  player_level_after?: number;
  rounds?: number;
}

export interface WildJournalStats {
  fights_started: number;
  victories: number;
  defeats: number;
  flees: number;
  retries: number;
  total_exp: number;
  total_gold: number;
  levels_gained: number;
}

export interface WildJournalState {
  region: string;
  started_at: number;
  level_at_start: number;
  entries: WildJournalEntry[];
  stats: WildJournalStats;
}

const JOURNAL_KEY = 'gal_wild_journal';

/** 供界面响应野外日志变更 */
export const wild_journal_version = ref(0);

function notify_journal_change() {
  wild_journal_version.value += 1;
}

const TIER_LABEL: Record<CombatEnemyTier, string> = {
  weak: '弱敌',
  normal: '普通',
  elite: '精英',
};

const KIND_LABEL: Record<WildJournalEntryKind, string> = {
  encounter: '开战',
  victory: '胜利',
  defeat_retreat: '战败·传送宝石撤离',
  retry: '重新挑战',
  flee_encounter: '遭遇后撤退',
  flee_battle: '战斗中撤退',
};

function empty_stats(): WildJournalStats {
  return {
    fights_started: 0,
    victories: 0,
    defeats: 0,
    flees: 0,
    retries: 0,
    total_exp: 0,
    total_gold: 0,
    levels_gained: 0,
  };
}

function parse_journal(raw: unknown): WildJournalState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<WildJournalState>;
  if (!Array.isArray(obj.entries)) return null;
  return {
    region: typeof obj.region === 'string' ? obj.region : read_current_region(),
    started_at: typeof obj.started_at === 'number' ? obj.started_at : Date.now(),
    level_at_start: typeof obj.level_at_start === 'number' ? obj.level_at_start : 1,
    entries: obj.entries.filter(
      (e): e is WildJournalEntry =>
        !!e &&
        typeof e === 'object' &&
        typeof e.kind === 'string' &&
        typeof e.foe_name === 'string' &&
        typeof e.region === 'string',
    ),
    stats: { ...empty_stats(), ...(obj.stats ?? {}) },
  };
}

function read_journal(): WildJournalState | null {
  return parse_journal(_.get(getVariables({ type: 'chat' }), JOURNAL_KEY, null));
}

function save_journal(state: WildJournalState | null) {
  const chat = klona(getVariables({ type: 'chat' }));
  if (!state || state.entries.length === 0) {
    delete chat[JOURNAL_KEY];
  } else {
    chat[JOURNAL_KEY] = state;
  }
  replaceVariables(chat, { type: 'chat' });
  notify_journal_change();
}

function ensure_journal(region: string, player_level: number): WildJournalState {
  const existing = read_journal();
  if (existing && existing.entries.length > 0) {
    return existing;
  }
  return {
    region,
    started_at: Date.now(),
    level_at_start: player_level,
    entries: [],
    stats: empty_stats(),
  };
}

function bump_stats(stats: WildJournalStats, entry: WildJournalEntry) {
  switch (entry.kind) {
    case 'encounter':
      stats.fights_started += 1;
      break;
    case 'victory':
      stats.victories += 1;
      stats.total_exp += entry.exp ?? 0;
      stats.total_gold += entry.gold ?? 0;
      stats.levels_gained += entry.levels_gained ?? 0;
      break;
    case 'defeat_retreat':
      stats.defeats += 1;
      break;
    case 'retry':
      stats.retries += 1;
      break;
    case 'flee_encounter':
    case 'flee_battle':
      stats.flees += 1;
      break;
  }
}

export function has_pending_wild_journal(): boolean {
  const journal = read_journal();
  return (journal?.entries.length ?? 0) > 0;
}

export function append_wild_journal_entry(
  entry: Omit<WildJournalEntry, 'ts'>,
  player_level = 1,
): void {
  const journal = ensure_journal(entry.region, player_level);
  const full: WildJournalEntry = { ...entry, ts: Date.now() };
  journal.entries.push(full);
  bump_stats(journal.stats, full);
  if (!journal.region || journal.region === '未知') {
    journal.region = entry.region;
  }
  save_journal(journal);
  console.info('[野外日志]', full.kind, full.foe_name, full.region);
}

export function clear_wild_journal(): void {
  save_journal(null);
}

function format_tier(tier?: CombatEnemyTier): string {
  if (!tier) return '';
  return TIER_LABEL[tier] ?? tier;
}

function format_foe_line(entry: WildJournalEntry): string {
  const tier = format_tier(entry.tier);
  const tier_part = tier ? `·${tier}` : '';
  return `${entry.foe_name}(Lv.${entry.foe_level}${tier_part})`;
}

function summarize_encountered_foes(entries: WildJournalEntry[]): string {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind === 'encounter' || entry.kind === 'retry') {
      const key = format_foe_line(entry);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  if (!counts.size) return '（无）';
  return [...counts.entries()].map(([name, n]) => (n > 1 ? `${name}×${n}` : name)).join('、');
}

function format_entry_detail(entry: WildJournalEntry, index: number): string {
  const base = `${index}. [${KIND_LABEL[entry.kind]}] ${entry.region} · ${format_foe_line(entry)}`;
  if (entry.kind === 'victory') {
    const parts = [`经验+${entry.exp ?? 0}`, `金币+${entry.gold ?? 0}`];
    if (entry.levels_gained && entry.levels_gained > 0) {
      parts.push(`升级至 Lv.${entry.player_level_after ?? '?'}`);
    }
    if (entry.rounds) parts.push(`${entry.rounds} 轮`);
    return `${base} → ${parts.join('，')}`;
  }
  return base;
}

/** 供「总结遇敌经历」按钮发送的完整提示词 */
export function build_wild_journal_summary_prompt(hero: Schema['主角']): string | null {
  const journal = read_journal();
  if (!journal?.entries.length) return null;

  const { stats } = journal;
  const region_hint =
    journal.region && journal.region !== '未知' ? journal.region : read_current_region();
  const level_line =
    stats.levels_gained > 0
      ? `等级 Lv.${journal.level_at_start} → Lv.${hero.等级}（+${stats.levels_gained}）`
      : `当前等级 Lv.${hero.等级}，经验 ${format_exp_progress(hero.等级, hero.经验)}`;
  const fight_line = `共 ${stats.fights_started} 场（胜利 ${stats.victories}，战败撤离 ${stats.defeats}，撤退 ${stats.flees}，重试 ${stats.retries} 次）`;
  const loot_line =
    stats.victories > 0
      ? `累计收获：经验 +${stats.total_exp}，金币 +${stats.total_gold}（**已由前端写入 MVU**）`
      : '本次无战斗胜利收获';

  const details = journal.entries.map((e, i) => format_entry_detail(e, i + 1)).join('\n');

  return `[野外历练总结·玩家请求续写]
玩家通过地图「野外遇敌」进行了一轮历练，请根据下列记录用 <gal> 续写剧情。

区域：${region_hint}
${fight_line}
遭遇敌人：${summarize_encountered_foes(journal.entries)}
${level_line}
${loot_line}

【逐条记录】
${details}

【输出要求】
1. 必须用 <gal> 将上述野外历练自然融入剧情，可写练级、搜刮、险境撤离、传送宝石脱战等细节。
2. 经验/等级/金币若摘要中注明已由前端结算，**勿在 <UpdateVariable> 中重复 delta**。
3. 战败撤离表示玩家用传送宝石脱战，**不要**强制传送回艾瑟兰王城。
4. 不要在本条回复中输出 <battle> 标签。`;
}

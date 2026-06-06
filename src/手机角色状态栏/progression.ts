import type { CombatEnemyTier } from './combatRoster';
import type { Schema } from './schema';

export type RewardTier = CombatEnemyTier | 'boss';

/** 从当前等级升到下一级所需经验 */
export function exp_required_for_next_level(current_level: number): number {
  if (current_level >= 100) return 0;
  return 40 + current_level * 20;
}

/** 界面展示：当前经验 / 升级所需（满级则 label 为「已满级」） */
export function format_exp_progress(level: number, exp: number): string {
  if (level >= 100) return '已满级';
  const required = exp_required_for_next_level(level);
  return `${exp} / ${required}`;
}

export function exp_progress_ratio(level: number, exp: number): number {
  if (level >= 100) return 1;
  const required = exp_required_for_next_level(level);
  if (required <= 0) return 0;
  return _.clamp(exp / required, 0, 1);
}

const TIER_EXP_MULT: Record<RewardTier, number> = {
  weak: 6,
  normal: 10,
  elite: 15,
  boss: 25,
};

const TIER_GOLD_RANGE: Record<RewardTier, [number, number]> = {
  weak: [2, 4],
  normal: [4, 8],
  elite: [8, 15],
  boss: [15, 30],
};

export interface BattleRewardParams {
  foe_level: number;
  tier?: RewardTier;
  player_level: number;
}

export interface BattleRewardResult {
  exp: number;
  gold: number;
  levels_gained: number;
  lines: string[];
}

export function calc_battle_exp(params: BattleRewardParams): number {
  const tier = params.tier ?? 'normal';
  const mult = TIER_EXP_MULT[tier];
  let exp = params.foe_level * mult;
  const over = Math.max(0, params.foe_level - params.player_level);
  exp = Math.floor(exp * Math.min(1.5, 1 + over * 0.05));
  return Math.max(1, exp);
}

export function calc_battle_gold(params: BattleRewardParams): number {
  const tier = params.tier ?? 'normal';
  const [lo, hi] = TIER_GOLD_RANGE[tier];
  const base = params.foe_level;
  return _.random(Math.max(1, Math.floor(lo * base * 0.5)), Math.max(1, Math.floor(hi * base * 0.5)));
}

/** 增加经验并处理升级（仅等级/经验/金币，不改能力四维） */
export function apply_exp_and_level_up(hero: Schema['主角'], exp_gain: number): number {
  if (exp_gain <= 0) return 0;
  hero.经验 = _.clamp(hero.经验 + exp_gain, 0, 999999);
  let levels = 0;
  while (hero.等级 < 100) {
    const need = exp_required_for_next_level(hero.等级);
    if (hero.经验 < need) break;
    hero.经验 -= need;
    hero.等级 += 1;
    levels += 1;
  }
  return levels;
}

export function apply_battle_victory_rewards(
  hero: Schema['主角'],
  params: BattleRewardParams,
): BattleRewardResult {
  const exp = calc_battle_exp(params);
  const gold = calc_battle_gold(params);
  const levels_gained = apply_exp_and_level_up(hero, exp);
  hero.金币 = _.clamp(hero.金币 + gold, 0, 9999999);

  const lines = [`经验 +${exp}`, `金币 +${gold}`];
  if (levels_gained > 0) {
    lines.push(`等级提升至 Lv.${hero.等级}`);
  }
  return { exp, gold, levels_gained, lines };
}

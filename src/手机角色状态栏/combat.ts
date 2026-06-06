import type { Schema } from './schema';

export type CombatSide = 'player' | 'enemy';

export type CombatPhase =
  | 'idle'
  | 'pick_rolls'
  | 'rolling'
  | 'fighting'
  | 'round_end'
  | 'victory'
  | 'defeat'
  | 'result';

export interface BattleResultSummary {
  victory: boolean;
  hero_name: string;
  foe_name: string;
  foe_level: number;
  region: string;
  rounds: number;
  /** MVU /主角/能力/生命（战斗前后不变，由前端保证） */
  sheet_hp: number;
  /** 本场战斗临时生命值 */
  battle_hp_start: number;
  battle_hp_end: number;
  battle_hp_max: number;
  log_lines: string[];
}

export interface CombatAbility {
  生命: number;
  力量: number;
  体魄: number;
  智慧: number;
}

export interface CombatFighter {
  name: string;
  level: number;
  能力: CombatAbility;
}

export interface CombatAttack {
  index: number;
  attacker: CombatSide;
  dice: number;
  damage: number;
  target_hp_after: number;
  log: string;
}

export interface CombatEnemyTemplate {
  id: string;
  name: string;
  regions: string[];
  level: number;
  能力: CombatAbility;
}

export const COMBAT_ROLL_MIN = 1;
export const COMBAT_ROLL_MAX = 5;
/** 战败撤离时本地叙事扣取的金币（补给与休整） */
export function calc_defeat_gold_penalty(foe_level: number): number {
  return _.clamp(Math.floor(foe_level * 2), 5, 50);
}

/** 力量/体魄/智慧 单项「基准值」；三项之和高于 3×基准 的部分可折算有效等级 */
export const COMBAT_STAT_BASELINE = 10;
/** 三维总和每高出基准多少，折算 +1 有效等级（仅伤害公式，不影响战斗血量） */
export const COMBAT_STAT_PER_BONUS_LEVEL = 6;
/** 属性折算的有效等级上限 ≈ 可越级挑战的上限（约 10 级） */
export const COMBAT_MAX_STAT_LEVEL_BONUS = 10;

export const COMBAT_ATTACK_LEVEL_COEF = 7;
export const COMBAT_DEFENSE_BODY_LEVEL_COEF = 4;
export const COMBAT_DEFENSE_WIS_LEVEL_COEF = 1;

/** 三维总和超出基准后折算的有效等级加成（0～10） */
export function combat_stat_level_bonus(能力: CombatAbility): number {
  const trio = 能力.力量 + 能力.体魄 + 能力.智慧;
  const excess = Math.max(0, trio - COMBAT_STAT_BASELINE * 3);
  return Math.min(
    COMBAT_MAX_STAT_LEVEL_BONUS,
    Math.floor(excess / COMBAT_STAT_PER_BONUS_LEVEL),
  );
}

/** 伤害公式用有效等级 = 真实等级 + 属性加成（战斗血量仍用真实等级） */
export function combat_effective_level(fighter: CombatFighter): number {
  return fighter.level + combat_stat_level_bonus(fighter.能力);
}

/** 敌人：<battle> 标签中的 生命 为基础生命值 */
export function enemy_combat_base_hp(能力: CombatAbility): number {
  return Math.max(1, 能力.生命);
}

/** 玩家 MVU /主角/能力/生命 = 基础生命属性（持久，战斗内不随扣血改变） */
export function player_combat_base_hp(能力: CombatAbility): number {
  return Math.max(1, 能力.生命);
}

/** 本场战斗临时生命上限 = MVU 生命 × 等级 */
export function combat_max_hp_from_base(base_hp: number, level: number): number {
  return Math.max(1, base_hp * Math.max(1, level));
}

export function combat_max_hp_for_player(hero: Schema['主角']): number {
  return combat_max_hp_from_base(player_combat_base_hp(hero.能力), hero.等级);
}

export function combat_max_hp_for_enemy(foe: CombatFighter | CombatEnemyTemplate): number {
  const level = foe.level;
  const base = enemy_combat_base_hp(foe.能力);
  return combat_max_hp_from_base(base, level);
}

/** 单次攻击：骰面 × (力量 + 7×有效等级) − (体魄 + 4×有效等级 + 智慧 + 1×有效等级) */
export function calc_attack_factor(力量: number, effective_level: number): number {
  return 力量 + COMBAT_ATTACK_LEVEL_COEF * effective_level;
}

export function calc_defense_reduction(体魄: number, 智慧: number, effective_level: number): number {
  return (
    体魄 +
    COMBAT_DEFENSE_BODY_LEVEL_COEF * effective_level +
    智慧 +
    COMBAT_DEFENSE_WIS_LEVEL_COEF * effective_level
  );
}

export function calc_hit_damage(dice: number, attacker: CombatFighter, defender: CombatFighter): number {
  const atk_level = combat_effective_level(attacker);
  const def_level = combat_effective_level(defender);
  const raw =
    dice * calc_attack_factor(attacker.能力.力量, atk_level) -
    calc_defense_reduction(defender.能力.体魄, defender.能力.智慧, def_level);
  return Math.max(1, Math.floor(raw));
}

export function build_battle_settlement_prompt(result: BattleResultSummary): string {
  const outcome = result.victory ? '胜利' : '失败';
  const log = result.log_lines.map((line, i) => `${i + 1}. ${line}`).join('\n');

  const base = `[战斗结算·${outcome}]
${result.hero_name} 与 ${result.foe_name}（Lv.${result.foe_level}，${result.region}）的遭遇战已结束，结果为【${outcome}】。

【战斗过程】
${log}

【战斗临时生命（仅演算用，已随战斗结束清空）】
- 本场战斗：${result.battle_hp_end}/${result.battle_hp_max}（开战 ${result.battle_hp_start}/${result.battle_hp_max}）
- 战斗轮数：${result.rounds}

【MVU 主角生命】
- /主角/能力/生命 仍为 ${result.sheet_hp}（前端**不会**把战后剩余战斗生命写回 MVU）
- 若剧情上应受伤、治疗或消耗，请你在 <UpdateVariable> 中自行 delta/replace /主角/能力/生命，并说明原因

【输出要求】
1. 必须用 <gal> 描写战后场景并推进剧情。
2. 必须用 <UpdateVariable> 结算：更新 /主角/经验、/主角/金币（delta）；必要时 /主角/等级。
3. **不要**因战斗剩余临时生命而 replace /主角/能力/生命；只有剧情明确受伤/治疗时才改生命。
4. 不要在本条回复中再次输出 <battle> 标签。`;

  return `${base}

【胜利奖励】
请根据敌人强度（Lv.${result.foe_level}）在 <UpdateVariable> 中发放经验与金币。`;
}

/** 战败后前端本地注入的 GAL 叙事（传送宝石撤离，不调用 AI） */
export function build_local_defeat_gal(result: BattleResultSummary): string {
  const gold_penalty = calc_defeat_gold_penalty(result.foe_level);
  const hp_penalty = Math.max(1, Math.floor(result.sheet_hp * 0.05));
  const foe_line = result.foe_name;
  const region = result.region || '未知区域';

  return `<gal>
<p>${result.hero_name} 与 ${foe_line}（Lv.${result.foe_level}）的交锋以失败告终。利刃与术式交织，视野逐渐模糊——</p>
<p>千钧一发之际，胸前的<strong>传送宝石</strong>骤然亮起，将${result.hero_name}从${region}的战场中强行扯离。</p>
<p>光芒散去，你跌坐在相对安全的休整之处，浑身作痛，却捡回一条命。${foe_line} 的威压仍仿佛压在心头，这一战尚未结束……</p>
</gal>
<UpdateVariable>
<Analysis>EN: Defeat retreat via teleport gem; minor gold and HP loss for recovery.</Analysis>
<JSONPatch>
[
  { "op": "delta", "path": "/主角/金币", "value": ${-gold_penalty} },
  { "op": "delta", "path": "/主角/能力/生命", "value": ${-hp_penalty} }
]
</JSONPatch>
</UpdateVariable>`;
}

export function build_battle_flee_prompt(params: {
  hero_name: string;
  foe_name: string;
  foe_level: number;
  region: string;
  desc?: string;
  hp_current?: number;
  hp_max?: number;
  log_lines?: string[];
  phase: 'encounter' | 'combat';
}): string {
  const context =
    params.phase === 'encounter'
      ? `${params.hero_name} 遭遇 ${params.foe_name}（Lv.${params.foe_level}，${params.region}）后尚未开战，选择撤退。`
      : `${params.hero_name} 在与 ${params.foe_name}（Lv.${params.foe_level}，${params.region}）的遭遇战中途选择撤退。`;

  const log =
    params.log_lines && params.log_lines.length
      ? `\n【已发生的战斗过程】\n${params.log_lines.map((line, i) => `${i + 1}. ${line}`).join('\n')}`
      : '';

  const hp =
    params.hp_current != null && params.hp_max != null
      ? `\n- 本场战斗临时生命：${params.hp_current}/${params.hp_max}（不影响 MVU /主角/能力/生命）`
      : '';

  const desc = params.desc?.trim() ? `\n遭遇描述：${params.desc.trim()}` : '';

  return `[遭遇战·撤退]
${context}${desc}${log}${hp}

【输出要求】
1. 必须用 <gal> 描写玩家安全脱离或狼狈撤退的后续，推进剧情。
2. 如需变更变量，用 <UpdateVariable>；撤退通常不发放胜利奖励。
3. 不要在本条回复中再次输出 <battle> 标签。`;
}

export function roll_d6(): number {
  return _.random(1, 6);
}

export function roll_dice(count: number): number[] {
  return _.times(count, roll_d6);
}

export function resolve_initiative(
  player: CombatFighter,
  enemy: CombatFighter,
  player_sum: number,
  enemy_sum: number,
): CombatSide {
  if (player_sum > enemy_sum) return 'player';
  if (enemy_sum > player_sum) return 'enemy';
  if (player.能力.智慧 > enemy.能力.智慧) return 'player';
  if (enemy.能力.智慧 > player.能力.智慧) return 'enemy';
  return 'player';
}

export function build_attack_queue(
  first: CombatSide,
  player: CombatFighter,
  enemy: CombatFighter,
  player_dice: number[],
  enemy_dice: number[],
): Omit<CombatAttack, 'index' | 'target_hp_after' | 'log'>[] {
  const count = player_dice.length;
  const queue: Omit<CombatAttack, 'index' | 'target_hp_after' | 'log'>[] = [];

  for (let i = 0; i < count; i += 1) {
    const pair: { side: CombatSide; dice: number }[] =
      first === 'player'
        ? [
            { side: 'player', dice: player_dice[i] },
            { side: 'enemy', dice: enemy_dice[i] },
          ]
        : [
            { side: 'enemy', dice: enemy_dice[i] },
            { side: 'player', dice: player_dice[i] },
          ];

    for (const hit of pair) {
      if (hit.side === 'player') {
        queue.push({
          attacker: 'player',
          dice: hit.dice,
          damage: calc_hit_damage(hit.dice, player, enemy),
        });
      } else {
        queue.push({
          attacker: 'enemy',
          dice: hit.dice,
          damage: calc_hit_damage(hit.dice, enemy, player),
        });
      }
    }
  }

  return queue;
}

export function fighter_from_hero(hero: Schema['主角']): CombatFighter {
  return {
    name: hero.姓名 || '主角',
    level: hero.等级,
    能力: { ...hero.能力 },
  };
}

export function fighter_from_template(template: CombatEnemyTemplate): CombatFighter {
  return {
    name: template.name,
    level: template.level,
    能力: { ...template.能力 },
  };
}

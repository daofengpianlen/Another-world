import {
  build_attack_queue,
  build_battle_flee_prompt,
  build_battle_settlement_prompt,
  build_local_defeat_gal,
  COMBAT_ROLL_MAX,
  COMBAT_ROLL_MIN,
  combat_max_hp_for_enemy,
  combat_max_hp_for_player,
  fighter_from_hero,
  fighter_from_template,
  resolve_initiative,
  roll_dice,
  type CombatAttack,
  type CombatEnemyTemplate,
  type CombatFighter,
  type CombatPhase,
  type CombatSide,
  type BattleResultSummary,
} from './combat';
import type { GalBattleData } from './galParser';
import { battle_data_to_template } from './galParser';
import { injectLocalDefeatNarrative, sendBattleSettlementMessage } from './gameFlow';
import { apply_battle_victory_rewards, type RewardTier } from './progression';
import type { CombatEnemyTier } from './combatRoster';
import { useDataStore, useGalStore } from './store';
import { useStatChangeStore } from './statChangeStore';
import { append_wild_journal_entry } from './wildJournal';

export type BattleEncounterSource = 'story' | 'wild';

export interface EncounterOffer {
  id: string;
  battle: GalBattleData;
  template: CombatEnemyTemplate;
  source: BattleEncounterSource;
  tier?: CombatEnemyTier;
}

export interface BattleRetrySnapshot {
  id: string;
  battle: GalBattleData;
  template: CombatEnemyTemplate;
  region: string;
  source: BattleEncounterSource;
  tier?: CombatEnemyTier;
}

export interface TryOfferEncounterOptions {
  source?: BattleEncounterSource;
  tier?: CombatEnemyTier;
}

const RESOLVED_ENCOUNTER_KEY = 'gal_resolved_encounters';

function read_resolved_encounter_ids(): string[] {
  const raw = _.get(getVariables({ type: 'chat' }), RESOLVED_ENCOUNTER_KEY, []);
  return Array.isArray(raw) ? raw.filter(id => typeof id === 'string') : [];
}

function save_resolved_encounter_ids(ids: string[]) {
  replaceVariables(klona({ ...getVariables({ type: 'chat' }), [RESOLVED_ENCOUNTER_KEY]: ids }), {
    type: 'chat',
  });
}

export const useCombatStore = defineStore('gal_combat', () => {
  const active = ref(false);
  const phase = ref<CombatPhase>('idle');
  const region_name = ref('');
  const round = ref(1);
  const roll_count = ref(3);
  const rolling = ref(false);
  const strike_busy = ref(false);
  const encounter_offer = ref<EncounterOffer | null>(null);
  const resolved_encounter_ids = ref<string[]>(read_resolved_encounter_ids());

  const player = ref<CombatFighter | null>(null);
  const enemy = ref<CombatFighter | null>(null);
  const player_hp = ref(0);
  const enemy_hp = ref(0);
  const player_max_hp = ref(0);
  const enemy_max_hp = ref(0);

  const player_dice = ref<number[]>([]);
  const enemy_dice = ref<number[]>([]);
  const player_sum = ref(0);
  const enemy_sum = ref(0);
  const initiative = ref<CombatSide>('player');
  const pending_attacks = ref<Omit<CombatAttack, 'index' | 'target_hp_after' | 'log'>[]>([]);
  const attack_index = ref(0);
  const log_lines = ref<string[]>([]);
  const last_attack = ref<CombatAttack | null>(null);
  const player_hp_start = ref(0);
  const battle_result = ref<BattleResultSummary | null>(null);
  const submitting_result = ref(false);
  const fleeing = ref(false);
  const active_battle_source = ref<BattleEncounterSource>('story');
  const active_battle_tier = ref<RewardTier | undefined>(undefined);
  const retry_snapshot = ref<BattleRetrySnapshot | null>(null);

  const can_roll = computed(
    () => active.value && phase.value === 'pick_rolls' && !rolling.value && !strike_busy.value,
  );

  const can_strike = computed(
    () =>
      active.value &&
      phase.value === 'fighting' &&
      !rolling.value &&
      !strike_busy.value &&
      attack_index.value < pending_attacks.value.length,
  );

  const attacks_remaining = computed(() =>
    Math.max(pending_attacks.value.length - attack_index.value, 0),
  );

  const initiative_text = computed(() => {
    if (!player_dice.value.length) return '';
    const first = initiative.value === 'player' ? player.value?.name : enemy.value?.name;
    const reason =
      player_sum.value === enemy_sum.value
        ? `（总和相同，${first} 智慧更高）`
        : '';
    return `${first} 先手 ${reason}`;
  });

  const has_encounter_offer = computed(() => encounter_offer.value !== null);
  const show_battle_result = computed(() => battle_result.value !== null);
  const is_wild_battle = computed(
    () => active_battle_source.value === 'wild' || encounter_offer.value?.source === 'wild',
  );
  const can_retry_battle = computed(() => battle_result.value !== null && !battle_result.value.victory && retry_snapshot.value !== null);

  function is_encounter_resolved(id: string) {
    return resolved_encounter_ids.value.includes(id);
  }

  function mark_encounter_resolved(id: string) {
    if (resolved_encounter_ids.value.includes(id)) return;
    resolved_encounter_ids.value = [...resolved_encounter_ids.value, id];
    save_resolved_encounter_ids(resolved_encounter_ids.value);
  }

  function refresh_resolved_encounters() {
    resolved_encounter_ids.value = read_resolved_encounter_ids();
  }

  function try_offer_encounter(id: string, battle: GalBattleData, options?: TryOfferEncounterOptions) {
    if (active.value) return;
    const source = options?.source ?? 'story';
    if (source === 'story' && is_encounter_resolved(id)) {
      if (encounter_offer.value?.id === id) encounter_offer.value = null;
      return;
    }
    if (encounter_offer.value?.id === id) return;

    encounter_offer.value = {
      id,
      battle,
      template: battle_data_to_template(battle),
      source,
      tier: options?.tier,
    };
    console.info('[战斗] 遭遇战提示', { id, enemy: battle.name, source });
  }

  function clear_encounter_offer() {
    encounter_offer.value = null;
  }

  function accept_encounter() {
    const offer = encounter_offer.value;
    if (!offer || active.value) return;

    retry_snapshot.value = {
      id: offer.id,
      battle: offer.battle,
      template: offer.template,
      region: offer.battle.region || '未知',
      source: offer.source,
      tier: offer.tier,
    };
    encounter_offer.value = null;
    active_battle_source.value = offer.source;
    active_battle_tier.value = offer.tier;
    if (offer.source === 'wild') {
      const data = useDataStore();
      append_wild_journal_entry(
        {
          kind: 'encounter',
          region: offer.battle.region || '未知',
          foe_name: offer.battle.name,
          foe_level: offer.battle.level,
          tier: offer.tier,
        },
        data.data.主角.等级,
      );
    }
    start_battle(offer.template, offer.battle.region || '未知');
  }

  async function flee_encounter() {
    const offer = encounter_offer.value;
    if (!offer || fleeing.value) return;

    fleeing.value = true;
    const foe_name = offer.battle.name;

    if (offer.source === 'story') {
      mark_encounter_resolved(offer.id);
    }
    encounter_offer.value = null;

    try {
      if (offer.source === 'wild') {
        const data = useDataStore();
        append_wild_journal_entry(
          {
            kind: 'flee_encounter',
            region: offer.battle.region || '未知',
            foe_name: offer.battle.name,
            foe_level: offer.battle.level,
            tier: offer.tier,
          },
          data.data.主角.等级,
        );
        toastr.info(`未与 ${foe_name} 交战`);
        return;
      }

      const data = useDataStore();
      const hero = data.data.主角;
      const prompt = build_battle_flee_prompt({
        hero_name: hero.姓名 || '主角',
        foe_name,
        foe_level: offer.battle.level,
        region: offer.battle.region || '未知',
        desc: offer.battle.desc,
        phase: 'encounter',
      });
      await useGalStore().sendToAi(prompt);
      toastr.success(`已从 ${foe_name} 处撤退，剧情推进中…`);
    } catch (error) {
      console.error('[战斗] 撤退叙事发送失败', error);
      toastr.error(error instanceof Error ? error.message : '撤退失败，请重试');
    } finally {
      fleeing.value = false;
    }
  }

  function push_log(line: string) {
    log_lines.value = [...log_lines.value, line];
  }

  function start_battle(enemy_template: CombatEnemyTemplate, region: string) {
    const data = useDataStore();
    const hero = data.data.主角;
    const hero_fighter = fighter_from_hero(hero);
    const foe = fighter_from_template(enemy_template);

    const combat_max = combat_max_hp_for_player(hero);
    const foe_combat_max = combat_max_hp_for_enemy(foe);

    player.value = hero_fighter;
    enemy.value = foe;
    player_max_hp.value = combat_max;
    player_hp.value = combat_max;
    player_hp_start.value = combat_max;
    enemy_max_hp.value = foe_combat_max;
    enemy_hp.value = foe_combat_max;

    region_name.value = region;
    round.value = 1;
    roll_count.value = 3;
    player_dice.value = [];
    enemy_dice.value = [];
    pending_attacks.value = [];
    attack_index.value = 0;
    last_attack.value = null;
    log_lines.value = [];
    active.value = true;
    phase.value = 'pick_rolls';
    rolling.value = false;
    strike_busy.value = false;

    push_log(`第 ${round.value} 轮 — 遭遇 ${foe.name}（Lv.${foe.level}）`);
    console.info('[战斗] 开始', { region, enemy: foe.name });
  }

  function select_roll_count(count: number) {
    if (phase.value !== 'pick_rolls' || rolling.value) return;
    roll_count.value = _.clamp(count, COMBAT_ROLL_MIN, COMBAT_ROLL_MAX);
  }

  async function roll_and_prepare() {
    if (!can_roll.value || !player.value || !enemy.value) return;

    rolling.value = true;
    phase.value = 'rolling';

    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 520);
    });

    const count = roll_count.value;
    const p_dice = roll_dice(count);
    const e_dice = roll_dice(count);
    const p_sum = _.sum(p_dice);
    const e_sum = _.sum(e_dice);
    const first = resolve_initiative(player.value, enemy.value, p_sum, e_sum);

    player_dice.value = p_dice;
    enemy_dice.value = e_dice;
    player_sum.value = p_sum;
    enemy_sum.value = e_sum;
    initiative.value = first;
    pending_attacks.value = build_attack_queue(first, player.value, enemy.value, p_dice, e_dice);
    attack_index.value = 0;
    last_attack.value = null;

    push_log(
      `投掷 ${count} 次：你 [${p_dice.join(', ')}]=${p_sum}，${enemy.value.name} [${e_dice.join(', ')}]=${e_sum}`,
    );
    push_log(initiative_text.value);

    rolling.value = false;
    phase.value = 'fighting';
  }

  function peek_next_attack(): Omit<CombatAttack, 'index' | 'target_hp_after' | 'log'> | null {
    if (!can_strike.value) return null;
    return pending_attacks.value[attack_index.value] ?? null;
  }

  function confirm_strike(): CombatAttack | null {
    if (phase.value !== 'fighting' || !player.value || !enemy.value) return null;
    if (attack_index.value >= pending_attacks.value.length) return null;

    const raw = pending_attacks.value[attack_index.value];
    if (!raw) return null;

    let log = '';
    let target_hp_after = 0;

    if (raw.attacker === 'player') {
      enemy_hp.value = Math.max(0, enemy_hp.value - raw.damage);
      target_hp_after = enemy_hp.value;
      log = `你掷 ${raw.dice} → 造成 ${raw.damage} 伤害，${enemy.value.name} 剩余 ${enemy_hp.value}`;
    } else {
      player_hp.value = Math.max(0, player_hp.value - raw.damage);
      target_hp_after = player_hp.value;
      log = `${enemy.value.name} 掷 ${raw.dice} → 造成 ${raw.damage} 伤害，你剩余 ${player_hp.value}`;
    }

    const attack: CombatAttack = {
      ...raw,
      index: attack_index.value,
      target_hp_after,
      log,
    };

    attack_index.value += 1;
    last_attack.value = attack;
    push_log(log);

    if (enemy_hp.value <= 0) {
      phase.value = 'victory';
      void finish_battle(true);
      return attack;
    }

    if (player_hp.value <= 0) {
      phase.value = 'defeat';
      void finish_battle(false);
      return attack;
    }

    if (attack_index.value >= pending_attacks.value.length) {
      phase.value = 'round_end';
      round.value += 1;
      push_log(`第 ${round.value - 1} 轮结束，双方仍存活。`);
      window.setTimeout(() => {
        if (phase.value !== 'round_end') return;
        player_dice.value = [];
        enemy_dice.value = [];
        pending_attacks.value = [];
        attack_index.value = 0;
        phase.value = 'pick_rolls';
        push_log(`第 ${round.value} 轮 — 请选择投掷次数并掷骰。`);
      }, 600);
    }

    return attack;
  }

  function open_battle_result(victory: boolean) {
    const data = useDataStore();
    const hero_name = data.data.主角.姓名;
    const sheet_hp = data.data.主角.能力.生命;
    const foe = enemy.value;
    if (!foe) return;

    const summary: BattleResultSummary = {
      victory,
      hero_name,
      foe_name: foe.name,
      foe_level: foe.level,
      region: region_name.value,
      rounds: round.value,
      sheet_hp,
      battle_hp_start: player_hp_start.value,
      battle_hp_end: player_hp.value,
      battle_hp_max: player_max_hp.value,
      log_lines: [...log_lines.value],
    };

    if (!victory) {
      summary.log_lines.push(`战败！可使用传送宝石撤离，或重新挑战 ${foe.name}。`);
    } else {
      summary.log_lines.push(`胜利！击败了 ${foe.name}。`);
    }

    battle_result.value = summary;
    phase.value = 'result';
    console.info('[战斗] 结算对话框', { victory, foe: foe.name });
  }

  async function finish_battle(victory: boolean) {
    open_battle_result(victory);
  }

  function settle_wild_battle_result(result: BattleResultSummary) {
    const data = useDataStore();
    if (result.victory) {
      const reward = apply_battle_victory_rewards(data.data.主角, {
        foe_level: result.foe_level,
        tier: active_battle_tier.value,
        player_level: data.data.主角.等级,
      });
      append_wild_journal_entry(
        {
          kind: 'victory',
          region: result.region,
          foe_name: result.foe_name,
          foe_level: result.foe_level,
          tier: active_battle_tier.value,
          exp: reward.exp,
          gold: reward.gold,
          levels_gained: reward.levels_gained,
          player_level_after: data.data.主角.等级,
          rounds: result.rounds,
        },
        data.data.主角.等级,
      );
      useStatChangeStore().ingest(klona(data.data));
      toastr.success(`野外胜利：${reward.lines.join('，')}`);
    }

    battle_result.value = null;
    retry_snapshot.value = null;
    reset_battle();
  }

  async function confirm_defeat_leave() {
    const result = battle_result.value;
    const snap = retry_snapshot.value;
    if (!result || result.victory || submitting_result.value) return;

    submitting_result.value = true;
    const data = useDataStore();

    try {
      if (snap?.source === 'wild') {
        append_wild_journal_entry(
          {
            kind: 'defeat_retreat',
            region: result.region,
            foe_name: result.foe_name,
            foe_level: result.foe_level,
            tier: snap.tier,
            rounds: result.rounds,
          },
          data.data.主角.等级,
        );
        battle_result.value = null;
        retry_snapshot.value = null;
        reset_battle();
        toastr.info('已撤离；点击「总结遇敌经历」同步给 AI');
        return;
      }

      if (snap?.source === 'story' && snap.id) {
        mark_encounter_resolved(snap.id);
      }

      await injectLocalDefeatNarrative(build_local_defeat_gal(result), data.data.主角);

      battle_result.value = null;
      retry_snapshot.value = null;
      reset_battle();

      const gal = useGalStore();
      if (snap?.source === 'story') {
        gal.advancePastBattle();
      }
      gal.refreshFromGameplayMessage();
      data.syncFromVariables();
      useStatChangeStore().ingest(klona(data.data));
      toastr.info('已使用传送宝石撤离');
    } catch (error) {
      console.error('[战斗] 战败撤离失败', error);
      toastr.error(error instanceof Error ? error.message : '战败撤离失败，请重试');
    } finally {
      submitting_result.value = false;
    }
  }

  function retry_battle() {
    const snap = retry_snapshot.value;
    if (!snap || !battle_result.value || battle_result.value.victory || submitting_result.value) return;

    if (snap.source === 'wild') {
      const data = useDataStore();
      append_wild_journal_entry(
        {
          kind: 'retry',
          region: snap.region,
          foe_name: snap.template.name,
          foe_level: snap.template.level,
          tier: snap.tier,
        },
        data.data.主角.等级,
      );
    }

    battle_result.value = null;
    active_battle_source.value = snap.source;
    active_battle_tier.value = snap.tier;
    start_battle(snap.template, snap.region);
    toastr.info(`重新挑战 ${snap.template.name}`);
  }

  async function confirm_battle_result() {
    const result = battle_result.value;
    if (!result || submitting_result.value) return;

    if (!result.victory) {
      await confirm_defeat_leave();
      return;
    }

    submitting_result.value = true;
    const data = useDataStore();
    const snap = retry_snapshot.value;

    try {
      if (active_battle_source.value === 'wild') {
        settle_wild_battle_result(result);
        return;
      }

      if (snap?.source === 'story' && snap.id) {
        mark_encounter_resolved(snap.id);
      }

      await sendBattleSettlementMessage(build_battle_settlement_prompt(result), data.data.主角);

      battle_result.value = null;
      retry_snapshot.value = null;
      reset_battle();

      const gal = useGalStore();
      gal.advancePastBattle();
      gal.refreshFromGameplayMessage();
      data.syncFromVariables();
      toastr.success('战斗胜利，剧情已更新');
    } catch (error) {
      console.error('[战斗] 结算发送失败', error);
      const message = error instanceof Error ? error.message : '发送战斗结果失败，请重试';
      toastr.error(message);
    } finally {
      submitting_result.value = false;
    }
  }

  function reset_battle() {
    active.value = false;
    phase.value = 'idle';
    rolling.value = false;
    strike_busy.value = false;
    player.value = null;
    enemy.value = null;
    pending_attacks.value = [];
    attack_index.value = 0;
    last_attack.value = null;
    player_hp_start.value = 0;
    battle_result.value = null;
    active_battle_source.value = 'story';
    active_battle_tier.value = undefined;
  }

  async function flee_battle() {
    if (!active.value || fleeing.value) return;

    const data = useDataStore();
    const hero = data.data.主角;
    const foe = enemy.value;
    if (!foe) return;

    fleeing.value = true;
    const is_wild = active_battle_source.value === 'wild';
    const hp_current = player_hp.value;
    const hp_max = player_max_hp.value;
    const log_copy = [...log_lines.value];
    const flee_region = region_name.value || '未知';
    const flee_tier = active_battle_tier.value;

    reset_battle();

    try {
      if (is_wild) {
        append_wild_journal_entry(
          {
            kind: 'flee_battle',
            region: flee_region,
            foe_name: foe.name,
            foe_level: foe.level,
            tier: flee_tier,
          },
          hero.等级,
        );
        toastr.info(`已脱离与 ${foe.name} 的战斗`);
        return;
      }

      const prompt = build_battle_flee_prompt({
        hero_name: hero.姓名 || '主角',
        foe_name: foe.name,
        foe_level: foe.level,
        region: region_name.value || '未知',
        hp_current,
        hp_max,
        log_lines: log_copy,
        phase: 'combat',
      });
      await useGalStore().sendToAi(prompt);
      toastr.success('已撤退，剧情推进中…');
    } catch (error) {
      console.error('[战斗] 撤退叙事发送失败', error);
      toastr.error(error instanceof Error ? error.message : '撤退失败，请重试');
    } finally {
      fleeing.value = false;
    }
  }

  function release_strike_busy() {
    strike_busy.value = false;
  }

  return {
    active,
    phase,
    region_name,
    round,
    roll_count,
    rolling,
    strike_busy,
    player,
    enemy,
    player_hp,
    enemy_hp,
    player_max_hp,
    enemy_max_hp,
    player_dice,
    enemy_dice,
    player_sum,
    enemy_sum,
    initiative,
    pending_attacks,
    attack_index,
    log_lines,
    last_attack,
    battle_result,
    submitting_result,
    fleeing,
    show_battle_result,
    can_roll,
    can_strike,
    attacks_remaining,
    initiative_text,
    encounter_offer,
    has_encounter_offer,
    is_wild_battle,
    can_retry_battle,
    active_battle_source,
    try_offer_encounter,
    refresh_resolved_encounters,
    is_encounter_resolved,
    accept_encounter,
    flee_encounter,
    clear_encounter_offer,
    start_battle,
    select_roll_count,
    roll_and_prepare,
    peek_next_attack,
    confirm_strike,
    confirm_battle_result,
    confirm_defeat_leave,
    retry_battle,
    flee_battle,
    reset_battle,
    release_strike_busy,
  };
});

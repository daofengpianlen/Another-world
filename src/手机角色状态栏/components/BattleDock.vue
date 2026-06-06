<template>
  <section class="battle-dock" :class="{ 'battle-dock--encounter': combat.has_encounter_offer }">
    <div class="battle-dock__head">
      <span class="battle-dock__title"><i class="fa-solid fa-dice"></i> 战斗 / 骰子</span>
      <span v-if="!combat.active && !combat.has_encounter_offer" class="battle-dock__hp-tag">
        <i class="fa-solid fa-heart"></i>{{ hero_hp_text }}
      </span>
      <button
        v-if="combat.active && !combat.show_battle_result && combat.phase !== 'victory' && combat.phase !== 'defeat'"
        class="battle-dock__flee gal-btn gal-btn--pill"
        type="button"
        :disabled="combat.fleeing || gal.sending"
        @click="combat.flee_battle()"
      >
        {{ combat.fleeing || gal.sending ? '撤退中…' : '撤退' }}
      </button>
    </div>

    <div v-if="combat.has_encounter_offer && encounter" class="battle-dock__encounter">
      <div class="battle-dock__encounter-top">
        <div class="battle-dock__encounter-meta">
          <strong class="battle-dock__boss-name">{{ encounter.battle.name }}</strong>
          <span class="gal-badge gal-badge--sm">Lv.{{ encounter.battle.level }}</span>
        </div>
        <p v-if="encounter.battle.desc" class="battle-dock__encounter-desc">{{ encounter.battle.desc }}</p>
        <div class="battle-dock__boss-stats">
          <span><i class="fa-solid fa-heart"></i>{{ encounter.battle.能力.生命 }}</span>
          <span><i class="fa-solid fa-hand-fist"></i>{{ encounter.battle.能力.力量 }}</span>
          <span><i class="fa-solid fa-shield-halved"></i>{{ encounter.battle.能力.体魄 }}</span>
          <span><i class="fa-solid fa-brain"></i>{{ encounter.battle.能力.智慧 }}</span>
        </div>
      </div>
      <div class="battle-dock__encounter-actions">
        <button
          class="gal-btn gal-btn--pill gal-btn--sm"
          type="button"
          :disabled="combat.fleeing || gal.sending"
          @click="combat.flee_encounter()"
        >
          <i :class="combat.fleeing || gal.sending ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-person-running'"></i>
          {{ combat.fleeing || gal.sending ? '撤退中…' : '撤退' }}
        </button>
        <button
          class="gal-btn gal-btn--primary gal-btn--pill gal-btn--sm"
          type="button"
          :disabled="combat.fleeing || gal.sending"
          @click="combat.accept_encounter()"
        >
          <i class="fa-solid fa-khanda"></i>
          战斗
        </button>
      </div>
      <div class="battle-dock__encounter-dice">
        <FloatingDice compact />
      </div>
    </div>

    <template v-else-if="combat.show_battle_result">
      <p class="battle-dock__result-hint">战斗已结束，请在上方窗口结算并继续剧情</p>
    </template>

    <template v-else-if="combat.active">
      <div class="battle-dock__hp">
        <div class="hp-row hp-row--player">
          <span>{{ combat.player?.name ?? '你' }}</span>
          <div class="hp-bar">
            <div class="hp-bar__fill hp-bar__fill--player" :style="{ width: `${player_hp_pct}%` }"></div>
          </div>
          <strong>{{ combat.player_hp }}/{{ combat.player_max_hp }}</strong>
        </div>
        <div class="hp-row hp-row--enemy">
          <span>{{ combat.enemy?.name ?? '敌' }}</span>
          <div class="hp-bar">
            <div class="hp-bar__fill hp-bar__fill--enemy" :style="{ width: `${enemy_hp_pct}%` }"></div>
          </div>
          <strong>{{ combat.enemy_hp }}/{{ combat.enemy_max_hp }}</strong>
        </div>
      </div>

      <div v-if="combat.phase === 'pick_rolls'" class="battle-dock__pick">
        <div class="battle-dock__pick-row">
          <span class="battle-dock__hint">R{{ combat.round }}</span>
          <div class="battle-dock__counts">
            <button
              v-for="n in roll_options"
              :key="n"
              class="battle-dock__count gal-btn"
              :class="{ 'battle-dock__count--active': combat.roll_count === n }"
              type="button"
              @click="combat.select_roll_count(n)"
            >
              {{ n }}
            </button>
          </div>
          <button
            class="battle-dock__roll gal-btn gal-btn--primary gal-btn--pill gal-btn--sm"
            type="button"
            :disabled="!combat.can_roll"
            @click="combat.roll_and_prepare()"
          >
            <i :class="combat.rolling ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-dice-d20'"></i>
          </button>
        </div>
      </div>

      <div v-else-if="combat.player_dice.length" class="battle-dock__dice-result">
        <div class="dice-line">
          <span>你</span>
          <div class="dice-group">
            <span
              v-for="(value, idx) in combat.player_dice"
              :key="`p-${idx}`"
              class="dice-face dice-face--player"
              :class="{ 'dice-face--rolling': combat.rolling }"
            >
              {{ value }}
            </span>
          </div>
          <em>{{ combat.player_sum }}</em>
        </div>
        <div class="dice-line">
          <span>{{ combat.enemy?.name ?? '敌' }}</span>
          <div class="dice-group">
            <span
              v-for="(value, idx) in combat.enemy_dice"
              :key="`e-${idx}`"
              class="dice-face dice-face--enemy"
              :class="{ 'dice-face--rolling': combat.rolling }"
            >
              {{ value }}
            </span>
          </div>
          <em>{{ combat.enemy_sum }}</em>
        </div>
        <p v-if="combat.initiative_text" class="battle-dock__initiative">{{ combat.initiative_text }}</p>
        <p v-if="combat.phase === 'fighting'" class="battle-dock__strike-hint">
          剩 {{ combat.attacks_remaining }} 击 · 点左侧演场
        </p>
      </div>

      <div ref="log_ref" class="battle-dock__log gal-panel-scroll">
        <p v-for="(line, idx) in combat.log_lines" :key="idx">{{ line }}</p>
      </div>
    </template>

    <div v-else class="battle-dock__idle">
      <FloatingDice compact />
    </div>
  </section>
</template>

<script setup lang="ts">
import { COMBAT_ROLL_MAX, COMBAT_ROLL_MIN } from '../combat';
import { useCombatStore } from '../combatStore';
import { useDataStore, useGalStore } from '../store';
import FloatingDice from './FloatingDice.vue';

const combat = useCombatStore();
const data = useDataStore();
const gal = useGalStore();
const log_ref = ref<HTMLElement | null>(null);

const encounter = computed(() => combat.encounter_offer);
const hero_hp_text = computed(() => String(data.data.主角.能力.生命));
const roll_options = computed(() => _.range(COMBAT_ROLL_MIN, COMBAT_ROLL_MAX + 1));

const player_hp_pct = computed(() => {
  if (!combat.player_max_hp) return 0;
  return _.clamp((combat.player_hp / combat.player_max_hp) * 100, 0, 100);
});

const enemy_hp_pct = computed(() => {
  if (!combat.enemy_max_hp) return 0;
  return _.clamp((combat.enemy_hp / combat.enemy_max_hp) * 100, 0, 100);
});

watch(
  () => combat.log_lines.length,
  () => {
    nextTick(() => {
      const el = log_ref.value;
      if (el) el.scrollTop = el.scrollHeight;
    });
  },
);
</script>

<style lang="scss" scoped>
.battle-dock {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  background: linear-gradient(180deg, rgba(12, 18, 34, 0.98) 0%, rgba(8, 12, 24, 0.95) 100%);
  overflow: hidden;
}

.battle-dock--encounter {
  gap: 5px;
}

.battle-dock__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-shrink: 0;
  min-height: 18px;
}

.battle-dock__title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gal-text-muted);

  i {
    margin-right: 3px;
    color: var(--gal-pink);
  }
}

.battle-dock__hp-tag {
  font-size: 9px;
  color: var(--gal-text-muted);
  font-variant-numeric: tabular-nums;

  i {
    margin-right: 3px;
    color: var(--gal-pink);
    font-size: 8px;
  }
}

.battle-dock__flee {
  padding: 1px 8px;
  font-size: 9px;
}

.battle-dock__encounter {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: space-between;
}

.battle-dock__encounter-top {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 0;
}

.battle-dock__encounter-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.battle-dock__boss-name {
  font-size: 13px;
  line-height: 1.2;
  color: var(--gal-pink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.battle-dock__encounter-desc {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--gal-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.battle-dock__boss-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  font-size: 9px;
  color: var(--gal-text-muted);

  span {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 2px 0;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
  }

  i {
    font-size: 8px;
    color: var(--gal-blue);
  }
}

.battle-dock__encounter-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  flex-shrink: 0;

  .gal-btn {
    justify-content: center;
    min-height: 28px;
    font-size: 11px;
    font-weight: 700;
  }
}

.battle-dock__encounter-dice {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  pointer-events: none;
}

.battle-dock__idle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
}

.battle-dock__result-hint {
  flex: 1;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 6px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--gal-text-muted);
}

.battle-dock__hp {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}

.hp-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.2fr auto;
  align-items: center;
  gap: 4px;
  font-size: 9px;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--gal-text-muted);
    font-weight: 700;
  }

  strong {
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
}

.hp-bar {
  height: 4px;
  border-radius: var(--gal-radius-pill);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.hp-bar__fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.35s ease;

  &--player {
    background: linear-gradient(90deg, var(--gal-blue), var(--gal-violet));
  }

  &--enemy {
    background: linear-gradient(90deg, var(--gal-pink-deep), var(--gal-danger));
  }
}

.battle-dock__pick {
  flex-shrink: 0;
}

.battle-dock__pick-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.battle-dock__hint {
  flex-shrink: 0;
  font-size: 9px;
  color: var(--gal-text-muted);
  font-weight: 700;
}

.battle-dock__counts {
  display: flex;
  flex: 1;
  gap: 3px;
}

.battle-dock__count {
  flex: 1;
  padding: 4px 0;
  font-size: 10px;
  font-weight: 700;

  &--active {
    border-color: transparent;
    background: var(--gal-gradient-primary);
    color: #fff;
  }
}

.battle-dock__roll {
  flex-shrink: 0;
  width: 32px;
  min-width: 32px;
  padding: 4px 0;
  font-size: 11px;
}

.battle-dock__dice-result {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}

.dice-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.2fr auto;
  align-items: center;
  gap: 3px;
  font-size: 9px;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--gal-text-muted);
    font-weight: 700;
  }

  em {
    font-style: normal;
    font-weight: 700;
    color: var(--gal-gold);
  }
}

.dice-group {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.dice-face {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  border: 1px solid var(--gal-border);

  &--player {
    background: var(--gal-blue-soft);
    color: var(--gal-blue);
  }

  &--enemy {
    background: var(--gal-pink-soft);
    color: var(--gal-pink);
  }

  &--rolling {
    animation: dice-wobble 0.45s ease-in-out infinite;
  }
}

.battle-dock__initiative {
  margin: 0;
  font-size: 9px;
  color: var(--gal-violet);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.battle-dock__strike-hint {
  margin: 0;
  font-size: 9px;
  color: var(--gal-blue);
}

.battle-dock__log {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 6px;
  border-radius: var(--gal-radius-sm);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--gal-border);

  p {
    margin: 0 0 2px;
    font-size: 9px;
    line-height: 1.35;
    color: var(--gal-text-muted);

    &:last-child {
      margin-bottom: 0;
      color: var(--gal-text);
    }
  }
}

@keyframes dice-wobble {
  0%,
  100% {
    transform: rotate(-6deg) scale(1);
  }

  50% {
    transform: rotate(6deg) scale(1.06);
  }
}
</style>

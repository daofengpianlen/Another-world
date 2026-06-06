<template>
  <div
    class="battle-arena"
    :class="{
      'battle-arena--ready': combat.can_strike,
      'battle-arena--busy': combat.strike_busy,
      'battle-arena--encounter': combat.has_encounter_offer && !combat.active,
      'battle-arena--fighting': combat.active,
    }"
    @click="on_arena_click"
  >
    <div class="battle-arena__backdrop">
      <span v-for="n in 6" :key="n" class="battle-arena__spark" :style="spark_style(n)" aria-hidden="true"></span>
    </div>

    <p class="battle-arena__label">
      {{ combat.active ? `第 ${combat.round} 回合` : '遭遇战' }}
    </p>

    <div class="battle-arena__field">
      <div ref="player_ref" class="battle-arena__slot battle-arena__slot--player">
        <BattleFighterCard
          side="player"
          :name="player_name"
          :avatar_src="player_avatar"
          :level="player_level"
          :hp_text="player_hp_text"
          :pulse="combat.has_encounter_offer && !combat.active"
        />
      </div>

      <div ref="clash_ref" class="battle-arena__vs" aria-hidden="true">
        <span class="battle-arena__vs-text">VS</span>
      </div>

      <div ref="enemy_ref" class="battle-arena__slot battle-arena__slot--enemy">
        <BattleFighterCard
          side="enemy"
          :name="enemy_name"
          :avatar_src="enemy_avatar"
          :level="enemy_level"
          :hp_text="enemy_hp_text"
          :pulse="combat.has_encounter_offer && !combat.active"
        />
      </div>
    </div>

    <p v-if="encounter_desc && combat.has_encounter_offer && !combat.active" class="battle-arena__speech">
      {{ encounter_desc }}
    </p>

    <p v-else-if="combat.has_encounter_offer && !combat.active" class="battle-arena__hint battle-arena__hint--encounter">
      右下选择「战斗」或「撤退」
    </p>
    <p v-else-if="combat.can_strike" class="battle-arena__hint">点击演场 · 触发碰撞</p>
    <p v-else-if="combat.phase === 'pick_rolls'" class="battle-arena__hint battle-arena__hint--muted">
      请在右下选择骰子次数并掷骰
    </p>
    <p v-else-if="combat.phase === 'rolling'" class="battle-arena__hint battle-arena__hint--muted">掷骰中…</p>

    <transition name="damage-pop">
      <div
        v-if="damage_popup"
        class="battle-arena__damage"
        :class="damage_popup.attacker === 'player' ? 'battle-arena__damage--player' : 'battle-arena__damage--enemy'"
      >
        -{{ damage_popup.damage }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { resolveEnemyBattlePortrait, resolveHeroBattlePortrait } from '../battlePortrait';
import type { CombatSide } from '../combat';
import { useCombatStore } from '../combatStore';
import { useDataStore } from '../store';
import BattleFighterCard from './BattleFighterCard.vue';

const combat = useCombatStore();
const data = useDataStore();

const player_ref = ref<HTMLElement | null>(null);
const enemy_ref = ref<HTMLElement | null>(null);
const clash_ref = ref<HTMLElement | null>(null);
const damage_popup = ref<{ attacker: CombatSide; damage: number } | null>(null);

const hero = computed(() => data.data.主角);

const player_name = computed(() => {
  if (combat.active && combat.player) return combat.player.name;
  return hero.value.姓名 || '勇者';
});

const enemy_name = computed(() => {
  if (combat.active && combat.enemy) return combat.enemy.name;
  return combat.encounter_offer?.battle.name ?? '敌人';
});

const player_level = computed(() => {
  if (combat.active && combat.player) return combat.player.level;
  return hero.value.等级;
});

const enemy_level = computed(() => {
  if (combat.active && combat.enemy) return combat.enemy.level;
  return combat.encounter_offer?.battle.level ?? null;
});

const player_avatar = computed(() => resolveHeroBattlePortrait(hero.value));

const enemy_avatar = computed(() => resolveEnemyBattlePortrait(enemy_name.value));

const player_hp_text = computed(() => {
  if (!combat.active) return '';
  return `${combat.player_hp}/${combat.player_max_hp}`;
});

const enemy_hp_text = computed(() => {
  if (!combat.active) return '';
  return `${combat.enemy_hp}/${combat.enemy_max_hp}`;
});

const encounter_desc = computed(() => combat.encounter_offer?.battle.desc?.trim() ?? '');

function spark_style(n: number) {
  const left = 8 + ((n * 17) % 84);
  const top = 12 + ((n * 23) % 72);
  const delay = (n * 0.35).toFixed(2);
  return { left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` };
}

async function play_collision(attacker: CombatSide): Promise<void> {
  const player_el = player_ref.value;
  const enemy_el = enemy_ref.value;
  const clash_el = clash_ref.value;
  if (!player_el || !enemy_el) return;

  const tl = gsap.timeline();

  if (attacker === 'player') {
    tl.to(player_el, { x: 42, duration: 0.12, ease: 'power2.out' })
      .to(enemy_el, { x: -36, duration: 0.1, ease: 'power2.out' }, '<0.04')
      .to(clash_el, { scale: 1.35, opacity: 1, duration: 0.08 }, '-=0.04')
      .to([player_el, enemy_el], { x: 0, duration: 0.2, ease: 'power2.inOut' })
      .to(clash_el, { scale: 0.5, opacity: 0, duration: 0.18 }, '<');
  } else {
    tl.to(enemy_el, { x: -42, duration: 0.12, ease: 'power2.out' })
      .to(player_el, { x: 36, duration: 0.1, ease: 'power2.out' }, '<0.04')
      .to(clash_el, { scale: 1.35, opacity: 1, duration: 0.08 }, '-=0.04')
      .to([player_el, enemy_el], { x: 0, duration: 0.2, ease: 'power2.inOut' })
      .to(clash_el, { scale: 0.5, opacity: 0, duration: 0.18 }, '<');
  }

  await tl.then();
}

async function on_arena_click() {
  if (!combat.can_strike || combat.strike_busy) return;

  const next = combat.peek_next_attack();
  if (!next) return;

  combat.strike_busy = true;

  try {
    await play_collision(next.attacker);
    const result = combat.confirm_strike();
    if (result) {
      damage_popup.value = { attacker: result.attacker, damage: result.damage };
      window.setTimeout(() => {
        damage_popup.value = null;
      }, 700);
    }
  } finally {
    combat.release_strike_busy();
  }
}
</script>

<style lang="scss" scoped>
.battle-arena {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 12px 12px;
  border-radius: var(--gal-radius-md);
  overflow: hidden;
  cursor: default;
  user-select: none;

  &--ready {
    cursor: pointer;
  }
}

.battle-arena__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.22) 0%, transparent 42%),
    radial-gradient(circle at 80% 70%, rgba(244, 114, 182, 0.2) 0%, transparent 45%),
    linear-gradient(165deg, rgba(8, 12, 26, 0.94) 0%, rgba(26, 16, 48, 0.9) 100%);
  backdrop-filter: blur(8px);
}

.battle-arena__spark {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(252, 211, 77, 0.85);
  box-shadow: 0 0 10px rgba(252, 211, 77, 0.6);
  animation: spark-twinkle 2.4s ease-in-out infinite;
  opacity: 0.55;
}

.battle-arena__label {
  position: relative;
  z-index: 1;
  margin: 0 0 6px;
  font-size: 10px;
  letter-spacing: 0.14em;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.55);
}

.battle-arena__field {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 320px;
  min-height: 108px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  padding: 0 4px;
}

.battle-arena__slot {
  flex: 1;
  display: flex;
  justify-content: center;
  will-change: transform;

  &--player {
    justify-content: flex-start;
  }

  &--enemy {
    justify-content: flex-end;
  }
}

.battle-arena__vs {
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%) scale(0.85);
  opacity: 0.75;
  pointer-events: none;

  &-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    color: var(--gal-gold);
    background: rgba(8, 12, 24, 0.72);
    border: 1px solid rgba(252, 211, 77, 0.45);
    box-shadow: 0 0 18px rgba(252, 211, 77, 0.25);
  }
}

.battle-arena--fighting .battle-arena__vs {
  opacity: 0.35;
}

.battle-arena__speech {
  position: relative;
  z-index: 1;
  margin: 8px 0 0;
  max-width: 92%;
  padding: 8px 12px;
  border-radius: var(--gal-radius-md);
  font-size: 11px;
  line-height: 1.45;
  color: #f1f5f9;
  text-align: center;
  background: rgba(8, 12, 24, 0.72);
  border: 1px solid rgba(244, 114, 182, 0.35);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.battle-arena__hint {
  position: relative;
  z-index: 1;
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--gal-blue);

  &--muted {
    color: var(--gal-text-muted);
  }

  &--encounter {
    color: var(--gal-gold);
    animation: hint-pulse 1.6s ease-in-out infinite;
  }
}

.battle-arena--ready .battle-arena__hint:not(.battle-arena__hint--encounter) {
  animation: hint-pulse 1.6s ease-in-out infinite;
}

.battle-arena__damage {
  position: absolute;
  z-index: 6;
  top: 38%;
  font-size: 24px;
  font-weight: 800;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
  pointer-events: none;

  &--player {
    right: 20%;
    color: var(--gal-gold);
  }

  &--enemy {
    left: 20%;
    color: var(--gal-danger);
  }
}

.damage-pop-enter-active,
.damage-pop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.45s ease;
}

.damage-pop-enter-from,
.damage-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.85);
}

@keyframes spark-twinkle {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes hint-pulse {
  0%,
  100% {
    opacity: 0.65;
  }

  50% {
    opacity: 1;
  }
}
</style>

<template>
  <div v-if="combat.battle_result" class="battle-result">
    <div class="battle-result__backdrop"></div>
    <div class="battle-result__card gal-card">
      <div class="battle-result__icon" :class="combat.battle_result.victory ? 'battle-result__icon--win' : 'battle-result__icon--lose'">
        <i :class="combat.battle_result.victory ? 'fa-solid fa-trophy' : 'fa-solid fa-heart-crack'"></i>
      </div>
      <h3 class="battle-result__title">
        {{ combat.battle_result.victory ? '战斗胜利' : '战斗失败' }}
      </h3>
      <p class="battle-result__subtitle">
        {{ combat.battle_result.foe_name }} · {{ combat.battle_result.region }}
      </p>
      <p class="battle-result__hp">
        战斗生命
        <strong>{{ combat.battle_result.battle_hp_end }} / {{ combat.battle_result.battle_hp_max }}</strong>
        <span v-if="combat.battle_result.battle_hp_end !== combat.battle_result.battle_hp_start">
          （开战 {{ combat.battle_result.battle_hp_start }}）
        </span>
      </p>
      <p class="battle-result__sheet-hp">
        MVU 生命 {{ combat.battle_result.sheet_hp }}（不受战斗扣血影响）
      </p>

      <div class="battle-result__log gal-panel-scroll">
        <p v-for="(line, idx) in combat.battle_result.log_lines" :key="idx">{{ line }}</p>
      </div>

      <div v-if="combat.battle_result.victory" class="battle-result__actions">
        <button
          class="battle-result__btn gal-btn gal-btn--primary gal-btn--pill"
          type="button"
          :disabled="combat.submitting_result"
          @click.stop="on_confirm_victory"
        >
          <i :class="combat.submitting_result ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-scroll'"></i>
          {{
            combat.submitting_result
              ? '处理中…'
              : combat.is_wild_battle
                ? '领取奖励'
                : '结算并继续剧情'
          }}
        </button>
      </div>

      <div v-else class="battle-result__actions battle-result__actions--defeat">
        <button
          class="battle-result__btn gal-btn gal-btn--pill battle-result__btn--retry"
          type="button"
          :disabled="combat.submitting_result || !combat.can_retry_battle"
          @click.stop="on_retry"
        >
          <i class="fa-solid fa-rotate-right"></i>
          重新挑战
        </button>
        <button
          class="battle-result__btn gal-btn gal-btn--primary gal-btn--pill"
          type="button"
          :disabled="combat.submitting_result"
          @click.stop="on_defeat_leave"
        >
          <i :class="combat.submitting_result ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-gem'"></i>
          {{ combat.submitting_result ? '处理中…' : '使用传送宝石离开' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCombatStore } from '../combatStore';

const combat = useCombatStore();

async function on_confirm_victory() {
  if (combat.submitting_result) return;
  await combat.confirm_battle_result();
}

async function on_defeat_leave() {
  if (combat.submitting_result) return;
  await combat.confirm_defeat_leave();
}

function on_retry() {
  if (combat.submitting_result) return;
  combat.retry_battle();
}
</script>

<style lang="scss" scoped>
.battle-result {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  pointer-events: auto;
}

.battle-result__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(6, 9, 18, 0.82);
  backdrop-filter: blur(6px);
  pointer-events: none;
}

.battle-result__card {
  position: relative;
  z-index: 1;
  pointer-events: auto;
  width: min(100%, 360px);
  max-height: min(88%, 420px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 16px 14px;
  text-align: center;
}

.battle-result__icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 22px;
  color: #fff;

  &--win {
    background: linear-gradient(135deg, #fbbf24, #f472b6);
    box-shadow: 0 8px 24px rgba(251, 191, 36, 0.35);
  }

  &--lose {
    background: linear-gradient(135deg, #64748b, #fb7185);
    box-shadow: 0 8px 24px rgba(100, 116, 139, 0.35);
  }
}

.battle-result__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--gal-text);
}

.battle-result__subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--gal-text-muted);
}

.battle-result__hp,
.battle-result__sheet-hp {
  margin: 0;
  font-size: 12px;
  color: var(--gal-text-muted);

  strong {
    color: var(--gal-blue);
    font-variant-numeric: tabular-nums;
  }

  span {
    font-size: 11px;
  }
}

.battle-result__sheet-hp {
  font-size: 11px;
  opacity: 0.85;
}

.battle-result__log {
  flex: 1;
  min-height: 80px;
  max-height: 180px;
  overflow-y: auto;
  text-align: left;
  padding: 8px 10px;
  border-radius: var(--gal-radius-sm);
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid var(--gal-border);

  p {
    margin: 0 0 4px;
    font-size: 10px;
    line-height: 1.45;
    color: var(--gal-text-muted);

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.battle-result__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;

  &--defeat {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

.battle-result__btn {
  flex: 1;
  min-width: 0;
  justify-content: center;

  &--retry {
    flex: 0 0 38%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--gal-border);
    color: var(--gal-text);

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
    }
  }
}
</style>

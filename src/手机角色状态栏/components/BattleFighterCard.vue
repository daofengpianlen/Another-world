<template>
  <div class="battle-fighter" :class="[`battle-fighter--${side}`, { 'battle-fighter--pulse': pulse }]">
    <div class="battle-fighter__frame">
      <div class="battle-fighter__ring">
        <PortraitCircle :src="avatar_src" :label="display_name" :size="avatar_size" :tone="portrait_tone" />
      </div>
      <div class="battle-fighter__name-badge">{{ display_name }}</div>
    </div>
    <div v-if="level != null" class="battle-fighter__level">Lv.{{ level }}</div>
    <div v-if="hp_text" class="battle-fighter__hp">{{ hp_text }}</div>
  </div>
</template>

<script setup lang="ts">
import PortraitCircle from './PortraitCircle.vue';

const props = withDefaults(
  defineProps<{
    side: 'player' | 'enemy';
    name: string;
    avatar_src?: string;
    level?: number | null;
    hp_text?: string;
    pulse?: boolean;
    avatar_size?: number;
  }>(),
  {
    avatar_src: '',
    level: null,
    hp_text: '',
    pulse: false,
    avatar_size: 62,
  },
);

const display_name = computed(() => props.name.trim() || (props.side === 'player' ? '勇者' : '敌人'));

const portrait_tone = computed(() => {
  if (props.side === 'player') return 'user' as const;
  return 'enemy' as const;
});
</script>

<style lang="scss" scoped>
.battle-fighter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 46%;

  &--pulse .battle-fighter__ring {
    animation: fighter-pulse 1.8s ease-in-out infinite;
  }
}

.battle-fighter__frame {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px 14px;
  border-radius: 18px;
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}

.battle-fighter--player .battle-fighter__frame {
  border-color: rgba(96, 165, 250, 0.45);
  box-shadow: 0 8px 28px rgba(59, 130, 246, 0.18);
}

.battle-fighter--enemy .battle-fighter__frame {
  border-color: rgba(244, 114, 182, 0.45);
  box-shadow: 0 8px 28px rgba(244, 114, 182, 0.16);
}

.battle-fighter__ring {
  flex-shrink: 0;
}

.battle-fighter__name-badge {
  position: absolute;
  left: 50%;
  bottom: -2px;
  transform: translateX(-50%);
  max-width: calc(100% + 12px);
  padding: 2px 10px;
  border-radius: var(--gal-radius-pill);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #f8fafc;
  background: rgba(8, 12, 24, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.battle-fighter--player .battle-fighter__name-badge {
  border-color: rgba(96, 165, 250, 0.55);
  color: #dbeafe;
}

.battle-fighter--enemy .battle-fighter__name-badge {
  border-color: rgba(244, 114, 182, 0.55);
  color: #fce7f3;
}

.battle-fighter__level {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--gal-gold);
}

.battle-fighter__hp {
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  color: var(--gal-text-muted);
}

@keyframes fighter-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.04);
  }
}
</style>

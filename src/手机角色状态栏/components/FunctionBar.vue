<template>
  <nav class="function-bar">
    <button
      v-for="item in items"
      :key="item.id"
      class="function-bar__btn"
      :class="{ 'function-bar__btn--active': modelValue === item.id }"
      type="button"
      @click="$emit('update:modelValue', item.id)"
    >
      <span class="function-bar__icon"><i :class="item.icon"></i></span>
      <span class="function-bar__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
export type PanelId = '主角状态' | '背包物品' | '地图' | '邂逅名录' | '回忆画廊';

defineProps<{
  modelValue: PanelId | null;
}>();

defineEmits<{
  'update:modelValue': [value: PanelId | null];
}>();

const items: { id: PanelId; label: string; icon: string }[] = [
  { id: '主角状态', label: '主角', icon: 'fa-solid fa-user-astronaut' },
  { id: '背包物品', label: '背包', icon: 'fa-solid fa-box-open' },
  { id: '地图', label: '地图', icon: 'fa-solid fa-map-location-dot' },
  { id: '邂逅名录', label: '邂逅', icon: 'fa-solid fa-heart' },
  { id: '回忆画廊', label: '画廊', icon: 'fa-solid fa-clapperboard' },
];
</script>

<style lang="scss" scoped>
.function-bar {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 6px 8px 4px;
  border-top: 1px solid var(--gal-border);
  background: linear-gradient(0deg, rgba(8, 12, 24, 0.95) 0%, rgba(255, 255, 255, 0.03) 100%);
  backdrop-filter: blur(12px);
}

.function-bar__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px;
  border: 1px solid transparent;
  border-radius: var(--gal-radius-sm);
  background: transparent;
  color: var(--gal-text-muted);
  font-size: 10px;
  cursor: pointer;
  transition: all var(--gal-transition);

  &:hover:not(.function-bar__btn--active) {
    color: var(--gal-text);
    background: var(--gal-glass);
    border-color: var(--gal-border);
  }

  &--active {
    color: #fff;
    border-color: transparent;
    background: var(--gal-gradient-primary);
    box-shadow: 0 4px 16px rgba(129, 140, 248, 0.35);

    .function-bar__icon {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.function-bar__icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--gal-glass);
  font-size: 13px;
  transition: background var(--gal-transition);
}

.function-bar__label {
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>

<template>
  <TransitionGroup name="stat-feed" tag="div" class="stat-feed" aria-live="polite">
    <div
      v-for="item in store.notices"
      :key="item.id"
      class="stat-feed__item"
      :class="item.kind === 'gain' ? 'stat-feed__item--gain' : 'stat-feed__item--loss'"
    >
      <i
        class="stat-feed__icon"
        :class="item.kind === 'gain' ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'"
      ></i>
      <span class="stat-feed__text">{{ item.text }}</span>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { useStatChangeStore } from '../statChangeStore';

const store = useStatChangeStore();
</script>

<style lang="scss" scoped>
.stat-feed {
  position: absolute;
  top: 30px;
  right: 6px;
  z-index: 18;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  max-width: min(52%, 200px);
  pointer-events: none;
}

.stat-feed__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: var(--gal-radius-pill);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  backdrop-filter: blur(10px);
  border: 1px solid transparent;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);

  &--gain {
    color: var(--gal-success);
    background: rgba(6, 24, 18, 0.88);
    border-color: rgba(52, 211, 153, 0.45);
  }

  &--loss {
    color: var(--gal-danger);
    background: rgba(28, 10, 16, 0.88);
    border-color: rgba(251, 113, 133, 0.45);
  }
}

.stat-feed__icon {
  font-size: 9px;
  opacity: 0.9;
  flex-shrink: 0;
}

.stat-feed__text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-feed-enter-active,
.stat-feed-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.32s ease;
}

.stat-feed-enter-from,
.stat-feed-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.stat-feed-move {
  transition: transform 0.28s ease;
}
</style>

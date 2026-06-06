<template>
  <div class="gal-stream-root">
    <OpeningScreen v-if="phase === 'opening'" />
    <div v-else class="game-root__playing">
    <App />
    <div v-if="show_loading" class="game-root__loading">
      <div class="game-root__loading-card">
        <div class="game-root__loading-ring">
          <i class="fa-solid fa-sparkles fa-spin-pulse"></i>
        </div>
        <p class="game-root__loading-title">正在编织剧情…</p>
        <p class="game-root__loading-hint">异世界的大门即将开启</p>
        <div class="game-root__loading-bar"><span></span></div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import App from './App.vue';
import OpeningScreen from './components/OpeningScreen.vue';
import { useCombatStore } from './combatStore';
import { useGalStore, useGamePhaseStore } from './store';

const phaseStore = useGamePhaseStore();
const gal = useGalStore();
const combat = useCombatStore();

const phase = computed(() => phaseStore.phase);

const show_loading = computed(
  () =>
    phaseStore.generating_opening ||
    (combat.submitting_result && !combat.show_battle_result) ||
    gal.sending ||
    combat.fleeing,
);

$(() => {
  phaseStore.syncPhase();
  eventOn(tavern_events.CHAT_CHANGED, () => phaseStore.syncPhase());
});
</script>

<style lang="scss" scoped>
.game-root__playing {
  position: relative;
  width: 100%;
}

.game-root__loading {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 9, 18, 0.88);
  backdrop-filter: blur(8px);
  border-radius: var(--gal-radius-lg);
}

.game-root__loading-card {
  text-align: center;
  padding: 32px 40px;
  border-radius: var(--gal-radius-lg);
  border: 1px solid var(--gal-border-strong);
  background: var(--gal-gradient-card);
  box-shadow: var(--gal-shadow-card);
  backdrop-filter: blur(12px);
  min-width: 240px;
}

.game-root__loading-ring {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--gal-gradient-primary);
  box-shadow: var(--gal-shadow-glow);

  i {
    font-size: 24px;
    color: #fff;
  }
}

.game-root__loading-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--gal-text);
}

.game-root__loading-hint {
  margin: 8px 0 16px;
  font-size: 12px;
  color: var(--gal-text-muted);
}

.game-root__loading-bar {
  height: 3px;
  border-radius: var(--gal-radius-pill);
  background: var(--gal-glass);
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    width: 40%;
    border-radius: inherit;
    background: var(--gal-gradient-primary);
    animation: loading-slide 1.2s ease-in-out infinite;
  }
}

@keyframes loading-slide {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(350%);
  }
}
</style>

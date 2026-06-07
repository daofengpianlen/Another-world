<template>
  <div class="gal-app">
      <div class="gal-shell__glow gal-shell__glow--pink" aria-hidden="true"></div>
      <div class="gal-shell__glow gal-shell__glow--blue" aria-hidden="true"></div>

      <TopBar :is_fullscreen="is_fullscreen" @toggle-fullscreen="toggle_fullscreen" />

      <BattleResultDialog />

      <div class="gal-body">
        <aside class="gal-left">
          <div class="gal-left__media">
            <div class="gal-left__media-stack">
              <MediaPanel />
              <StatChangeFeed />
              <BattleArena v-if="combat.active || combat.has_encounter_offer" />
            </div>
          </div>
          <div class="gal-left__dialogue">
            <DialoguePanel />
          </div>
          <div class="gal-left__input">
            <ChoicePanel />
          </div>
        </aside>

        <aside class="gal-right">
          <RightDisplay class="gal-right__panels" :active_panel="active_panel" />
          <FunctionBar v-model="active_panel" />
          <div class="gal-right__battle">
            <BattleDock />
          </div>
        </aside>
      </div>
  </div>
</template>

<script setup lang="ts">
import BattleResultDialog from './components/BattleResultDialog.vue';
import BattleArena from './components/BattleArena.vue';
import BattleDock from './components/BattleDock.vue';
import ChoicePanel from './components/ChoicePanel.vue';
import DialoguePanel from './components/DialoguePanel.vue';
import FunctionBar, { type PanelId } from './components/FunctionBar.vue';
import MediaPanel from './components/MediaPanel.vue';
import StatChangeFeed from './components/StatChangeFeed.vue';
import RightDisplay from './components/RightDisplay.vue';
import TopBar from './components/TopBar.vue';
import { GAL_FULLSCREEN_KEY } from './galFullscreenContext';
import { useCombatStore } from './combatStore';
import { useGalStore, useUiStore } from './store';

const active_panel = ref<PanelId | null>('主角状态');
const ui = useUiStore();
const gal = useGalStore();
const combat = useCombatStore();

const { is_fullscreen, toggle_fullscreen } = inject(GAL_FULLSCREEN_KEY)!;

watch(
  () => ui.navigate_to,
  () => {
    const target = ui.consume_navigation();
    if (target) active_panel.value = target;
  },
);
</script>

<style lang="scss" scoped>
.gal-app {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  color: var(--gal-text);
  --gal-topbar-h: 52px;
  --gal-body-h: 660px;
}

.gal-shell__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  pointer-events: none;
  opacity: 0.5;
  z-index: 0;

  &--pink {
    width: 220px;
    height: 220px;
    top: -60px;
    right: 10%;
    background: rgba(244, 114, 182, 0.28);
  }

  &--blue {
    width: 260px;
    height: 260px;
    bottom: 20%;
    left: -8%;
    background: rgba(96, 165, 250, 0.22);
  }
}

.gal-body {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.gal-left {
  flex: 1.1;
  min-width: 0;
  min-height: var(--gal-body-h);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-right: 1px solid var(--gal-border);
  background: rgba(14, 20, 36, 0.55);
  backdrop-filter: blur(8px);
}

.gal-left__media {
  flex-shrink: 0;
}

.gal-left__media-stack {
  position: relative;
  overflow: visible;
}

.gal-left__dialogue {
  flex: 0 0 auto;
  flex-shrink: 0;
}

.gal-left__input {
  flex-shrink: 0;
  margin-top: auto;
}

.gal-left__media :deep(.media-panel) {
  height: auto;
}

.gal-left__input :deep(.input-panel) {
  height: auto;
}

.gal-right {
  flex: 0.9;
  flex-shrink: 0;
  min-width: 0;
  height: var(--gal-body-h);
  max-height: var(--gal-body-h);
  display: flex;
  flex-direction: column;
  background: rgba(10, 14, 26, 0.65);
  overflow: hidden;
  align-self: flex-start;
  --gal-battle-dock-h: 172px;
}

.gal-right__panels {
  flex: 1;
  min-height: 0;
}

.gal-right__battle {
  flex: 0 0 var(--gal-battle-dock-h);
  min-height: var(--gal-battle-dock-h);
  max-height: var(--gal-battle-dock-h);
  overflow: hidden;
  border-top: 1px solid var(--gal-border);
}
</style>

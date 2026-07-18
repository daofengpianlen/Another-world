<template>
  <div
    ref="shell_ref"
    class="wuwa-unified-shell"
    :class="{ 'wuwa-unified-shell--fill': is_fullscreen || is_expanded }"
  >
    <OpeningPanel v-if="!game_started" embedded />
    <GameHub v-else embedded />
  </div>
</template>

<script setup lang="ts">
import { ensureWuWaSharedRegistered } from '../../shared/register';
import OpeningPanel from '../开场/OpeningPanel.vue';
import GameHub from './GameHub.vue';
import { useHubSettingsStore } from './hubSettingsStore';
import { resyncHubFrameFullscreenIfNeeded, syncHubFrameFullscreen, syncHubFrameSize } from './hubFrameSync';
import { chatHasWuwaGameStarted } from './messageScope';
import { WUWA_SHELL_FULLSCREEN_KEY } from './wuwaShellContext';
import { useWuwaShellFullscreen } from './wuwaShellFullscreen';

const hub_settings = useHubSettingsStore();
const game_started = ref(chatHasWuwaGameStarted());

function applyFrameLayout(fullscreen: boolean) {
  const layout = hub_settings.settings.layout;
  if (fullscreen) {
    syncHubFrameFullscreen(true, layout);
    return;
  }
  syncHubFrameSize(layout);
}

const shell_ref = ref<HTMLElement | null>(null);
const { is_fullscreen, is_expanded, toggle_fullscreen } = useWuwaShellFullscreen(shell_ref, {
  on_layout_change: applyFrameLayout,
});

provide(WUWA_SHELL_FULLSCREEN_KEY, { is_fullscreen, is_expanded, toggle_fullscreen });

function refreshGameStarted() {
  game_started.value = chatHasWuwaGameStarted();
}

watch([is_fullscreen, is_expanded], ([fs, exp]) => {
  applyFrameLayout(Boolean(fs || exp));
});

watch(
  () => hub_settings.settings.layout,
  layout => {
    if (is_fullscreen.value || is_expanded.value) {
      syncHubFrameFullscreen(true, layout);
      return;
    }
    syncHubFrameSize(layout);
  },
  { immediate: true },
);

function onViewportResize() {
  resyncHubFrameFullscreenIfNeeded(is_fullscreen.value || is_expanded.value, hub_settings.settings.layout);
}

onMounted(() => {
  ensureWuWaSharedRegistered();

  const events = [
    tavern_events.CHARACTER_MESSAGE_RENDERED,
    tavern_events.MESSAGE_RECEIVED,
    tavern_events.GENERATION_ENDED,
    tavern_events.STREAM_TOKEN_RECEIVED,
    tavern_events.CHAT_CHANGED,
  ] as const;

  for (const event of events) {
    eventOn(event, refreshGameStarted);
  }

  window.addEventListener('resize', onViewportResize);
  refreshGameStarted();
});

onUnmounted(() => {
  window.removeEventListener('resize', onViewportResize);
});
</script>

<style scoped lang="scss">
.wuwa-unified-shell {
  width: 100%;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}

.wuwa-unified-shell--fill {
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  align-items: stretch;
  justify-content: stretch;
}

.wuwa-unified-shell--fill > :deep(*) {
  flex: 1;
  width: 100%;
  min-height: 0;
}
</style>

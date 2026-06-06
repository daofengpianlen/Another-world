<template>
  <div
    ref="shell_ref"
    class="gal-shell"
    :class="{ 'gal-shell--expanded': is_fullscreen && !is_browser_fullscreen() }"
  >
    <div class="gal-shell__inner" :style="inner_scale_style">
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
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
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
import { compute_gal_ui_scale, resolve_gal_fullscreen_target } from './galScale';
import { useCombatStore } from './combatStore';
import { useGalStore, useUiStore } from './store';

const active_panel = ref<PanelId | null>('主角状态');
const ui = useUiStore();
const gal = useGalStore();
const combat = useCombatStore();
const shell_ref = ref<HTMLElement | null>(null);
const is_fullscreen = ref(false);
const is_expanded = ref(false);
const ui_scale = ref(1);

const is_native_fullscreen = computed(
  () => !!shell_ref.value && document.fullscreenElement === shell_ref.value,
);

function is_parent_iframe_fullscreen(): boolean {
  try {
    if (window.parent === window) return false;
    return window.parent.document.fullscreenElement === window.frameElement;
  } catch {
    return false;
  }
}

function is_browser_fullscreen(): boolean {
  return is_native_fullscreen.value || is_parent_iframe_fullscreen();
}

const inner_scale_style = computed(() => ({
  zoom: ui_scale.value,
}));

function sync_ui_scale() {
  const shell = shell_ref.value;
  if (!shell) return;
  const fill_viewport = is_fullscreen.value;
  const next = compute_gal_ui_scale(shell.clientWidth, shell.clientHeight, fill_viewport);
  ui_scale.value = next;
}

async function exit_any_fullscreen() {
  is_expanded.value = false;

  const tasks: Promise<void>[] = [];
  if (document.fullscreenElement) {
    tasks.push(
      document.exitFullscreen().then(() => undefined).catch(error => {
        console.warn('[GAL] 退出 iframe 内全屏失败', error);
      }),
    );
  }

  try {
    if (window.parent !== window && window.parent.document.fullscreenElement) {
      tasks.push(
        window.parent.document.exitFullscreen().then(() => undefined).catch(error => {
          console.warn('[GAL] 退出父页面全屏失败', error);
        }),
      );
    }
  } catch (error) {
    console.warn('[GAL] 无法访问父页面 document', error);
  }

  if (tasks.length) await Promise.all(tasks);
  await nextTick();
  sync_ui_scale();
}

async function enter_fullscreen() {
  const shell = shell_ref.value;
  if (!shell) {
    is_fullscreen.value = false;
    return;
  }

  const target = resolve_gal_fullscreen_target(shell);

  try {
    await target.requestFullscreen();
    await nextTick();
    sync_ui_scale();
    if (is_browser_fullscreen()) {
      is_expanded.value = false;
      console.info('[GAL] 全屏已启用', { scale: ui_scale.value, target: target.tagName });
      return;
    }
  } catch (error) {
    console.info('[GAL] 浏览器全屏不可用，使用页面内全屏', error);
  }

  is_expanded.value = true;
  await nextTick();
  sync_ui_scale();
  console.info('[GAL] 页面内全屏', { scale: ui_scale.value });
}

async function toggle_fullscreen() {
  if (is_fullscreen.value) {
    is_fullscreen.value = false;
    await exit_any_fullscreen();
    return;
  }

  is_fullscreen.value = true;
  await enter_fullscreen();

  if (!is_expanded.value && !is_browser_fullscreen()) {
    is_fullscreen.value = false;
    sync_ui_scale();
  }
}

function on_fullscreen_change() {
  if (is_browser_fullscreen()) {
    is_fullscreen.value = true;
    is_expanded.value = false;
    nextTick(sync_ui_scale);
    return;
  }

  if (is_expanded.value) {
    is_fullscreen.value = true;
    nextTick(sync_ui_scale);
    return;
  }

  is_fullscreen.value = false;
  nextTick(sync_ui_scale);
}

function on_keydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !is_fullscreen.value) return;
  if (is_browser_fullscreen()) return;
  is_fullscreen.value = false;
  is_expanded.value = false;
  nextTick(sync_ui_scale);
}

function bind_fullscreen_listeners() {
  $(document).on('fullscreenchange webkitfullscreenchange', on_fullscreen_change);
  $(window).on('resize', sync_ui_scale);
  try {
    if (window.parent !== window) {
      window.parent.document.addEventListener('fullscreenchange', on_fullscreen_change);
      window.parent.document.addEventListener('webkitfullscreenchange', on_fullscreen_change);
      window.parent.addEventListener('resize', sync_ui_scale);
    }
  } catch (error) {
    console.warn('[GAL] 无法监听父页面全屏事件', error);
  }
}

function unbind_fullscreen_listeners() {
  $(document).off('fullscreenchange webkitfullscreenchange', on_fullscreen_change);
  $(window).off('resize', sync_ui_scale);
  try {
    if (window.parent !== window) {
      window.parent.document.removeEventListener('fullscreenchange', on_fullscreen_change);
      window.parent.document.removeEventListener('webkitfullscreenchange', on_fullscreen_change);
      window.parent.removeEventListener('resize', sync_ui_scale);
    }
  } catch {
    /* ignore */
  }
}

useResizeObserver(shell_ref, () => {
  sync_ui_scale();
});

watch(is_fullscreen, () => {
  nextTick(sync_ui_scale);
});

$(() => {
  bind_fullscreen_listeners();
  $(document).on('keydown', on_keydown);
  nextTick(sync_ui_scale);
});

$(window).on('pagehide', () => {
  unbind_fullscreen_listeners();
  $(document).off('keydown', on_keydown);
});

watch(
  () => ui.navigate_to,
  () => {
    const target = ui.consume_navigation();
    if (target) active_panel.value = target;
  },
);
</script>

<style lang="scss" scoped>
.gal-shell {
  position: relative;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}

.gal-shell__inner {
  position: relative;
  width: 960px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  --gal-topbar-h: 52px;
  --gal-body-h: 660px;
  border: 1px solid var(--gal-border-strong);
  border-radius: var(--gal-radius-lg);
  overflow: hidden;
  background: var(--gal-gradient-bg);
  box-shadow: var(--gal-shadow-card), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
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

.gal-shell:fullscreen,
.gal-shell--expanded {
  max-width: none;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0;
  align-items: center;
  justify-content: center;
  background: var(--gal-bg-deep);
}

.gal-shell--expanded {
  position: fixed;
  inset: 0;
  z-index: 99999;
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

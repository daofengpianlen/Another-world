<template>

  <div

    ref="shell_ref"

    class="game-hub"

    :class="{
      'game-hub--expanded': is_expanded,
      'game-hub--fullscreen': is_fullscreen,
      'game-hub--layout-mobile': hub_settings.settings.layout === 'mobile',
      'game-hub--layout-desktop': hub_settings.settings.layout === 'desktop',
    }"

    :style="frame_style"

  >

    <DuckGalFrame class="game-hub__duck">

      <div class="game-hub__toolbar">

        <button type="button" class="game-hub__icon-btn" title="设置" @click="hub_settings.toggle_panel()">⚙</button>

        <button

          type="button"

          class="game-hub__icon-btn"

          :class="{ 'game-hub__icon-btn--active': is_fullscreen }"

          :title="is_fullscreen ? '还原' : '全屏'"

          @click="toggle_fullscreen()"

        >

          ⛶

        </button>

      </div>



      <div ref="scroll_el" class="game-hub__scroll">

        <div v-if="!parsed.gal && !game.is_streaming" class="game-hub__empty">

          等待 AI 输出包含 &lt;gal&gt; 的剧情…

        </div>



        <InnerSegments v-if="parsed.gal" :key="game.message_id" :segments="parsed.gal.segments" />

      </div>



      <GameInputBar v-model:phone-visible="phone_visible" :options="parsed.options" />

    </DuckGalFrame>



    <HubSettingsPanel />

    <HubPhoneShell v-model:visible="phone_visible" />

  </div>

</template>



<script setup lang="ts">

import DuckGalFrame from './components/DuckGalFrame.vue';

import GameInputBar from './components/GameInputBar.vue';

import HubPhoneShell from './components/HubPhoneShell.vue';

import HubSettingsPanel from './components/HubSettingsPanel.vue';

import InnerSegments from './components/InnerSegments.vue';

import { useGameStore } from './gameStore';

import { resolveHubFrameProfile } from './hubFrameLayout';

import { syncHubFrameFullscreen, syncHubFrameSize } from './hubFrameSync';

import { resolveHubFontStack, useHubSettingsStore } from './hubSettingsStore';

import { WUWA_SHELL_FULLSCREEN_KEY } from './wuwaShellContext';



const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });

const shell_ctx = inject(WUWA_SHELL_FULLSCREEN_KEY, null);

const game = useGameStore();
const hub_settings = useHubSettingsStore();

const parsed = computed(() => game.parsed);

const hub_font_stack = computed(() => resolveHubFontStack(hub_settings.settings.font_family));

const frame_profile = computed(() => resolveHubFrameProfile(hub_settings.settings.layout));



const frame_style = computed(() => ({

  '--hub-font-scale': hub_settings.settings.font_scale,

  '--hub-font-family': hub_font_stack.value,

  '--hub-max-width': `${frame_profile.value.maxWidth}px`,

  '--hub-max-height': `${frame_profile.value.maxHeight}px`,

  '--hub-aspect-ratio': frame_profile.value.aspectRatio,

  '--hub-aspect-w': frame_profile.value.aspectWidth,

  '--hub-aspect-h': frame_profile.value.aspectHeight,

}));



const shell_ref = ref<HTMLElement | null>(null);
const scroll_el = ref<HTMLElement | null>(null);

const phone_visible = ref(false);

const fallback_fullscreen = ref(false);
const fallback_expanded = ref(false);
const is_fullscreen = shell_ctx?.is_fullscreen ?? fallback_fullscreen;
const is_expanded = shell_ctx?.is_expanded ?? fallback_expanded;
const toggle_fullscreen = shell_ctx?.toggle_fullscreen ?? (() => undefined);



watch(
  () => hub_settings.settings.layout,
  layout => {
    if (props.embedded) return;
    if (!is_fullscreen.value && !is_expanded.value) syncHubFrameSize(layout);
  },
  { immediate: true },
);

watch([is_fullscreen, is_expanded], ([fs, exp]) => {
  if (props.embedded) {
    if (!fs && !exp) phone_visible.value = false;
    return;
  }
  if (fs || exp) {
    syncHubFrameFullscreen(true, hub_settings.settings.layout);
  } else {
    syncHubFrameSize(hub_settings.settings.layout);
    phone_visible.value = false;
  }
});

// 消息切换时重置滚动位置（翻牌/滑动状态由 :key="game.message_id" 强制重建子组件来重置）
watch(
  () => game.parsed.gal,
  () => {
    nextTick(() => {
      if (scroll_el.value) scroll_el.value.scrollTop = 0;
    });
  },
);

</script>



<style scoped lang="scss">

.game-hub {

  width: 100%;

  display: flex;

  justify-content: center;

  color: #334155;

  font-family: var(--hub-font-family, 'Segoe UI', 'Microsoft YaHei', sans-serif);

  position: relative;

}



.game-hub--expanded,
.game-hub--fullscreen,
.game-hub:fullscreen {
  position: fixed;
  inset: 0;
  z-index: 999998;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(6px);
  box-sizing: border-box;
  container-type: size;
  width: 100%;
  height: 100%;
}

.game-hub--expanded .game-hub__duck,
.game-hub--fullscreen .game-hub__duck,
.game-hub:fullscreen .game-hub__duck {
  flex: 1;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  aspect-ratio: unset;
}

.game-hub__duck {

  width: 100%;

  max-width: var(--hub-max-width, 960px);

  max-height: var(--hub-max-height, 768px);

  aspect-ratio: var(--hub-aspect-ratio, 960 / 768);

  display: flex;

  flex-direction: column;

  position: relative;

}



.game-hub--layout-mobile .game-hub__scroll {

  padding-inline: 4px;

}



.game-hub--layout-desktop .game-hub__scroll {

  padding-inline: 8px;

}



.game-hub__toolbar {

  position: absolute;

  top: 10px;

  left: 10px;

  z-index: 10;

  display: flex;

  align-items: center;

  gap: 6px;

  padding: 0;

  pointer-events: auto;

}



.game-hub__icon-btn {

  border: 1px solid #bae6fd;

  background: rgba(255, 255, 255, 0.92);

  color: #0369a1;

  border-radius: 10px;

  min-width: 36px;

  height: 34px;

  padding: 0 10px;

  cursor: pointer;

  font-weight: 600;

  font-size: calc(14px * var(--hub-font-scale, 1));



  &--active {

    background: #0369a1;

    color: #fff;

    border-color: #0369a1;

  }

}



.game-hub__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 6px;
  position: relative;
  z-index: 1;
  font-size: calc(14px * var(--hub-font-scale, 1));
}



.game-hub__empty {

  padding: 16px;

  border-radius: 12px;

  background: rgba(248, 250, 252, 0.92);

  border: 1px dashed #cbd5e1;

  color: #64748b;

  line-height: 1.5;

}

</style>



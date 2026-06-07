<template>

  <div

    ref="shell_ref"

    class="gal-shell game-root"

    :class="{

      'gal-shell--expanded': is_expanded && !is_gal_browser_fullscreen(),

      'game-root--opening': phase === 'opening',

    }"

  >

    <div class="gal-shell__inner" :style="inner_scale_style">

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

  </div>

</template>



<script setup lang="ts">

import App from './App.vue';
import OpeningScreen from './components/OpeningScreen.vue';
import { useGalFullscreen } from './galFullscreen';
import { GAL_FULLSCREEN_KEY, is_gal_browser_fullscreen } from './galFullscreenContext';
import { useGamePhaseStore } from './store';

const phaseStore = useGamePhaseStore();
const shell_ref = ref<HTMLElement | null>(null);



const { is_fullscreen, is_expanded, inner_scale_style, toggle_fullscreen, mount, unmount } =

  useGalFullscreen(shell_ref);



provide(GAL_FULLSCREEN_KEY, {

  is_fullscreen,

  is_expanded,

  toggle_fullscreen,

});



const phase = computed(() => phaseStore.phase);



const show_loading = computed(() => phaseStore.generating_opening);



$(() => {

  phaseStore.syncPhase();

  eventOn(tavern_events.CHAT_CHANGED, () => phaseStore.syncPhase());

  mount();

});



$(window).on('pagehide', () => {

  unmount();

});

</script>



<style lang="scss" scoped>

.gal-shell {

  position: relative;

  width: 100%;

  max-width: 960px;

  margin: 0 auto;

  display: flex;

  justify-content: center;

  color: var(--gal-text);

}



.gal-shell__inner {

  position: relative;

  width: 960px;

  flex-shrink: 0;

  display: flex;

  flex-direction: column;

  border: 1px solid var(--gal-border-strong);

  border-radius: var(--gal-radius-lg);

  overflow: hidden;

  background: var(--gal-gradient-bg);

  box-shadow: var(--gal-shadow-card), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;

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



.game-root__playing {

  position: relative;

  flex: 1;

  min-height: 0;

  display: flex;

  flex-direction: column;

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



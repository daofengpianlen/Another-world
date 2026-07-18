<template>
  <div
    ref="gal_ref"
    class="duck-gal"
    :style="{ '--duck-header-bottom': `${header_bottom_px}px` }"
  >
    <div class="duck-gal__wave duck-gal__wave--top">
      <img :src="waveUrl" alt="" />
    </div>

    <div ref="header_ref" class="duck-gal__header">
      <img ref="header_img_ref" :src="duckHeaderUrl" alt="" @load="update_header_bottom" />
    </div>

    <div class="duck-gal__ducks" aria-hidden="true">
      <img class="duck-gal__duck duck-gal__duck--a" :src="duckAUrl" alt="" />
      <img class="duck-gal__duck duck-gal__duck--b" :src="duckBUrl" alt="" />
    </div>

    <div class="duck-gal__body">
      <slot />
    </div>

    <div class="duck-gal__wave duck-gal__wave--bottom">
      <img :src="waveUrl" alt="" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { resolveWuwaMediaUrl } from '../../../shared/wuwaMedia';
import { DUCK_A_URL, DUCK_B_URL, DUCK_HEADER_URL, WAVE_URL } from '../constants';

const waveUrl = computed(() => resolveWuwaMediaUrl(WAVE_URL));
const duckHeaderUrl = computed(() => resolveWuwaMediaUrl(DUCK_HEADER_URL));
const duckAUrl = computed(() => resolveWuwaMediaUrl(DUCK_A_URL));
const duckBUrl = computed(() => resolveWuwaMediaUrl(DUCK_B_URL));

const gal_ref = ref<HTMLElement | null>(null);
const header_ref = ref<HTMLElement | null>(null);
const header_img_ref = ref<HTMLImageElement | null>(null);
const header_bottom_px = ref(118);

function update_header_bottom() {
  const gal = gal_ref.value;
  const header = header_ref.value;
  if (!gal || !header) return;

  const gal_top = gal.getBoundingClientRect().top;
  const header_bottom = header.getBoundingClientRect().bottom;
  header_bottom_px.value = _.clamp(Math.ceil(header_bottom - gal_top) + 8, 96, 160);
}

let resize_observer: ResizeObserver | null = null;

onMounted(() => {
  update_header_bottom();
  resize_observer = new ResizeObserver(() => update_header_bottom());
  if (gal_ref.value) resize_observer.observe(gal_ref.value);
  if (header_ref.value) resize_observer.observe(header_ref.value);
  if (header_img_ref.value) resize_observer.observe(header_img_ref.value);
});

onBeforeUnmount(() => {
  resize_observer?.disconnect();
  resize_observer = null;
});
</script>

<style scoped lang="scss">
.duck-gal {
  position: relative;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  border: 1.2px solid #eee;
  overflow: hidden;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.duck-gal__wave {
  position: absolute;
  left: 0;
  width: 100%;
  pointer-events: none;
  opacity: 0.8;
  z-index: 2;

  img {
    width: 100%;
    display: block;
  }

  &--top {
    top: 0;
    transform: rotate(180deg);
  }

  &--bottom {
    bottom: 0;
    z-index: 1;
  }
}

.duck-gal__header {
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  max-width: 200px;
  z-index: 4;
  pointer-events: none;

  img {
    width: 100%;
    display: block;
  }
}

.duck-gal__ducks {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: var(--duck-header-bottom, 118px);
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
}

.duck-gal__duck {
  position: absolute;
  width: 50px;
  height: 50px;

  &--a {
    left: 10px;
    top: 52px;
    animation: duck-bounce 5s linear infinite;
  }

  &--b {
    right: 10px;
    top: 62px;
    animation: duck-bounce 5s linear infinite reverse;
  }
}

.duck-gal__body {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: var(--duck-header-bottom, 118px) 16px 72px;
  box-sizing: border-box;
}

@keyframes duck-bounce {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(calc(100% - 70px), 50px) rotate(90deg);
  }
  50% {
    transform: translate(calc(100% - 120px), calc(100% - 80px)) rotate(180deg);
  }
  75% {
    transform: translate(50px, calc(100% - 120px)) rotate(270deg);
  }
  100% {
    transform: translate(0, 0) rotate(360deg);
  }
}
</style>

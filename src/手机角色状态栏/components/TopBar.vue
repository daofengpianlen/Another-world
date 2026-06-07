<template>
  <header class="top-bar">
    <div class="top-bar__title">
      <span class="top-bar__icon-wrap"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
      <span class="top-bar__title-text">{{ GAME_TITLE }}</span>
    </div>
    <div class="top-bar__actions">
      <div class="top-bar__bgm">
        <button class="top-bar__btn" type="button" title="播放/暂停 BGM" @click="toggleBgm">
          <i :class="playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
        </button>
        <span class="top-bar__bgm-label">{{ bgm_label }}</span>
      </div>
      <button
        class="top-bar__btn top-bar__btn--fullscreen"
        :class="{ 'top-bar__btn--active': is_fullscreen }"
        type="button"
        :title="is_fullscreen ? '还原' : '全屏'"
        @click="$emit('toggle-fullscreen')"
      >
        <i :class="is_fullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
        <span class="top-bar__btn-text">{{ is_fullscreen ? '还原' : '全屏' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { GAME_TITLE } from '../config';
import { readCurrentAudioPlaying, toggleTavernAudio } from '../tavernAudio';
import { useGalStore } from '../store';

defineProps<{
  is_fullscreen: boolean;
}>();

defineEmits<{
  'toggle-fullscreen': [];
}>();

const gal = useGalStore();
const playing = ref(readCurrentAudioPlaying('bgm'));

const bgm_label = computed(() => {
  if (!gal.current_bgm) return '暂无 BGM';
  try {
    return decodeURIComponent(gal.current_bgm.split('/').pop() ?? 'BGM');
  } catch {
    return 'BGM';
  }
});

useIntervalFn(() => {
  playing.value = readCurrentAudioPlaying('bgm');
}, 1000);

function toggleBgm() {
  playing.value = toggleTavernAudio('bgm', gal.current_bgm || undefined);
}
</script>

<style lang="scss" scoped>
.top-bar {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: var(--gal-gradient-header);
  border-bottom: 1px solid var(--gal-border-strong);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--gal-gradient-primary);
    opacity: 0.65;
  }
}

.top-bar__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.6px;
}

.top-bar__icon-wrap {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--gal-gradient-primary);
  box-shadow: 0 4px 14px rgba(236, 72, 153, 0.35);

  i {
    font-size: 14px;
    color: #fff;
  }
}

.top-bar__title-text {
  color: var(--gal-text);
}

.top-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.top-bar__bgm {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 4px 10px 4px 4px;
  border-radius: var(--gal-radius-pill);
  background: var(--gal-glass);
  border: 1px solid var(--gal-border);
}

.top-bar__btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--gal-border);
  border-radius: 10px;
  background: var(--gal-glass);
  color: var(--gal-text);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--gal-transition);

  &:hover {
    border-color: rgba(244, 114, 182, 0.45);
    background: var(--gal-pink-soft);
  }
}

.top-bar__btn--fullscreen {
  width: auto;
  min-width: 32px;
  padding: 0 12px;
  gap: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.top-bar__btn-text {
  font-size: 11px;
  font-weight: 600;
}

.top-bar__btn--active,
.top-bar__btn--fullscreen:hover {
  border-color: rgba(96, 165, 250, 0.5);
  color: var(--gal-blue);
  background: var(--gal-blue-soft);
}

.top-bar__bgm-label {
  font-size: 10px;
  color: var(--gal-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}
</style>

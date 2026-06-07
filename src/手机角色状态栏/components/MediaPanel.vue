<template>
  <section class="media-panel">
    <p v-if="scene_title" class="media-panel__scene-title">
      <i class="fa-solid fa-location-dot"></i>
      <span>{{ scene_title }}</span>
    </p>
    <div class="gal-section-label media-panel__label">
      <span>{{ gal.is_event_pending ? '突发事件' : '场景 / 背景' }}</span>
    </div>
    <div class="media-panel__frame" :class="{ 'media-panel__frame--event': gal.is_event_pending }">
      <MediaView v-if="url" :key="url" :url="url" fit="contain" />
      <div v-else class="media-panel__placeholder gal-empty">
        <i class="fa-solid fa-image"></i>
        <span>等待场景背景</span>
      </div>

      <div v-if="gal.is_event_pending" class="media-panel__event-overlay">
        <div class="media-panel__event-desc-wrap">
          <p class="media-panel__event-desc">{{ gal.current_event?.desc || '……' }}</p>
        </div>
        <div class="media-panel__event-actions">
          <button
            class="media-panel__event-btn gal-btn gal-btn--primary gal-btn--pill"
            type="button"
            :disabled="gal.sending || event_busy"
            @click="on_event_resolve"
          >
            <i class="fa-solid fa-hand-holding-heart"></i>
            {{ gal.current_event?.resolve_label || '尝试处理' }}
          </button>
          <button
            class="media-panel__event-btn gal-btn gal-btn--pill"
            type="button"
            :disabled="gal.sending || event_busy"
            @click="on_event_ignore"
          >
            <i class="fa-solid fa-person-walking-arrow-right"></i>
            {{ gal.current_event?.ignore_label || '不予理睬' }}
          </button>
        </div>
        <p v-if="event_hint" class="media-panel__event-hint">{{ event_hint }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { findBackgroundSceneLabel } from '../backgroundScenes';
import { SCENE_ASPECT } from '../media';
import { read_current_region } from '../regionState';
import { useGalStore } from '../store';
import MediaView from './MediaView.vue';

const gal = useGalStore();
const url = computed(() => gal.current_background);
const current_region = ref(read_current_region());

const scene_title = computed(() => {
  const label = gal.current_background_label?.trim();
  if (label) return label;
  if (gal.current_background) {
    return findBackgroundSceneLabel(gal.current_background) ?? '';
  }
  return current_region.value;
});

let region_poll: number | undefined;

$(() => {
  region_poll = window.setInterval(() => {
    current_region.value = read_current_region();
  }, 1500);
});

$(window).on('pagehide', () => {
  if (region_poll !== undefined) window.clearInterval(region_poll);
});
const event_busy = ref(false);
const event_hint = ref('');

async function on_event_resolve() {
  if (event_busy.value || gal.sending) return;
  event_busy.value = true;
  event_hint.value = '';
  try {
    await gal.handleEventResolve();
  } catch (err) {
    event_hint.value = err instanceof Error ? err.message : '处理失败';
  } finally {
    event_busy.value = false;
  }
}

async function on_event_ignore() {
  if (event_busy.value || gal.sending) return;
  event_busy.value = true;
  event_hint.value = '';
  try {
    await gal.handleEventIgnore();
  } catch (err) {
    event_hint.value = err instanceof Error ? err.message : '处理失败';
  } finally {
    event_busy.value = false;
  }
}
</script>

<style lang="scss" scoped>
.media-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.media-panel__scene-title {
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--gal-radius-md);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #f8fafc;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.22) 0%, rgba(167, 139, 250, 0.18) 100%);
  border: 1px solid rgba(96, 165, 250, 0.35);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.28);

  i {
    font-size: 12px;
    color: var(--gal-blue);
  }

  span {
    color: var(--gal-violet);
  }
}

.media-panel__label {
  width: 100%;
}

.media-panel__frame {
  position: relative;
  flex-shrink: 0;
  width: 100%;
  aspect-ratio: v-bind(SCENE_ASPECT);
  max-height: 100%;
  border-radius: var(--gal-radius-md);
  overflow: hidden;
  border: 1px solid var(--gal-border-strong);
  background: rgba(6, 10, 20, 0.8);
  box-shadow: var(--gal-shadow-card), 0 0 0 1px rgba(244, 114, 182, 0.08) inset;

  &--event {
    border-color: rgba(244, 114, 182, 0.45);
    box-shadow: var(--gal-shadow-card), 0 0 18px rgba(244, 114, 182, 0.12) inset;
  }

  :deep(.media-view) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.media-panel__placeholder {
  width: 100%;
  height: 100%;
  min-height: 120px;
}

.media-panel__event-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.media-panel__event-desc-wrap {
  pointer-events: auto;
  margin: 10px 10px 0;
  padding: 10px 12px;
  max-height: 42%;
  overflow-y: auto;
  border-radius: var(--gal-radius-sm);
  background: linear-gradient(
    180deg,
    rgba(6, 10, 20, 0.72) 0%,
    rgba(6, 10, 20, 0.38) 100%
  );
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.media-panel__event-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #f8fafc;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  word-break: break-word;
}

.media-panel__event-actions {
  pointer-events: auto;
  display: flex;
  gap: 8px;
  padding: 0 10px 10px;
  margin-top: auto;
}

.media-panel__event-btn {
  flex: 1;
  min-height: 38px;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: rgba(10, 14, 26, 0.55) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);

  &:hover:not(:disabled) {
    background: rgba(10, 14, 26, 0.72) !important;
    border-color: rgba(255, 255, 255, 0.28) !important;
  }

  &.gal-btn--primary {
    background: rgba(99, 102, 241, 0.62) !important;
    border-color: rgba(165, 180, 252, 0.45) !important;

    &:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.78) !important;
    }
  }
}

.media-panel__event-hint {
  pointer-events: none;
  position: absolute;
  left: 50%;
  bottom: 54px;
  transform: translateX(-50%);
  margin: 0;
  padding: 4px 10px;
  font-size: 11px;
  color: #fda4af;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
  border-radius: var(--gal-radius-pill);
  background: rgba(6, 10, 20, 0.5);
  backdrop-filter: blur(6px);
  white-space: nowrap;
}
</style>

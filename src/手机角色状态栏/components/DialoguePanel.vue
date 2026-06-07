<template>
  <section class="dialogue-panel">
    <div class="gal-section-label dialogue-panel__label">
      <span>剧情对话</span>
      <div class="dialogue-panel__label-actions">
        <button
          class="dialogue-panel__mode-btn gal-btn gal-btn--pill"
          type="button"
          :class="{ 'dialogue-panel__mode-btn--active': auto_play }"
          :disabled="!gal.has_dialogues || gal.sending"
          title="自动播放"
          @click="toggle_auto"
        >
          <i class="fa-solid fa-play"></i>
          自动
        </button>
        <button
          class="dialogue-panel__mode-btn gal-btn gal-btn--pill"
          type="button"
          :class="{ 'dialogue-panel__mode-btn--active': fast_skip }"
          :disabled="!gal.has_dialogues || gal.sending"
          title="快进浏览"
          @click="toggle_fast_skip"
        >
          <i class="fa-solid fa-forward-fast"></i>
          快进
        </button>
        <span v-if="gal.has_dialogues" class="dialogue-panel__progress">{{ progress_text }}</span>
      </div>
    </div>
    <div class="dialogue-panel__body" @click="handle_panel_click">
      <div v-if="dialogue" class="dialogue-panel__stage">
        <div class="dialogue-bubble" :class="bubble_class">
          <div
            v-if="has_portrait && portrait_url"
            class="dialogue-bubble__portrait"
          >
            <MediaView :url="portrait_url" :label="dialogue.speaker ?? ''" fit="contain" />
          </div>
          <div
            v-else-if="has_portrait"
            class="dialogue-bubble__portrait dialogue-bubble__portrait--text"
          >
            {{ speaker_initial }}
          </div>
          <div class="dialogue-bubble__content">
            <div
              :key="name_anim_key"
              class="dialogue-bubble__name"
              :class="name_class"
            >
              <span class="dialogue-bubble__name-text">{{ dialogue.speaker }}</span>
            </div>
            <div ref="text_wrap_ref" class="dialogue-bubble__text-wrap gal-panel-scroll">
              <div class="dialogue-bubble__text">{{ dialogue.text }}</div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="dialogue-panel__empty gal-empty">
        <i class="fa-regular fa-comment-dots"></i>
        <span>等待 AI 输出对话</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';
import { resolveNpcAvatar } from '../config';
import {
  DIALOGUE_BODY_HEIGHT,
  DIALOGUE_PORTRAIT_HEIGHT,
  DIALOGUE_PORTRAIT_WIDTH,
  PORTRAIT_ASPECT,
} from '../media';
import { useGalStore } from '../store';
import MediaView from './MediaView.vue';

const AUTO_INTERVAL_MS = 2600;
const SKIP_INTERVAL_MS = 140;

const gal = useGalStore();
const text_wrap_ref = ref<HTMLElement | null>(null);
const auto_play = ref(false);
const fast_skip = ref(false);

const css_portrait_w = `${DIALOGUE_PORTRAIT_WIDTH}px`;
const css_portrait_h = `${DIALOGUE_PORTRAIT_HEIGHT}px`;
const css_body_h = `${DIALOGUE_BODY_HEIGHT}px`;

const dialogue = computed(() => gal.current_dialogue);
const dialogue_total = computed(() => gal.parsed?.dialogues.length ?? 0);

const can_prev = computed(() => gal.can_prev_dialogue);
const can_next = computed(() => gal.can_next_dialogue);
const is_at_last = computed(
  () =>
    dialogue_total.value > 0 &&
    !gal.can_next_dialogue &&
    !gal.is_at_battle_step &&
    !gal.is_event_pending,
);

const portrait_url = computed(() => {
  if (dialogue.value?.pic) return dialogue.value.pic;
  const name = dialogue.value?.speaker ?? '';
  return resolveNpcAvatar(name);
});

const speaker_initial = computed(() => dialogue.value?.speaker?.charAt(0) ?? '?');

const has_portrait = computed(() => dialogue.value?.dialogue_kind === 'character');

const bubble_class = computed(() => ({
  'dialogue-bubble--narrator': dialogue.value?.dialogue_kind === 'narrator',
  'dialogue-bubble--other': dialogue.value?.dialogue_kind === 'other',
  'dialogue-bubble--no-portrait': !has_portrait.value,
}));

const name_class = computed(() => ({
  'dialogue-bubble__name--character': has_portrait.value,
  'dialogue-bubble__name--narrator': dialogue.value?.dialogue_kind === 'narrator',
  'dialogue-bubble__name--other': dialogue.value?.dialogue_kind === 'other',
}));

const name_anim_key = computed(() => `${gal.dialogue_index}:${dialogue.value?.speaker ?? ''}`);

const progress_text = computed(() => {
  if (!dialogue_total.value) return '';
  return `${gal.dialogue_index + 1} / ${dialogue_total.value}`;
});

function stop_playback_modes() {
  auto_play.value = false;
  fast_skip.value = false;
}

function toggle_auto() {
  if (!gal.has_dialogues) return;
  if (auto_play.value) {
    auto_play.value = false;
    return;
  }
  fast_skip.value = false;
  if (is_at_last.value) {
    gal.dialogue_index = 0;
    reset_text_scroll();
  }
  auto_play.value = true;
}

function toggle_fast_skip() {
  if (!gal.has_dialogues) return;
  if (fast_skip.value) {
    fast_skip.value = false;
    return;
  }
  auto_play.value = false;
  if (is_at_last.value) {
    gal.dialogue_index = 0;
    reset_text_scroll();
  }
  fast_skip.value = true;
}

function advance_dialogue() {
  if (!gal.has_dialogues || is_at_last.value) {
    stop_playback_modes();
    return;
  }
  gal.nextDialogue();
}

const playback_interval = computed(() => (fast_skip.value ? SKIP_INTERVAL_MS : AUTO_INTERVAL_MS));

const { pause: pause_playback, resume: resume_playback } = useIntervalFn(
  advance_dialogue,
  playback_interval,
  { immediate: false },
);

watch([auto_play, fast_skip], ([auto, skip]) => {
  if (auto || skip) resume_playback();
  else pause_playback();
});

watch(is_at_last, at_last => {
  if (at_last) stop_playback_modes();
});

watch(
  () => gal.is_at_battle_step,
  at_battle => {
    if (at_battle) stop_playback_modes();
  },
);

watch(
  () => gal.is_event_pending,
  pending => {
    if (pending) stop_playback_modes();
  },
);

watch(
  () =>
    `${gal.dialogue_index}:${gal.current_dialogue?.speaker ?? ''}:${gal.current_dialogue?.text ?? ''}`,
  (next, prev) => {
    if (prev !== undefined && next !== prev) reset_text_scroll();
  },
);

watch(
  () => gal.parsed?.dialogues.length,
  () => stop_playback_modes(),
);

watch(
  () => gal.sending,
  sending => {
    if (sending) stop_playback_modes();
  },
);

function reset_text_scroll() {
  nextTick(() => {
    if (text_wrap_ref.value) text_wrap_ref.value.scrollTop = 0;
  });
}

function handle_panel_click(event: MouseEvent) {
  if (!gal.has_dialogues) return;

  const body = event.currentTarget as HTMLElement;
  const rect = body.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const mid = rect.width / 2;

  if (x < mid) {
    if (can_prev.value) gal.prevDialogue();
  } else if (can_next.value) {
    gal.nextDialogue();
  }
}

onUnmounted(() => {
  stop_playback_modes();
  pause_playback();
});
</script>

<style lang="scss" scoped>
.dialogue-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  --dialogue-portrait-w: v-bind(css_portrait_w);
  --dialogue-portrait-h: v-bind(css_portrait_h);
  --dialogue-body-h: v-bind(css_body_h);
}

.dialogue-panel__label {
  width: 100%;
}

.dialogue-panel__label-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.dialogue-panel__mode-btn {
  padding: 3px 10px;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--gal-text-muted);
  border-color: transparent;
  background: rgba(255, 255, 255, 0.04);

  i {
    font-size: 9px;
  }

  &--active {
    color: #fff;
    border-color: transparent;
    background: var(--gal-gradient-primary);
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.28);
  }
}

.dialogue-panel__progress {
  text-transform: none;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: var(--gal-radius-pill);
  background: var(--gal-blue-soft);
  color: var(--gal-blue);

  &::before {
    display: none;
  }
}

.dialogue-panel__body {
  position: relative;
  box-sizing: border-box;
  height: var(--dialogue-body-h);
  min-height: var(--dialogue-body-h);
  max-height: var(--dialogue-body-h);
  padding: 12px;
  border-radius: var(--gal-radius-md);
  border: 1px solid var(--gal-border);
  background: var(--gal-gradient-card);
  backdrop-filter: blur(8px);
  transition: border-color var(--gal-transition);
  user-select: none;
  overflow: hidden;
  cursor: pointer;

  &:hover {
    border-color: rgba(96, 165, 250, 0.35);
  }
}

.dialogue-panel__stage {
  position: relative;
  height: 100%;
}

.dialogue-bubble {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 12px;
  align-items: stretch;
  height: var(--dialogue-portrait-h);
  min-height: var(--dialogue-portrait-h);
  max-height: var(--dialogue-portrait-h);
}

.dialogue-bubble--no-portrait {
  .dialogue-bubble__content {
    flex: 1;
    width: 100%;
  }
}

.dialogue-bubble--narrator .dialogue-bubble__content {
  background: rgba(148, 163, 184, 0.08);
  border-style: dashed;
}

.dialogue-bubble__portrait {
  flex-shrink: 0;
  width: var(--dialogue-portrait-w);
  height: var(--dialogue-portrait-h);
  aspect-ratio: v-bind(PORTRAIT_ASPECT);
  border-radius: var(--gal-radius-sm);
  overflow: hidden;
  border: 2px solid transparent;
  background: linear-gradient(var(--gal-bg), var(--gal-bg)) padding-box,
    var(--gal-gradient-primary) border-box;

  :deep(.media-view) {
    object-fit: contain;
    background: var(--gal-bg);
  }
}

.dialogue-bubble__portrait--text {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gal-pink-soft);
  color: var(--gal-pink);
  font-weight: 700;
  font-size: 28px;
}

.dialogue-bubble__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  border-radius: var(--gal-radius-md);
  background: rgba(15, 20, 38, 0.65);
  border: 1px solid var(--gal-border);
  overflow: hidden;
}

.dialogue-bubble__name {
  flex-shrink: 0;
  margin-bottom: 6px;
  line-height: 1.2;
  min-height: 1.2em;
}

.dialogue-bubble__name-text {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
}

.dialogue-bubble__name--character .dialogue-bubble__name-text {
  color: var(--gal-pink);
  animation:
    dialogue-name-glow 3.6s ease-in-out infinite alternate,
    dialogue-name-enter 0.45s ease-out;
}

.dialogue-bubble__name--narrator .dialogue-bubble__name-text {
  color: var(--gal-text-muted);
  font-weight: 600;
  letter-spacing: 0.12em;
}

.dialogue-bubble__name--other .dialogue-bubble__name-text {
  color: var(--gal-violet);
  animation: dialogue-name-enter 0.45s ease-out;
}

.dialogue-bubble__text-wrap {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.dialogue-bubble__text {
  font-size: 13px;
  line-height: 1.55;
  color: var(--gal-text);
  word-break: break-word;
}

.dialogue-panel__empty {
  height: 100%;
  min-height: 0;
  padding: 0;
  justify-content: center;
}

@keyframes dialogue-name-glow {
  0% {
    filter: drop-shadow(0 0 4px rgba(244, 114, 182, 0.25));
  }

  100% {
    filter: drop-shadow(0 0 10px rgba(167, 139, 250, 0.4));
  }
}

@keyframes dialogue-name-enter {
  0% {
    opacity: 0;
    transform: translateY(4px) scale(0.96);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

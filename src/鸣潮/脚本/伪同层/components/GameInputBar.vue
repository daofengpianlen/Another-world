<template>
  <section class="input-bar">
    <div class="input-bar__label">
      <span>输入</span>
      <span v-if="sending || is_streaming" class="input-bar__status">生成中…</span>
    </div>

    <Transition name="options-pop">
      <div
        v-if="options_open && options.length"
        class="input-bar__options-pop"
        role="listbox"
        aria-label="行动选项"
      >
        <button
          v-for="(option, index) in options"
          :key="index"
          type="button"
          class="input-bar__option"
          role="option"
          :disabled="sending"
          @click="pickOption(option.text)"
          v-html="option.html"
        ></button>
      </div>
    </Transition>

    <div class="input-bar__row">
      <button
        type="button"
        class="input-bar__xiaoai"
        :class="{ 'input-bar__xiaoai--active': phone_visible }"
        title="打开小爱"
        @click="phone_visible = !phone_visible"
      >
        <img :src="xiaoAiIconUrl" alt="小爱" />
      </button>

      <input
        v-model="user_input"
        class="input-bar__input"
        type="text"
        placeholder="输入行动或对话，发送给 AI…"
        :disabled="sending"
        @keydown.enter.prevent="submit()"
      />

      <button
        type="button"
        class="input-bar__btn input-bar__btn--send"
        :disabled="sending || !can_send"
        @click="submit()"
      >
        发送
      </button>

      <button
        type="button"
        class="input-bar__options-toggle"
        :class="{ 'input-bar__options-toggle--open': options_open }"
        :disabled="!options.length || sending"
        :title="options.length ? (options_open ? '收起选项' : '展开行动选项') : '暂无选项'"
        @click="toggleOptions()"
      >
        <span class="input-bar__options-toggle-icon" aria-hidden="true">▲</span>
        <span v-if="options.length" class="input-bar__options-badge">{{ options.length }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { resolveWuwaMediaUrl } from '../../../shared/wuwaMedia';
import { XIAO_AI_ICON_URL } from '../constants';
import { useGameStore } from '../gameStore';
import type { WuwaOption } from '../wuwaParser';

const xiaoAiIconUrl = computed(() => resolveWuwaMediaUrl(XIAO_AI_ICON_URL));

defineProps<{ options: WuwaOption[] }>();

const phone_visible = defineModel<boolean>('phoneVisible', { default: false });

const game = useGameStore();
const { user_input, sending, is_streaming } = storeToRefs(game);
const can_send = computed(() => Boolean(user_input.value.trim()));
const options_open = ref(false);

function toggleOptions() {
  options_open.value = !options_open.value;
}

async function pickOption(text: string) {
  if (sending.value) return;
  options_open.value = false;
  await game.applyOption(text);
}

async function submit() {
  if (!can_send.value || sending.value) return;
  options_open.value = false;
  await game.submitInput();
}
</script>

<style scoped lang="scss">
.input-bar {
  padding-top: 10px;
  padding-bottom: 6px;
  margin-top: auto;
  flex-shrink: 0;
  position: relative;
  z-index: 15;
  pointer-events: auto;
  background: transparent;
  font-size: calc(14px * var(--hub-font-scale, 1));
}

.input-bar__label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #0284c7;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.input-bar__status {
  color: #64748b;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}

.input-bar__options-pop {
  position: absolute;
  right: 0;
  bottom: calc(100% - 4px);
  width: min(100%, 320px);
  max-height: min(40vh, 220px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 12px 12px 4px 12px;
  border: 1px solid #bae6fd;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.14);
  z-index: 20;
  box-sizing: border-box;
}

.input-bar__option {
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  cursor: pointer;
  transition: 0.2s ease;

  &:hover:not(:disabled) {
    border-color: #38bdf8;
    background: #e0f2fe;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.options-pop-enter-active,
.options-pop-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.options-pop-enter-from,
.options-pop-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.input-bar__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-bar__xiaoai {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(4px);
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover {
    transform: scale(1.05);
  }

  &--active {
    box-shadow: 0 0 0 2px #38bdf8, 0 2px 8px rgba(0, 0, 0, 0.12);
  }
}

.input-bar__input {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(203, 213, 225, 0.85);
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(4px);
  outline: none;
  pointer-events: auto;

  &:focus {
    border-color: #38bdf8;
    background: rgba(255, 255, 255, 0.62);
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }
}

.input-bar__btn {
  flex-shrink: 0;
  min-width: 44px;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(203, 213, 225, 0.85);
  background: rgba(226, 232, 240, 0.72);
  backdrop-filter: blur(4px);
  font-weight: 700;
  cursor: pointer;
  pointer-events: auto;

  &--send {
    background: linear-gradient(90deg, #0369a1, #0e7490);
    border: none;
    color: #fff;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.input-bar__options-toggle {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid rgba(186, 230, 253, 0.9);
  background: rgba(240, 249, 255, 0.55);
  backdrop-filter: blur(4px);
  color: #0369a1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover:not(:disabled) {
    background: #bae6fd;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--open {
    background: #0369a1;
    border-color: #0369a1;
    color: #fff;

    .input-bar__options-toggle-icon {
      transform: rotate(180deg);
    }
  }
}

.input-bar__options-toggle-icon {
  display: block;
  font-size: 14px;
  line-height: 1;
  transition: transform 0.22s ease;
}

.input-bar__options-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #f97316;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>

<template>
  <div class="user-bubble">
    <div class="user-bubble__label">
      <span>📤 你说</span>
      <span class="user-bubble__actions">
        <button
          v-if="!editing"
          type="button"
          class="user-bubble__icon-btn"
          title="编辑后重新发送"
          @click="startEdit()"
        >✎</button>
        <button
          v-if="editing"
          type="button"
          class="user-bubble__icon-btn user-bubble__icon-btn--save"
          title="保存修改"
          @click="saveEdit()"
        >✓</button>
        <button
          v-if="editing"
          type="button"
          class="user-bubble__icon-btn user-bubble__icon-btn--cancel"
          title="取消编辑"
          @click="cancelEdit()"
        >✕</button>
        <button
          v-if="!editing"
          type="button"
          class="user-bubble__icon-btn user-bubble__icon-btn--resend"
          title="重新发送"
          :disabled="game.sending"
          @click="resend()"
        >↻</button>
      </span>
    </div>

    <div v-if="!editing" class="user-bubble__content">
      {{ local_content }}
    </div>
    <textarea
      v-else
      ref="edit_textarea"
      v-model="local_content"
      class="user-bubble__edit"
      rows="2"
      @keydown.enter.ctrl="saveEdit()"
    />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../gameStore';

const props = defineProps<{ content: string }>();

const game = useGameStore();

const local_content = ref(props.content);
const editing = ref(false);
const edit_textarea = ref<HTMLTextAreaElement | null>(null);

function startEdit() {
  editing.value = true;
  nextTick(() => {
    edit_textarea.value?.focus();
    edit_textarea.value?.select();
  });
}

function saveEdit() {
  const trimmed = local_content.value.trim();
  if (!trimmed) {
    local_content.value = props.content;
  } else {
    local_content.value = trimmed;
    game.setPendingUserMessage(trimmed);
  }
  editing.value = false;
}

function cancelEdit() {
  local_content.value = props.content;
  editing.value = false;
}

function resend() {
  game.editBubbleAndRegenerate(local_content.value);
}
</script>

<style scoped lang="scss">
.user-bubble {
  margin: 20px 0;
  padding: 14px 16px;
  border-radius: 16px 4px 16px 16px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border: 2px solid #38bdf8;
  color: #0c4a6e;
  font-size: calc(14px * var(--hub-font-scale, 1));
  position: relative;
  box-shadow: 0 2px 8px rgba(56, 189, 248, 0.18);
}

.user-bubble__label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: calc(11px * var(--hub-font-scale, 1));
  font-weight: 700;
  color: #0284c7;
  letter-spacing: 0.05em;
}

.user-bubble__actions {
  display: flex;
  gap: 4px;
}

.user-bubble__icon-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid rgba(56, 189, 248, 0.4);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.7);
  color: #0369a1;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: #bae6fd;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--save {
    color: #16a34a;
    border-color: rgba(22, 163, 74, 0.4);
    &:hover:not(:disabled) {
      background: #dcfce7;
    }
  }

  &--cancel {
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.4);
    &:hover:not(:disabled) {
      background: #fef2f2;
    }
  }

  &--resend {
    color: #0e7490;
  }
}

.user-bubble__content {
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  font-weight: 500;
}

.user-bubble__edit {
  width: 100%;
  min-height: 56px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 2px solid #38bdf8;
  background: #fff;
  color: #0c4a6e;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  box-sizing: border-box;

  &:focus {
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
  }
}
</style>
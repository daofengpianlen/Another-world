<template>
  <section class="chat-panel">
    <div class="chat-panel__glow chat-panel__glow--pink" aria-hidden="true"></div>
    <div class="chat-panel__glow chat-panel__glow--blue" aria-hidden="true"></div>

    <header class="chat-panel__header">
      <button class="chat-panel__back" type="button" title="返回" @click="ui.close_npc_chat()">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="chat-panel__title-wrap">
        <div ref="name_ref" class="chat-panel__name" :aria-label="ui.chat_npc ?? ''"></div>
        <span class="chat-panel__subtitle">PRIVATE CHAT</span>
      </div>
      <span class="chat-panel__header-spacer" aria-hidden="true"></span>
    </header>

    <div ref="messages_ref" class="chat-panel__messages">
      <div v-if="!messages.length && !ui.chat_sending" class="chat-panel__empty">
        <i class="fa-regular fa-comment-dots"></i>
        <span>发送消息开始私聊</span>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="chat-message"
        :class="{
          'chat-message--user': msg.role === 'user',
          'chat-message--npc': msg.role === 'npc',
          'chat-message--system': msg.role === 'system',
          'chat-message--active': msg.role === 'user' && active_menu_id === msg.id,
          'chat-message--editing': msg.role === 'user' && editing_id === msg.id,
        }"
      >
        <ChatAvatar
          v-if="msg.role === 'npc'"
          class="chat-message__avatar chat-message__avatar--npc"
          :src="npc_avatar"
          :label="ui.chat_npc ?? 'NPC'"
          :size="CHAT_AVATAR_SIZE"
        />

        <div v-if="msg.role === 'user'" class="chat-message__user-col">
          <div v-if="editing_id === msg.id" class="chat-message__edit-wrap">
            <textarea
              :id="`chat-edit-${msg.id}`"
              name="chat_edit"
              ref="edit_textarea_ref"
              v-model="edit_draft"
              class="chat-message__edit-input"
              rows="2"
              :disabled="ui.chat_sending"
              @keydown.enter.exact.prevent="save_edit(msg.id)"
            />
            <div class="chat-message__edit-actions">
              <button class="chat-message__action chat-message__action--ghost" type="button" @click="cancel_edit">
                取消
              </button>
              <button
                class="chat-message__action chat-message__action--primary"
                type="button"
                :disabled="ui.chat_sending || !edit_draft.trim()"
                @click="save_edit(msg.id)"
              >
                保存并重生成
              </button>
            </div>
          </div>

          <div
            v-else
            class="chat-message__bubble"
            :class="{ 'chat-message__bubble--clickable': true }"
            title="点击编辑或重新生成"
            @click="open_user_menu(msg.id, $event)"
          >
            {{ msg.text }}
          </div>

          <div
            v-if="active_menu_id === msg.id && editing_id !== msg.id"
            class="chat-message__menu"
            @click.stop
          >
            <button class="chat-message__menu-btn" type="button" @click="start_edit(msg)">
              <i class="fa-solid fa-pen"></i>
              编辑
            </button>
            <button
              class="chat-message__menu-btn"
              type="button"
              :disabled="ui.chat_sending"
              @click="regenerate(msg.id)"
            >
              <i class="fa-solid fa-rotate-right"></i>
              重新生成
            </button>
          </div>
        </div>

        <div v-else class="chat-message__bubble">{{ msg.text }}</div>

        <ChatAvatar
          v-if="msg.role === 'user'"
          class="chat-message__avatar chat-message__avatar--user"
          :src="user_persona.avatar"
          :label="user_persona.name"
          :size="CHAT_AVATAR_SIZE"
          tone="user"
        />
      </div>

      <div v-if="ui.chat_sending" class="chat-message chat-message--npc chat-message--typing">
        <ChatAvatar
          class="chat-message__avatar chat-message__avatar--npc"
          :src="npc_avatar"
          :label="ui.chat_npc ?? 'NPC'"
          :size="CHAT_AVATAR_SIZE"
        />
        <div class="chat-message__bubble chat-message__bubble--typing">
          <span ref="dot1" class="typing-dot"></span>
          <span ref="dot2" class="typing-dot"></span>
          <span ref="dot3" class="typing-dot"></span>
          <span class="typing-label">对方正在输入</span>
        </div>
      </div>
    </div>

    <footer class="chat-panel__composer">
      <div class="chat-panel__input-wrap">
        <input
          id="chat-composer-input"
          name="chat_message"
          v-model="draft"
          class="chat-panel__input"
          type="text"
          placeholder="输入消息…"
          :disabled="ui.chat_sending"
          @keydown.enter.prevent="send"
        />
      </div>
      <button
        class="chat-panel__send"
        type="button"
        :disabled="ui.chat_sending || !draft.trim()"
        :aria-busy="ui.chat_sending"
        @click="send"
      >
        <i v-if="ui.chat_sending" class="fa-solid fa-circle-notch fa-spin"></i>
        <i v-else class="fa-solid fa-paper-plane"></i>
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { resolveNpcAvatar } from '../../config';
import { getUserPersonaDisplay } from '../../chatPersona';
import { CHAT_AVATAR_SIZE } from '../../media';
import { useUiStore } from '../../store';
import ChatAvatar from '../ChatAvatar.vue';

const ui = useUiStore();

const draft = ref('');
const active_menu_id = ref<string | null>(null);
const editing_id = ref<string | null>(null);
const edit_draft = ref('');
const messages_ref = ref<HTMLElement | null>(null);
const name_ref = ref<HTMLElement | null>(null);
const edit_textarea_ref = ref<HTMLTextAreaElement | null>(null);
const dot1 = ref<HTMLElement | null>(null);
const dot2 = ref<HTMLElement | null>(null);
const dot3 = ref<HTMLElement | null>(null);
const user_persona = ref(getUserPersonaDisplay());

let name_tween: gsap.core.Tween | null = null;
let typing_tween: gsap.core.Timeline | null = null;

const messages = computed(() => (ui.chat_npc ? (ui.chat_threads[ui.chat_npc] ?? []) : []));

const npc_avatar = computed(() => {
  const name = ui.chat_npc;
  if (!name) return '';
  return resolveNpcAvatar(name);
});

function refresh_user_persona() {
  user_persona.value = getUserPersonaDisplay();
}

function scroll_to_bottom() {
  nextTick(() => {
    const el = messages_ref.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

function animate_name(name: string) {
  const el = name_ref.value;
  if (!el || !name) return;

  name_tween?.kill();
  el.textContent = '';
  el.classList.remove('chat-panel__name--idle');

  const state = { progress: 0 };
  name_tween = gsap.to(state, {
    progress: 1,
    duration: Math.min(0.08 * name.length, 1.2),
    ease: 'none',
    onUpdate: () => {
      const count = Math.max(1, Math.round(state.progress * name.length));
      el.textContent = name.slice(0, count);
    },
    onComplete: () => {
      el.textContent = name;
      el.classList.add('chat-panel__name--idle');
    },
  });
}

function start_typing_animation() {
  typing_tween?.kill();
  const dots = [dot1.value, dot2.value, dot3.value].filter(Boolean) as HTMLElement[];
  if (!dots.length) return;

  gsap.set(dots, { y: 0, opacity: 0.45 });
  typing_tween = gsap.timeline({ repeat: -1 });
  dots.forEach((dot, index) => {
    typing_tween!.to(
      dot,
      { y: -5, opacity: 1, duration: 0.32, ease: 'sine.out' },
      index * 0.14,
    );
    typing_tween!.to(dot, { y: 0, opacity: 0.45, duration: 0.32, ease: 'sine.in' }, index * 0.14 + 0.32);
  });
}

function stop_typing_animation() {
  typing_tween?.kill();
  typing_tween = null;
}

watch(
  () => ui.chat_npc,
  name => {
    active_menu_id.value = null;
    editing_id.value = null;
    edit_draft.value = '';
    if (!name) return;
    refresh_user_persona();
    nextTick(() => animate_name(name));
  },
  { immediate: true },
);

watch(
  () => [messages.value.length, ui.chat_sending] as const,
  () => scroll_to_bottom(),
);

watch(
  () => ui.chat_sending,
  sending => {
    if (sending) {
      scroll_to_bottom();
      nextTick(() => start_typing_animation());
    } else {
      stop_typing_animation();
    }
  },
);

useIntervalFn(refresh_user_persona, 5000);

function close_menus() {
  active_menu_id.value = null;
}

function open_user_menu(message_id: string, event: MouseEvent) {
  if (ui.chat_sending || editing_id.value) return;
  event.stopPropagation();
  active_menu_id.value = active_menu_id.value === message_id ? null : message_id;
}

function start_edit(msg: { id: string; text: string }) {
  editing_id.value = msg.id;
  edit_draft.value = msg.text;
  active_menu_id.value = null;
  nextTick(() => {
    const el = edit_textarea_ref.value;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
}

function cancel_edit() {
  editing_id.value = null;
  edit_draft.value = '';
}

async function save_edit(message_id: string) {
  const text = edit_draft.value.trim();
  if (!text || ui.chat_sending) return;
  editing_id.value = null;
  edit_draft.value = '';
  await ui.edit_npc_chat_message(message_id, text);
}

async function regenerate(message_id: string) {
  if (ui.chat_sending) return;
  active_menu_id.value = null;
  await ui.regenerate_npc_chat(message_id);
}

function on_document_click() {
  close_menus();
}

onMounted(() => {
  document.addEventListener('click', on_document_click);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', on_document_click);
  name_tween?.kill();
  stop_typing_animation();
});

async function send() {
  const text = draft.value;
  if (!text.trim() || ui.chat_sending) return;
  draft.value = '';
  await ui.send_npc_chat(text);
}
</script>

<style lang="scss" scoped>
.chat-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  margin: -12px;
  overflow: hidden;
  background: var(--gal-gradient-bg);
}

.chat-panel__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
  pointer-events: none;
  opacity: 0.55;

  &--pink {
    width: 180px;
    height: 180px;
    top: -40px;
    right: -20px;
    background: rgba(244, 114, 182, 0.35);
  }

  &--blue {
    width: 200px;
    height: 200px;
    bottom: 60px;
    left: -60px;
    background: rgba(96, 165, 250, 0.28);
  }
}

.chat-panel__header {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--gal-border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
  backdrop-filter: blur(12px);
}

.chat-panel__header-spacer {
  width: 36px;
}

.chat-panel__back {
  width: 36px;
  height: 36px;
  border: 1px solid var(--gal-border);
  border-radius: 12px;
  background: var(--gal-glass);
  color: #e2e8f0;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.15s;

  &:hover {
    border-color: rgba(244, 114, 182, 0.45);
    background: rgba(244, 114, 182, 0.12);
    transform: translateX(-1px);
  }
}

.chat-panel__title-wrap {
  min-width: 0;
  text-align: center;
}

.chat-panel__name {
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 1.35em;
}

.chat-panel__name--idle {
  color: var(--gal-pink);
  animation: chat-name-glow 4s ease-in-out infinite alternate;
}

@keyframes chat-name-glow {
  0% {
    filter: drop-shadow(0 0 4px rgba(244, 114, 182, 0.25));
  }

  100% {
    filter: drop-shadow(0 0 10px rgba(96, 165, 250, 0.35));
  }
}

.chat-panel__subtitle {
  display: block;
  margin-top: 2px;
  font-size: 9px;
  letter-spacing: 0.22em;
  color: rgba(226, 232, 240, 0.45);
}

.chat-panel__messages {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: linear-gradient(var(--gal-pink), var(--gal-blue));
  }
}

.chat-panel__empty {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: rgba(226, 232, 240, 0.45);
  font-size: 12px;

  i {
    font-size: 28px;
    color: var(--gal-violet);
  }
}

.chat-message {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;

  &--user {
    flex-direction: row;
    justify-content: flex-end;

    .chat-message__bubble {
      background: linear-gradient(135deg, var(--gal-pink-deep) 0%, var(--gal-pink) 55%, #fb7185 100%);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-bottom-right-radius: 6px;
      box-shadow: 0 8px 24px rgba(236, 72, 153, 0.28);
    }
  }

  &--active .chat-message__bubble--clickable {
    box-shadow:
      0 8px 24px rgba(236, 72, 153, 0.35),
      0 0 0 2px rgba(255, 255, 255, 0.35);
  }

  &--editing {
    align-items: center;
  }

  &--npc {
    flex-direction: row;
    justify-content: flex-start;

    .chat-message__bubble {
      max-width: calc(100% - 54px);
      background: linear-gradient(145deg, rgba(96, 165, 250, 0.22) 0%, rgba(167, 139, 250, 0.16) 100%);
      border: 1px solid rgba(147, 197, 253, 0.28);
      border-bottom-left-radius: 6px;
      box-shadow: 0 8px 22px rgba(59, 130, 246, 0.12);
      backdrop-filter: blur(8px);
    }
  }

  &--system {
    justify-content: center;

    .chat-message__bubble {
      background: rgba(255, 255, 255, 0.04);
      color: rgba(226, 232, 240, 0.55);
      font-size: 10px;
      padding: 5px 12px;
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      max-width: 100%;
    }
  }

  &--typing .chat-message__bubble {
    min-width: 88px;
  }
}

.chat-message__avatar {
  flex-shrink: 0;
  align-self: center;
}

.chat-message__user-col {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  max-width: calc(100% - 54px);

  .chat-message__bubble {
    max-width: 100%;
  }
}

.chat-message__bubble--clickable {
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 28px rgba(236, 72, 153, 0.38);
  }
}

.chat-message__menu {
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--gal-border);
  background: rgba(15, 20, 38, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.chat-message__menu-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;

  i {
    font-size: 10px;
    opacity: 0.85;
  }

  &:hover:not(:disabled) {
    background: rgba(244, 114, 182, 0.18);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.chat-message__edit-wrap {
  width: 100%;
  min-width: 180px;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid rgba(244, 114, 182, 0.45);
  background: rgba(15, 20, 38, 0.95);
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.2);
}

.chat-message__edit-input {
  width: 100%;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
  font-size: 13px;
  line-height: 1.5;
  font-family: inherit;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: rgba(244, 114, 182, 0.5);
  }

  &:disabled {
    opacity: 0.65;
  }
}

.chat-message__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.chat-message__action {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;

  &--ghost {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(226, 232, 240, 0.75);

    &:hover {
      background: rgba(255, 255, 255, 0.06);
    }
  }

  &--primary {
    background: var(--gal-gradient-primary);
    color: #fff;
    border: none;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.chat-message__bubble {
  max-width: calc(100% - 54px);
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  color: #f1f5f9;
}

.chat-message__bubble--typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 14px;
}

.typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--gal-blue) 0%, var(--gal-violet) 100%);
}

.typing-label {
  margin-left: 6px;
  font-size: 11px;
  color: rgba(226, 232, 240, 0.55);
  white-space: nowrap;
}

.chat-panel__composer {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 14px;
  border-top: 1px solid var(--gal-border);
  background: linear-gradient(0deg, rgba(12, 18, 34, 0.95) 0%, rgba(255, 255, 255, 0.04) 100%);
  backdrop-filter: blur(14px);
}

.chat-panel__input-wrap {
  flex: 1;
  min-width: 0;
  padding: 1px;
  border-radius: 999px;
  background: var(--gal-gradient-input);
}

.chat-panel__input {
  width: 100%;
  padding: 10px 16px;
  border-radius: 999px;
  border: none;
  background: rgba(15, 20, 38, 0.92);
  color: #f8fafc;
  font-size: 13px;
  font-family: inherit;

  &::placeholder {
    color: rgba(226, 232, 240, 0.38);
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }
}

.chat-panel__send {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 14px;
  background: var(--gal-gradient-primary);
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(99, 102, 241, 0.35);
  transition:
    transform 0.15s,
    box-shadow 0.2s,
    opacity 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 28px rgba(236, 72, 153, 0.35);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }
}
</style>

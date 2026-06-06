<template>
  <section class="input-panel">
    <div class="gal-section-label input-panel__label">
      <span>{{ panel_title }}</span>
      <span v-if="gal.sending" class="input-panel__sending"><i class="fa-solid fa-circle-notch fa-spin"></i> 生成中</span>
    </div>
    <p v-if="wild_blocked_hint" class="input-panel__hint">{{ wild_blocked_hint }}</p>
    <p v-else-if="block_hint" class="input-panel__hint">{{ block_hint }}</p>

    <div v-if="show_wild_summarize" class="input-panel__wild">
      <p class="input-panel__wild-desc">你已在野外进行过遭遇战，可将历练经历整理成剧情。</p>
      <button
        class="input-panel__summarize gal-btn gal-btn--primary gal-btn--pill"
        type="button"
        :disabled="gal.sending"
        @click="summarize_wild()"
      >
        <i :class="gal.sending ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-book-open'"></i>
        {{ gal.sending ? '正在总结…' : '总结遇敌经历' }}
      </button>
    </div>

    <div v-else-if="show_free_input" class="input-panel__row">
      <div class="input-panel__wrap">
        <input
          id="gal-user-input"
          name="user_input"
          v-model="gal.user_input"
          class="input-panel__input"
          type="text"
          placeholder="输入行动或对话，发送给 AI…"
          :disabled="gal.sending"
          @keydown.enter="submit()"
        />
      </div>
      <button
        class="input-panel__regenerate gal-btn gal-btn--pill"
        type="button"
        title="重新生成上一段 AI 剧情"
        :disabled="!gal.can_regenerate || gal.sending"
        @click="regenerate()"
      >
        <i :class="gal.sending ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-rotate-right'"></i>
      </button>
      <button
        class="input-panel__send gal-btn gal-btn--primary gal-btn--icon"
        type="button"
        :disabled="gal.sending || !gal.user_input.trim()"
        @click="submit()"
      >
        <i :class="gal.sending ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-paper-plane'"></i>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useCombatStore } from '../combatStore';
import { useGalStore, useUiStore } from '../store';
import { has_pending_wild_journal, wild_journal_version } from '../wildJournal';

const gal = useGalStore();
const ui = useUiStore();
const combat = useCombatStore();

const wild_journal_pending = computed(() => {
  wild_journal_version.value;
  return has_pending_wild_journal();
});

const combat_blocks_wild = computed(
  () => combat.active || combat.show_battle_result || combat.has_encounter_offer,
);

const gal_blocks_wild = computed(() => gal.is_event_pending || gal.is_at_battle_step);

const show_wild_summarize = computed(
  () => wild_journal_pending.value && !ui.chat_npc && !combat_blocks_wild.value && !gal_blocks_wild.value,
);

const block_hint = computed(() => {
  if (wild_journal_pending.value) return '';
  if (gal.is_event_pending) return '请先在上方「场景/背景」中做出选择';
  if (gal.is_at_battle_step) return '请先完成遭遇战';
  if (gal.pending_battle_index !== null && !gal.is_at_battle_step) return '继续浏览剧情以触发遭遇战';
  return '';
});

const wild_blocked_hint = computed(() => {
  if (!wild_journal_pending.value || show_wild_summarize.value) return '';
  if (combat.active || combat.show_battle_result) return '请先完成当前战斗，再总结遇敌经历';
  if (combat.has_encounter_offer) return '请先处理当前遭遇，再总结遇敌经历';
  if (gal.is_event_pending) return '请先在上方「场景/背景」中做出选择';
  if (gal.is_at_battle_step) return '请先完成遭遇战';
  return '';
});

const show_free_input = computed(() => !ui.chat_npc && !wild_journal_pending.value && !block_hint.value);

const panel_title = computed(() => (show_wild_summarize.value ? '野外历练' : '输入'));

async function submit() {
  if (block_hint.value || !show_free_input.value) return;
  await gal.submitInput();
}

async function regenerate() {
  if (!gal.can_regenerate || gal.sending || !show_free_input.value) return;
  try {
    await gal.regenerateLastReply();
  } catch (error) {
    console.error('[重新生成] 失败', error);
    toastr.error(error instanceof Error ? error.message : '重新生成失败，请重试');
  }
}

async function summarize_wild() {
  if (!show_wild_summarize.value || gal.sending) return;
  try {
    await gal.summarizeWildJournal();
  } catch (error) {
    console.error('[野外总结] 发送失败', error);
    toastr.error(error instanceof Error ? error.message : '总结失败，请重试');
  }
}
</script>

<style lang="scss" scoped>
.input-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 2;
}

.input-panel__label {
  width: 100%;
}

.input-panel__sending {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  letter-spacing: 0;
  text-transform: none;
  color: var(--gal-pink);

  &::before {
    display: none;
  }
}

.input-panel__hint {
  margin: 0;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--gal-text-muted);
  border: 1px dashed var(--gal-border);
  border-radius: var(--gal-radius-sm);
  background: var(--gal-glass);
}

.input-panel__wild {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-panel__wild-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--gal-text-muted);
  text-align: center;
}

.input-panel__summarize {
  width: 100%;
  justify-content: center;
  min-height: 42px;
  font-size: 13px;
  font-weight: 700;
}

.input-panel__row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.input-panel__wrap {
  flex: 1;
  min-width: 0;
  padding: 1px;
  border-radius: var(--gal-radius-pill);
  background: var(--gal-gradient-input);
}

.input-panel__input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--gal-radius-pill);
  border: none;
  background: rgba(10, 14, 26, 0.92);
  color: var(--gal-text);
  font-size: 13px;
  font-family: inherit;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: var(--gal-text-muted);
  }

  &:disabled {
    opacity: 0.6;
  }
}

.input-panel__regenerate {
  flex-shrink: 0;
  min-width: 42px;
  min-height: 42px;
  padding: 0 12px;
  color: var(--gal-violet);
  border-color: rgba(139, 92, 246, 0.35);

  &:hover:not(:disabled) {
    color: #c4b5fd;
    border-color: rgba(139, 92, 246, 0.55);
    background: rgba(139, 92, 246, 0.12);
  }

  &:disabled {
    opacity: 0.45;
  }
}

.input-panel__send {
  flex-shrink: 0;
}
</style>

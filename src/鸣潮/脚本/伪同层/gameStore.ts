import { formatWuwaError, notifyWuwaError } from '../../shared/wuwaTavern';
import { getLastRegenerableExchange, regenerateLastWuwaMessage, sendWuwaMessage } from './gameFlow';
import { parseWuwaMessage } from './wuwaParser';
import { getLatestWuwaMessage, useMessageScope } from './messageScope';

export const useGameStore = defineStore('wuwa_game', () => {
  const { message_text, is_streaming } = useMessageScope();

  const user_input = ref('');
  const sending = ref(false);
  const hub_message = ref('');

  const parsed = computed(() => parseWuwaMessage(hub_message.value || message_text.value));
  const can_regenerate = computed(() => {
    try {
      return Boolean(getLastRegenerableExchange());
    } catch {
      return false;
    }
  });

  function refreshMessage() {
    try {
      const latest = getLatestWuwaMessage();
      if (latest) hub_message.value = latest.message;
      else if (message_text.value) hub_message.value = message_text.value;
    } catch (error) {
      console.warn('[鸣潮伪同层] refreshMessage 失败', error);
    }
  }

  async function submitInput(text?: string) {
    const input = (text ?? user_input.value).trim();
    if (!input || sending.value) return;
    sending.value = true;
    try {
      const message = await sendWuwaMessage(input);
      hub_message.value = message;
      user_input.value = '';
      refreshMessage();
    } catch (error) {
      console.error('[鸣潮伪同层] 发送失败', error);
      notifyWuwaError(formatWuwaError(error));
      throw error;
    } finally {
      sending.value = false;
    }
  }

  async function regenerateLastReply() {
    if (!can_regenerate.value || sending.value) return;
    sending.value = true;
    try {
      const message = await regenerateLastWuwaMessage();
      hub_message.value = message;
      refreshMessage();
    } catch (error) {
      console.error('[鸣潮伪同层] 重新生成失败', error);
      notifyWuwaError(formatWuwaError(error));
      throw error;
    } finally {
      sending.value = false;
    }
  }

  function applyOption(text: string) {
    user_input.value = text;
    void submitInput(text);
  }

  watch(message_text, () => refreshMessage());
  refreshMessage();

  watch(
    () => parsed.value.gal?.segments,
    segments => {
      if (!segments?.length) return;
      for (const seg of segments) {
        if (seg.type === 'main' && seg.pic) {
          window.unlockCgByRoleAndScene?.(seg.name, seg.pic);
        }
      }
      const raw = hub_message.value || message_text.value;
      if (raw.includes('<gal>')) window.unlockCgFromGalContent?.(raw);
    },
    { deep: true, immediate: true },
  );

  eventOn(tavern_events.STREAM_TOKEN_RECEIVED, () => refreshMessage());
  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, () => refreshMessage());

  return {
    user_input,
    sending,
    parsed,
    can_regenerate,
    is_streaming,
    submitInput,
    regenerateLastReply,
    applyOption,
    refreshMessage,
  };
});

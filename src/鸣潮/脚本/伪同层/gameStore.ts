import { getTavernHostDocument } from '../../shared/chatHost';
import { formatWuwaError, notifyWuwaError } from '../../shared/wuwaTavern';
import { getLastRegenerableExchange } from './gameFlow';
import { parseWuwaMessage } from './wuwaParser';
import { getLatestWuwaMessage, useMessageScope } from './messageScope';
import type { WuwaGalSegment } from './wuwaParser';

export const useGameStore = defineStore('wuwa_game', () => {
  const { message_text, is_streaming, message_id } = useMessageScope();

  const user_input = ref('');
  const sending = ref(false);
  const hub_message = ref('');
  /** 最近一次通过伪同层输入栏发送的用户消息，用于在剧情末尾注入用户气泡 */
  const pending_user_message = ref<string | null>(null);
  /** 用户消息是否已被 AI 消费过一次（AI 已回复），消费后的气泡移到段列表顶部而非末尾 */
  const user_message_consumed = ref(false);

  const parsed = computed(() => {
    const result = parseWuwaMessage(hub_message.value || message_text.value);
    if (pending_user_message.value && result.gal) {
      const userSeg = { type: 'user' as const, content: pending_user_message.value };
      const gal: WuwaGalSegment = {
        ...result.gal,
        // 未消费时挂末尾（用户刚发送），消费后挂顶部（AI 已回复）
        segments: user_message_consumed.value
          ? [userSeg, ...result.gal.segments]
          : [...result.gal.segments, userSeg],
      };
      return { ...result, gal };
    }
    return result;
  });

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

  /** 将文本注入酒馆原生输入框并点击发送，复用酒馆的 API 调用、流式处理、错误展示 */
  function submitInput(text?: string) {
    const input = (text ?? user_input.value).trim();
    if (!input || sending.value) return;

    try {
      const doc = getTavernHostDocument();

      const textarea = doc.querySelector('#send_textarea') as HTMLTextAreaElement | null;
      if (!textarea) {
        notifyWuwaError('找不到酒馆输入框，请刷新页面后重试');
        return;
      }

      // 注入文本并派发 input 事件，让 SillyTavern 感知内容变化
      textarea.value = input;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      const sendBtn = doc.querySelector('#send_but') as HTMLElement | null;
      if (!sendBtn) {
        notifyWuwaError('找不到酒馆发送按钮，请刷新页面后重试');
        return;
      }
      sendBtn.click();

      // 记录用户输入，用于在剧情末尾渲染用户气泡（未消费状态）
      pending_user_message.value = input;
      user_message_consumed.value = false;
      user_input.value = '';
      sending.value = true;
      // sending 状态由 GENERATION_ENDED 事件来重置
    } catch (error) {
      console.error('[鸣潮伪同层] 注入酒馆输入框失败', error);
      notifyWuwaError(formatWuwaError(error));
    }
  }

  /** UserBubble 编辑保存时同步更新 pending_user_message */
  function setPendingUserMessage(value: string) {
    pending_user_message.value = value;
  }

  /** 点击酒馆原生重新生成按钮 */
  function regenerateLastReply() {
    if (!can_regenerate.value || sending.value) return;

    try {
      const doc = getTavernHostDocument();
      const regenBtn = doc.querySelector('#regenerate_but') as HTMLButtonElement | null;
      if (!regenBtn || regenBtn.disabled) {
        notifyWuwaError('当前无法重新生成');
        return;
      }
      regenBtn.click();
      sending.value = true;
    } catch (error) {
      console.error('[鸣潮伪同层] 重新生成失败', error);
      notifyWuwaError(formatWuwaError(error));
    }
  }

  /** 编辑用户气泡后：中止生成 → 编辑最后一条用户消息 → 重新生成，而非追加新消息 */
  function editBubbleAndRegenerate(text: string) {
    const input = text.trim();
    if (!input) return;

    // 更新气泡显示（未消费状态，气泡在末尾）
    pending_user_message.value = input;
    user_message_consumed.value = false;
    sending.value = true;

    // 中止当前生成
    try {
      SillyTavern.stopGeneration();
    } catch {
      /* SillyTavern 可能未加载 */
    }

    // 找到最后一条 role=user 的消息并编辑其正文
    try {
      const lastMsg = getChatMessages(-1)[0];
      if (lastMsg?.role === 'user') {
        setChatMessages([{ message_id: lastMsg.message_id, message: input }]);
      } else if (lastMsg?.role === 'assistant') {
        // 如果 AI 已经回复了，用户消息在倒数第二楼
        const userMsg = getChatMessages(-2)[0];
        if (userMsg?.role === 'user') {
          setChatMessages([{ message_id: userMsg.message_id, message: input }]);
        }
      }
    } catch (error) {
      console.warn('[鸣潮伪同层] 编辑用户消息失败', error);
    }

    // stopGeneration 可能同步触发了 GENERATION_ENDED 重置 sending/consumed，重新修正
    sending.value = true;
    user_message_consumed.value = false;

    // 触发重新生成：优先点击再生按钮，不可用时回退到 slash 命令
    try {
      const doc = getTavernHostDocument();
      const regenBtn = doc.querySelector('#regenerate_but') as HTMLButtonElement | null;
      if (regenBtn && !regenBtn.disabled) {
        regenBtn.click();
      } else {
        triggerSlash('/regenerate');
      }
    } catch (error) {
      console.error('[鸣潮伪同层] 触发重新生成失败', error);
      notifyWuwaError(formatWuwaError(error));
      sending.value = false;
    }
  }

  function applyOption(text: string) {
    user_input.value = text;
    submitInput(text);
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
  // 酒馆生成结束时重置发送状态，并将当前用户气泡标记为已消费（移到段列表顶部）
  eventOn(tavern_events.GENERATION_ENDED, () => {
    sending.value = false;
    user_message_consumed.value = true;
  });

  return {
    user_input,
    sending,
    parsed,
    can_regenerate,
    is_streaming,
    message_id,
    pending_user_message,
    user_message_consumed,
    submitInput,
    setPendingUserMessage,
    regenerateLastReply,
    applyOption,
    editBubbleAndRegenerate,
    refreshMessage,
  };
});
import type { StreamingMessageContext } from '@util/streaming';

function resolveScopeMessageId(): number {
  try {
    return getCurrentMessageId();
  } catch {
    const messages = getChatMessages('0-{{lastMessageId}}', { role: 'assistant' });
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i].message ?? '';
      if (hasGalBlock(message)) {
        return messages[i].message_id;
      }
    }
    return 0;
  }
}

export function useMessageScope() {
  const streaming = inject<StreamingMessageContext | null>('streaming_message_context', null);

  const message_id = computed(() => {
    if (streaming) return streaming.message_id;
    return resolveScopeMessageId();
  });

  const message_text = computed(() => {
    if (streaming) return streaming.message;
    return getChatMessages(message_id.value)[0]?.message ?? '';
  });

  const is_streaming = computed(() => streaming?.during_streaming ?? false);

  return { streaming, message_id, message_text, is_streaming };
}

export function hasGalBlock(message: string): boolean {
  return /<gal>[\s\S]*?<\/gal>/i.test(message);
}

export function isOpeningFloor(message_id: number): boolean {
  return message_id === 0;
}

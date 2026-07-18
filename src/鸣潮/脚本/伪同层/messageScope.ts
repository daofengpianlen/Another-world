import type { StreamingMessageContext } from '@util/streaming';
import { OPENING_MARKER } from '../开场/constants';
import { getTavernHelper } from '../../shared/wuwaTavern';
import { HUB_FLOOR_ID } from './constants';
import {
  chatHasWuwaGameStarted,
  getLatestWuwaMessage,
  hasGalBlock,
  resolveLatestGalFloorFromDom,
  resolveLatestGalMessageId,
} from './wuwaParser';

export { getLatestWuwaMessage, chatHasWuwaGameStarted, resolveLatestGalFloorFromDom, resolveLatestGalMessageId };

/** @deprecated 内容跟随 getLatestWuwaMessage；iframe 固定挂第 0 楼 */
export function resolveHubMountFloorId(): number {
  return HUB_FLOOR_ID;
}

/**
 * 伪同层 iframe 固定挂在第 0 楼（与开场 regex 一致）；
 * 剧情正文由 gameStore 从最新 <gal> 楼层读取，不要求 0 楼本身含 gal。
 */
export function shouldMountHub(message_id: number, message: string): boolean {
  if (message_id !== HUB_FLOOR_ID) return false;
  if (chatHasWuwaGameStarted()) return true;
  if (hasGalBlock(message)) return true;
  return message.includes(OPENING_MARKER);
}

/** @deprecated 使用 shouldMountHub */
export function isHubFloor(message_id: number): boolean {
  return message_id === HUB_FLOOR_ID;
}

export function useMessageScope() {
  const streaming = inject<StreamingMessageContext | null>('streaming_message_context', null);

  const message_id = computed(() => {
    if (streaming) return streaming.message_id;
    return getLatestWuwaMessage()?.message_id ?? 0;
  });

  const message_text = computed(() => {
    if (streaming?.during_streaming) return streaming.message;
    const latest = getLatestWuwaMessage();
    if (latest) return latest.message;
    try {
      return getTavernHelper().getChatMessages(message_id.value)[0]?.message ?? '';
    } catch {
      return streaming?.message ?? '';
    }
  });

  const is_streaming = computed(() => streaming?.during_streaming ?? false);

  return { streaming, message_id, message_text, is_streaming };
}

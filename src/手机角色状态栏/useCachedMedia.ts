import type { Ref } from 'vue';
import { ensureCachedMediaUrl, peekCachedBlobUrl } from './mediaCache';
import { isVideoUrl, resolveMediaUrl } from './media';

export function useCachedMedia(url: Ref<string> | ComputedRef<string>) {
  const display_url = ref('');
  const remote_url = computed(() => resolveMediaUrl(toValue(url)));

  watch(
    remote_url,
    async next => {
      if (!next) {
        display_url.value = '';
        return;
      }
      if (/^(data:|blob:)/i.test(next)) {
        display_url.value = next;
        return;
      }
      display_url.value = peekCachedBlobUrl(next) ?? next;
      const cached = await ensureCachedMediaUrl(next);
      if (cached) display_url.value = cached;
    },
    { immediate: true },
  );

  const is_video = computed(() => isVideoUrl(display_url.value || remote_url.value));

  return { display_url, remote_url, is_video };
}

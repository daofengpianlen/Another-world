<template>
  <video
    v-if="resolved && is_video"
    class="media-view"
    :class="{ 'media-view--contain': fit === 'contain' }"
    :src="resolved"
    autoplay
    loop
    muted
    playsinline
  ></video>
  <img
    v-else-if="resolved"
    class="media-view"
    :class="{ 'media-view--contain': fit === 'contain' }"
    :src="resolved"
    :alt="label"
  />
</template>

<script setup lang="ts">
import { isVideoUrl, resolveMediaUrl } from '../media';

const props = withDefaults(
  defineProps<{
    url: string;
    label?: string;
    fit?: 'cover' | 'contain';
  }>(),
  { label: '', fit: 'cover' },
);

const resolved = computed(() => resolveMediaUrl(props.url));
const is_video = computed(() => isVideoUrl(resolved.value));
</script>

<style lang="scss" scoped>
.media-view {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #0b0f14;
}

.media-view--contain {
  object-fit: contain;
}
</style>

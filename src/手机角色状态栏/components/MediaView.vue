<template>
  <video
    v-if="display_url && is_video"
    class="media-view"
    :class="{ 'media-view--contain': fit === 'contain' }"
    :src="display_url"
    autoplay
    loop
    muted
    playsinline
  ></video>
  <img
    v-else-if="display_url"
    class="media-view"
    :class="{ 'media-view--contain': fit === 'contain' }"
    :src="display_url"
    :alt="label"
  />
</template>

<script setup lang="ts">
import { useCachedMedia } from '../useCachedMedia';

const props = withDefaults(
  defineProps<{
    url: string;
    label?: string;
    fit?: 'cover' | 'contain';
  }>(),
  { label: '', fit: 'cover' },
);

const source = computed(() => props.url);
const { display_url, is_video } = useCachedMedia(source);
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

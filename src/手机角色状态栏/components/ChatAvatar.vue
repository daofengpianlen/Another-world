<template>
  <PortraitCircle :src="src" :label="label" :size="size" :tone="tone" />
</template>

<script setup lang="ts">
import PortraitCircle from './PortraitCircle.vue';
import { CHAT_AVATAR_SIZE } from '../media';

withDefaults(
  defineProps<{
    src?: string;
    label: string;
    /** @deprecated 半身图裁切已内置，保留兼容 */
    portrait?: boolean;
    size?: number;
    tone?: 'npc' | 'user';
  }>(),
  { size: CHAT_AVATAR_SIZE, tone: 'npc' },
);
</script>

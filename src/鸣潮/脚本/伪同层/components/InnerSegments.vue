<template>
  <template v-for="(segment, index) in segments" :key="index">
    <NarrationBlock v-if="segment.type === 'p'" :content="segment.content" />
    <ZCharacterBubble
      v-else-if="segment.type === 'main'"
      :name="segment.name"
      :pic="segment.pic"
      :speech="segment.speech"
      :heart="segment.heart"
      :layout="hub_settings.settings.layout"
    />
    <OtherBubble
      v-else-if="segment.type === 'other'"
      :name="segment.name"
      :heart="segment.heart"
      :speech="segment.speech"
    />
    <UserBubble
      v-else-if="segment.type === 'user'"
      :content="segment.content"
    />
    <div v-else class="wuwa-html-chunk" v-html="segment.content"></div>
  </template>
</template>

<script setup lang="ts">
import NarrationBlock from './NarrationBlock.vue';
import OtherBubble from './OtherBubble.vue';
import UserBubble from './UserBubble.vue';
import ZCharacterBubble from './ZCharacterBubble.vue';
import { useHubSettingsStore } from '../hubSettingsStore';
import type { WuwaInnerSegment } from '../wuwaParser';

defineProps<{ segments: WuwaInnerSegment[] }>();

const hub_settings = useHubSettingsStore();
</script>

<style scoped lang="scss">
.wuwa-html-chunk {
  color: #334155;
  line-height: 1.6;
  margin-bottom: 10px;
  word-break: break-word;
}
</style>

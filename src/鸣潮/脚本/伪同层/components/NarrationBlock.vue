<template>
  <div class="narration">
    <div class="narration__box">{{ content }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ content: string }>();
</script>

<style scoped lang="scss">
.narration {
  margin-bottom: 15px;
  padding-bottom: 4px;
}

.narration__box {
  background: rgba(245, 245, 245, 0.85);
  border: 2px dashed #a9a9a9;
  border-radius: 15px;
  padding: 12px;
  color: #696969;
  font-size: calc(14px * var(--hub-font-scale, 1));
  line-height: 1.5;
  font-style: italic;
  white-space: pre-wrap;
}
</style>

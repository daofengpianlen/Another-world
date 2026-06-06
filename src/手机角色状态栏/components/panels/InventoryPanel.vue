<template>
  <section class="inventory-panel gal-panel-scroll">
    <div v-if="items.length" class="inventory-list">
      <article v-for="item in items" :key="item.name" class="inventory-item gal-card">
        <div class="inventory-item__head">
          <div class="inventory-item__name">{{ item.name }}</div>
          <span class="gal-badge">×{{ item.数量 }}</span>
        </div>
        <div class="inventory-item__desc">{{ item.描述 || '暂无描述' }}</div>
      </article>
    </div>
    <div v-else class="gal-empty">
      <i class="fa-solid fa-box-open"></i>
      <span>背包空空如也</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useDataStore } from '../../store';

const data = useDataStore();

const items = computed(() =>
  _(data.data.背包)
    .entries()
    .map(([name, item]) => ({ name, ...item }))
    .value(),
);
</script>

<style lang="scss" scoped>
.inventory-panel {
  min-height: 0;
  overflow-y: auto;
}

.inventory-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inventory-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.inventory-item__name {
  font-weight: 700;
  font-size: 14px;
  color: var(--gal-text);
}

.inventory-item__desc {
  font-size: 12px;
  color: var(--gal-text-muted);
  line-height: 1.5;
}
</style>

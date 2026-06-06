<template>
  <div class="npc-status" :class="{ 'npc-status--embedded': embedded }">
    <section v-for="section in sections" :key="section.title" class="npc-status__block">
      <h4 class="npc-status__heading">{{ section.icon }} {{ section.title }}</h4>
      <div v-if="section.rows.length" class="npc-status__rows">
        <p v-for="row in visible_rows(section)" :key="row.label" class="npc-status__row">
          <span v-if="row.prefix" class="npc-status__prefix">{{ row.prefix }}</span>
          <span class="npc-status__label">{{ row.label }}:</span>
          <span class="npc-status__value">{{ row.value }}</span>
        </p>
      </div>
      <ul v-if="section.bullets?.length" class="npc-status__list">
        <li v-for="(item, idx) in section.bullets" :key="idx">{{ item }}</li>
      </ul>
    </section>
    <p v-if="legacy_appearance" class="npc-status__legacy">
      <strong>外貌穿着</strong>{{ legacy_appearance }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { build_npc_status_sections, npc_has_structured_profile, type NpcStatusSection } from '../npcProfile';
import type { Schema } from '../schema';

const props = withDefaults(
  defineProps<{
    npc: Schema['邂逅名录'][string];
    embedded?: boolean;
  }>(),
  { embedded: false },
);

const sections = computed(() => build_npc_status_sections(props.npc));

const legacy_appearance = computed(() => {
  if (npc_has_structured_profile(props.npc)) return '';
  return props.npc.外貌穿着?.trim() || '';
});

function visible_rows(section: NpcStatusSection) {
  if (section.title === '互动记录' && section.bullets?.length) {
    return section.rows.filter(row => row.prefix);
  }
  return section.rows;
}
</script>

<style lang="scss" scoped>
.npc-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--gal-border);

  &--embedded {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
}

.npc-status__block {
  padding: 10px 12px;
  border-radius: var(--gal-radius-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.npc-status__heading {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--gal-text);
  letter-spacing: 0.02em;
}

.npc-status__rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.npc-status__row {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--gal-text-muted);
  word-break: break-word;
}

.npc-status__prefix {
  margin-right: 2px;
}

.npc-status__label {
  color: var(--gal-text);
  margin-right: 4px;
}

.npc-status__value {
  color: var(--gal-text-muted);
}

.npc-status__list {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--gal-text-muted);

  li {
    margin-bottom: 4px;
  }
}

.npc-status__legacy {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--gal-text-muted);

  strong {
    display: block;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: var(--gal-text);
    margin-bottom: 2px;
  }
}
</style>

<template>
  <section class="map-panel gal-panel-scroll">
    <p class="map-panel__here">
      <i class="fa-solid fa-map-pin"></i>
      当前位置：<strong>{{ current_region }}</strong>
    </p>
    <article v-for="region in MAP_REGIONS" :key="region.name" class="region-card gal-card">
      <div class="region-card__head">
        <strong>{{ region.name }}</strong>
        <span class="region-card__level gal-badge">Lv.{{ region.min_level }}–{{ region.max_level }}</span>
      </div>
      <p v-if="region.regional_boss" class="region-card__boss">
        <i class="fa-solid fa-skull"></i>区域 Boss：{{ region.regional_boss }}
      </p>
      <p class="region-card__desc">{{ region.description }}</p>
      <div v-if="region.sub_areas.length" class="region-card__areas">
        <span class="region-card__areas-label">主要区域</span>
        <ul class="region-card__areas-list">
          <li v-for="area in region.sub_areas" :key="area">
            <button
              class="region-card__area-btn"
              type="button"
              :title="`切换场景背景：${area}`"
              @click="onSelectSubArea(area)"
            >
              {{ area }}
            </button>
          </li>
        </ul>
      </div>
      <p v-if="region.story_hook" class="region-card__hook">
        <i class="fa-solid fa-bookmark"></i>{{ region.story_hook }}
      </p>
      <div class="region-card__actions">
        <button
          class="region-card__btn gal-btn gal-btn--primary"
          :class="{ 'region-card__btn--here': is_current_region(region.name) }"
          type="button"
          :disabled="is_teleport_disabled(region)"
          @click="onTeleport(region.name)"
        >
          <i v-if="gal.sending && !is_current_region(region.name)" class="fa-solid fa-circle-notch fa-spin"></i>
          <i v-else-if="is_current_region(region.name)" class="fa-solid fa-location-dot"></i>
          <i v-else class="fa-solid fa-location-arrow"></i>
          {{ teleport_label(region) }}
        </button>
        <button
          v-if="current_region === region.name"
          class="region-card__btn region-card__btn--wild gal-btn gal-btn--pill"
          type="button"
          :disabled="!can_wild_encounter || player_level < region.min_level"
          @click="onWildEncounter(region.name)"
        >
          <i class="fa-solid fa-skull-crossbones"></i>
          野外遇敌
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { MAP_REGIONS } from '../../config';
import { useCombatStore } from '../../combatStore';
import { useDataStore, useGalStore } from '../../store';
import { read_current_region, write_current_region } from '../../regionState';
import { request_wild_encounter } from '../../wildEncounter';

const data = useDataStore();
const gal = useGalStore();
const combat = useCombatStore();

const player_level = computed(() => data.data.主角.等级);
const current_region = ref(read_current_region());

function refresh_current_region() {
  current_region.value = read_current_region();
}

function is_current_region(region_name: string) {
  return current_region.value === region_name;
}

function is_teleport_disabled(region: (typeof MAP_REGIONS)[number]) {
  if (is_current_region(region.name)) return true;
  if (player_level.value < region.min_level) return true;
  if (gal.sending) return true;
  return false;
}

function teleport_label(region: (typeof MAP_REGIONS)[number]) {
  if (is_current_region(region.name)) return '已在此地';
  if (player_level.value < region.min_level) return '等级不足';
  if (gal.sending) return '传送中…';
  return '传送前往';
}

function onSelectSubArea(area: string) {
  if (gal.setMapAreaBackground(area)) {
    toastr.info(`场景背景：${area}`);
  }
}

function onTeleport(region_name: string) {
  if (is_current_region(region_name)) return;
  write_current_region(region_name);
  current_region.value = region_name;
  gal.teleportToRegion(region_name, player_level.value);
}

function onWildEncounter(region_name: string) {
  if (current_region.value !== region_name) {
    toastr.warning('请先传送至该区域再野外遇敌');
    return;
  }
  request_wild_encounter(region_name);
}

const can_wild_encounter = computed(
  () => !combat.active && !combat.has_encounter_offer && !gal.sending && !combat.fleeing,
);

let region_poll: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  refresh_current_region();
  region_poll = window.setInterval(refresh_current_region, 1500);
});

onUnmounted(() => {
  if (region_poll !== undefined) window.clearInterval(region_poll);
});
</script>

<style lang="scss" scoped>
.map-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.map-panel__here {
  margin: 0;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--gal-text-muted);
  border-radius: var(--gal-radius-sm);
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.2);

  i {
    margin-right: 6px;
    color: var(--gal-blue);
  }

  strong {
    color: var(--gal-text);
  }
}

.region-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;

  strong {
    font-size: 15px;
  }
}

.region-card__boss {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--gal-pink);

  i {
    margin-right: 4px;
    font-size: 10px;
  }
}

.region-card__desc {
  font-size: 12px;
  color: var(--gal-text-muted);
  line-height: 1.5;
  margin: 0 0 8px;
}

.region-card__areas {
  margin-bottom: 8px;
}

.region-card__areas-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--gal-blue);
  margin-bottom: 4px;
}

.region-card__areas-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--gal-text);

  li {
    margin-bottom: 2px;
  }
}

.region-card__area-btn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 11px;
  color: var(--gal-text);
  cursor: pointer;
  text-align: left;
  text-decoration: underline dotted rgba(56, 189, 248, 0.45);
  text-underline-offset: 2px;

  &:hover {
    color: var(--gal-blue);
  }
}

.region-card__hook {
  margin: 0 0 10px;
  padding: 6px 8px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--gal-violet);
  border-radius: var(--gal-radius-sm);
  background: rgba(139, 92, 246, 0.1);
  border: 1px dashed rgba(139, 92, 246, 0.25);

  i {
    margin-right: 4px;
    font-size: 9px;
  }
}

.region-card__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.region-card__btn {
  width: 100%;

  &--here {
    opacity: 0.72;
    cursor: not-allowed;
    border-color: rgba(56, 189, 248, 0.35);
    background: rgba(56, 189, 248, 0.12);
    color: var(--gal-blue);
  }

  &--wild {
    border-color: rgba(251, 113, 133, 0.35);
    color: var(--gal-pink);
  }
}
</style>

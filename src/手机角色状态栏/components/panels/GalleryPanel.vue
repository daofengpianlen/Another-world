<template>
  <section class="gallery-panel gal-panel-scroll">
    <div class="gallery-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="gal-chip"
        :class="{ 'gal-chip--active': selected_tab === tab.id }"
        @click="selected_tab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="current_tab" class="gallery-toolbar">
      <span class="gallery-toolbar__hint">{{ current_tab.label }} · {{ current_tab.scenes.length }} 张</span>
      <button
        v-if="current_tab.can_unlock_all"
        class="gallery-toolbar__unlock gal-btn gal-btn--pill"
        type="button"
        @click="unlockCurrentTab"
      >
        <i class="fa-solid fa-unlock"></i> 解锁全部
      </button>
    </div>

    <div v-if="current_tab" class="gallery-grid">
      <article
        v-for="scene in current_tab.scenes"
        :key="scene.label"
        class="gallery-card"
        :class="{ 'gallery-card--locked': !isUnlocked(scene) }"
      >
        <div class="gallery-card__media">
          <MediaView v-if="isUnlocked(scene)" :url="scene.url" :label="scene.label" fit="contain" />
          <div v-else class="gallery-card__locked">
            <i class="fa-solid fa-lock"></i>
          </div>
        </div>
        <p class="gallery-card__label">{{ scene.label }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getGalleryTabs, isSameMediaUrl, type GallerySceneItem } from '../../config';
import { SCENE_ASPECT } from '../../media';
import { useDataStore, useGalStore } from '../../store';
import MediaView from '../MediaView.vue';

const data = useDataStore();
const gal = useGalStore();

const selected_tab = ref('凛');

const tabs = computed(() =>
  getGalleryTabs().map(tab => {
    const can_unlock_all = (data.data.邂逅名录[tab.character]?.好感度 ?? 0) >= 100;
    return { ...tab, can_unlock_all };
  }),
);

const current_tab = computed(() => tabs.value.find(tab => tab.id === selected_tab.value) ?? tabs.value[0]);

function isUnlocked(scene: GallerySceneItem): boolean {
  const unlocked = data.data.已解锁CG[scene.character] ?? [];
  return unlocked.some(url => isSameMediaUrl(url, scene.url));
}

function unlockCurrentTab() {
  const tab = current_tab.value;
  if (!tab) return;
  gal.unlockAllCgForCharacter(tab.character);
}
</script>

<style lang="scss" scoped>
.gallery-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
}

.gallery-tabs {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.gallery-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--gal-text-muted);
}

.gallery-toolbar__unlock {
  font-size: 10px;
  color: var(--gal-gold);
  border-color: rgba(252, 211, 77, 0.35);
  background: rgba(252, 211, 77, 0.1);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.gallery-card__media {
  width: 100%;
  aspect-ratio: v-bind(SCENE_ASPECT);
  border-radius: var(--gal-radius-sm);
  overflow: hidden;
  border: 1px solid var(--gal-border);
  background: rgba(6, 10, 20, 0.85);
  transition: border-color var(--gal-transition);
}

.gallery-card:not(.gallery-card--locked) .gallery-card__media:hover {
  border-color: rgba(244, 114, 182, 0.45);
}

.gallery-card--locked .gallery-card__media {
  border-style: dashed;
  opacity: 0.85;
}

.gallery-card__locked {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gal-text-muted);
  background: var(--gal-glass);

  i {
    font-size: 22px;
    opacity: 0.6;
  }
}

.gallery-card__label {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--gal-text-muted);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-card--locked .gallery-card__label {
  opacity: 0.7;
}
</style>

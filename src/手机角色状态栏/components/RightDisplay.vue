<template>
  <div
    class="right-display gal-panel-scroll"
    :class="{
      'right-display--chat': !!ui.chat_npc,
      'right-display--npc-profile': !!ui.npc_profile_name && !ui.chat_npc,
    }"
  >
    <ChatPanel v-if="ui.chat_npc" />
    <NpcProfilePanel v-else-if="ui.npc_profile_name && props.active_panel === '邂逅名录'" />
    <div v-else-if="!active_panel" class="right-display__welcome gal-empty">
      <i class="fa-solid fa-hand-sparkles"></i>
      <p>点击下方功能按钮查看详情</p>
    </div>
    <ProtagonistPanel v-else-if="active_panel === '主角状态'" />
    <InventoryPanel v-else-if="active_panel === '背包物品'" />
    <MapPanel v-else-if="active_panel === '地图'" />
    <NpcDirectoryPanel v-else-if="active_panel === '邂逅名录'" />
    <GalleryPanel v-else-if="active_panel === '回忆画廊'" />
  </div>
</template>

<script setup lang="ts">
import type { PanelId } from '../FunctionBar.vue';
import { useUiStore } from '../store';
import ChatPanel from './panels/ChatPanel.vue';
import GalleryPanel from './panels/GalleryPanel.vue';
import InventoryPanel from './panels/InventoryPanel.vue';
import MapPanel from './panels/MapPanel.vue';
import NpcDirectoryPanel from './panels/NpcDirectoryPanel.vue';
import NpcProfilePanel from './panels/NpcProfilePanel.vue';
import ProtagonistPanel from './panels/ProtagonistPanel.vue';

const props = defineProps<{
  active_panel: PanelId | null;
}>();

const ui = useUiStore();

watch(
  () => props.active_panel,
  panel => {
    if (panel !== '邂逅名录') {
      ui.close_npc_profile();
    }
  },
);
</script>

<style lang="scss" scoped>
.right-display {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px 14px;
}

.right-display--chat {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.right-display__welcome {
  min-height: 140px;

  p {
    margin: 0;
    font-size: 13px;
  }
}
</style>

<template>
  <section class="npc-panel gal-panel-scroll">
    <div v-if="npc_list.length" class="npc-list">
      <article v-for="npc in npc_list" :key="npc.name" class="npc-card gal-card">
        <div class="npc-card__header">
          <button
            type="button"
            class="npc-card__avatar-btn"
            :title="`查看 ${npc.name} 详细信息`"
            @click.stop="open_profile(npc.name)"
          >
            <PortraitCircle
              v-if="npc.avatar"
              :src="npc.avatar"
              :label="npc.name"
              :size="NPC_CARD_AVATAR_SIZE"
            />
            <div v-else class="npc-card__avatar-fallback">{{ npc.name.charAt(0) }}</div>
          </button>
          <div class="npc-card__title">
            <strong>{{ npc.name }}</strong>
            <span>{{ npc.性别 }} · {{ npc.身份 }} · Lv.{{ npc.等级 }}</span>
          </div>
          <button
            class="npc-card__chat gal-btn gal-btn--icon"
            type="button"
            title="私聊"
            @click.stop="ui.open_npc_chat(npc.name)"
          >
            <i class="fa-solid fa-comment-dots"></i>
          </button>
        </div>
        <div class="npc-card__stats">
          <span><i class="fa-solid fa-heart"></i> 好感 {{ npc.好感度 }}</span>
          <span><i class="fa-solid fa-fire"></i> 性欲 {{ npc.性欲 }}</span>
          <span><i class="fa-solid fa-location-dot"></i> {{ npc.位置 }}</span>
        </div>
        <div class="npc-card__abilities">
          <span><i class="fa-solid fa-heart"></i> {{ npc.能力.生命 }}</span>
          <span><i class="fa-solid fa-hand-fist"></i> {{ npc.能力.力量 }}</span>
          <span><i class="fa-solid fa-shield-halved"></i> {{ npc.能力.体魄 }}</span>
          <span><i class="fa-solid fa-brain"></i> {{ npc.能力.智慧 }}</span>
        </div>
        <p v-if="npc.内心想法?.trim()" class="npc-card__thought">
          <strong>内心想法</strong>{{ npc.内心想法 }}
        </p>
      </article>
    </div>
    <div v-else class="gal-empty">
      <i class="fa-solid fa-user-group"></i>
      <span>尚未邂逅 NPC</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { resolveNpcAvatar } from '../../config';
import { NPC_CARD_AVATAR_SIZE } from '../../media';
import type { Schema } from '../../schema';
import { useDataStore, useUiStore } from '../../store';
import PortraitCircle from '../PortraitCircle.vue';

const data = useDataStore();
const ui = useUiStore();

type NpcRow = Schema['邂逅名录'][string] & { name: string; avatar: string };

const npc_list = computed(() =>
  _(data.data.邂逅名录)
    .entries()
    .map(([name, npc]) => ({
      name,
      avatar: resolveNpcAvatar(name),
      ...npc,
    }))
    .value(),
);

function open_profile(name: string) {
  ui.open_npc_profile(name);
}
</script>

<style lang="scss" scoped>
.npc-panel {
  min-height: 0;
  overflow-y: auto;
}

.npc-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.npc-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.npc-card__avatar-btn {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  transition: transform 0.15s ease, filter 0.15s ease;

  &:hover {
    transform: scale(1.04);
    filter: brightness(1.08);
  }

  &:active {
    transform: scale(0.98);
  }
}

.npc-card__avatar-fallback {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--gal-pink);
  background: var(--gal-panel-light);
  box-shadow: inset 0 0 0 2px rgba(96, 165, 250, 0.55);
  pointer-events: none;
}

.npc-card__title {
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    font-size: 16px;
    margin-bottom: 2px;
  }

  span {
    color: var(--gal-text-muted);
    font-size: 11px;
    line-height: 1.4;
  }
}

.npc-card__chat {
  border: none;
  background: var(--gal-gradient-primary);
  color: #fff;
  box-shadow: var(--gal-shadow-glow);
}

.npc-card__stats,
.npc-card__abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--gal-text-muted);

  i {
    margin-right: 3px;
    color: var(--gal-pink);
  }
}

.npc-card__abilities i {
  color: var(--gal-blue);
}

.npc-card__thought {
  margin: 0;
  line-height: 1.5;
  font-size: 11px;
  color: var(--gal-text-muted);

  strong {
    display: block;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: var(--gal-violet);
    margin-bottom: 2px;
  }
}
</style>

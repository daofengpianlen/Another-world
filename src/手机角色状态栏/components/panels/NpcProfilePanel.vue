<template>
  <section v-if="npc" class="npc-profile gal-panel-scroll">
    <header class="npc-profile__nav">
      <button class="npc-profile__back" type="button" title="返回名录" @click="ui.close_npc_profile()">
        <i class="fa-solid fa-chevron-left"></i>
        <span>返回</span>
      </button>
      <span class="npc-profile__nav-label">角色档案</span>
    </header>

    <div class="npc-profile__hero gal-card">
      <div class="npc-profile__portrait">
        <PortraitCircle v-if="avatar" :src="avatar" :label="name" :size="NPC_PROFILE_AVATAR_SIZE" />
        <div v-else class="npc-profile__avatar-fallback">{{ name.charAt(0) }}</div>
      </div>
      <div class="npc-profile__identity">
        <h3 class="npc-profile__name">{{ name }}</h3>
        <div class="npc-profile__meta">
          <div class="npc-profile__meta-row">
            <span>性别</span>
            <strong>{{ npc.性别 }}</strong>
          </div>
          <div class="npc-profile__meta-row">
            <span>身份</span>
            <strong>{{ npc.身份 || '—' }}</strong>
          </div>
          <div class="npc-profile__meta-row">
            <span>等级</span>
            <strong class="npc-profile__level">Lv.{{ npc.等级 }}</strong>
          </div>
          <div class="npc-profile__meta-row">
            <span>位置</span>
            <strong>{{ npc.位置 }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="npc-profile__bonds">
      <div class="bond-card gal-card">
        <div class="bond-card__head">
          <i class="fa-solid fa-heart"></i>
          <span>好感</span>
          <strong>{{ npc.好感度 }}</strong>
        </div>
        <div class="bond-card__bar">
          <div class="bond-card__fill bond-card__fill--heart" :style="{ width: `${npc.好感度}%` }"></div>
        </div>
      </div>
      <div class="bond-card gal-card">
        <div class="bond-card__head">
          <i class="fa-solid fa-fire"></i>
          <span>性欲</span>
          <strong>{{ npc.性欲 }}</strong>
        </div>
        <div class="bond-card__bar">
          <div class="bond-card__fill bond-card__fill--lust" :style="{ width: `${npc.性欲}%` }"></div>
        </div>
      </div>
    </div>

    <div class="npc-profile__stats">
      <div v-for="stat in ability_stats" :key="stat.key" class="stat-card gal-card">
        <i :class="stat.icon"></i>
        <span class="stat-card__label">{{ stat.label }}</span>
        <strong class="stat-card__value">{{ stat.value }}</strong>
      </div>
    </div>

    <div v-if="npc.内心想法?.trim()" class="npc-profile__thought gal-card">
      <div class="npc-profile__thought-label">
        <i class="fa-solid fa-comment-dots"></i>
        内心想法
      </div>
      <p>{{ npc.内心想法 }}</p>
    </div>

    <NpcStatusDetail :npc="npc" embedded />
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { resolveNpcAvatar } from '../../config';
import { NPC_PROFILE_AVATAR_SIZE } from '../../media';
import { useDataStore, useUiStore } from '../../store';
import NpcStatusDetail from '../NpcStatusDetail.vue';
import PortraitCircle from '../PortraitCircle.vue';

const ui = useUiStore();
const data = useDataStore();
const { npc_profile_name } = storeToRefs(ui);

const name = computed(() => npc_profile_name.value ?? '');
const npc = computed(() => data.data.邂逅名录[name.value] ?? null);
const avatar = computed(() => (name.value ? resolveNpcAvatar(name.value) : ''));

const ability_stats = computed(() => {
  const ability = npc.value?.能力;
  if (!ability) return [];
  return [
    { key: 'hp', label: '生命', icon: 'fa-solid fa-heart', value: ability.生命 },
    { key: 'str', label: '力量', icon: 'fa-solid fa-hand-fist', value: ability.力量 },
    { key: 'con', label: '体魄', icon: 'fa-solid fa-shield-halved', value: ability.体魄 },
    { key: 'wis', label: '智慧', icon: 'fa-solid fa-brain', value: ability.智慧 },
  ];
});

watch(name, n => {
  if (n && !data.data.邂逅名录[n]) {
    ui.close_npc_profile();
  }
});
</script>

<style lang="scss" scoped>
.npc-profile {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.npc-profile__nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.npc-profile__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px 6px 8px;
  border: none;
  border-radius: var(--gal-radius-pill);
  background: rgba(255, 255, 255, 0.06);
  color: var(--gal-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: var(--gal-text);
    background: rgba(255, 255, 255, 0.1);
  }
}

.npc-profile__nav-label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gal-text-muted);
  opacity: 0.85;
}

.npc-profile__hero {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.npc-profile__portrait {
  flex-shrink: 0;
  padding: 3px;
  border-radius: 50%;
  background: var(--gal-gradient-primary);
  box-shadow: 0 0 20px rgba(244, 114, 182, 0.2);
}

.npc-profile__avatar-fallback {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: var(--gal-pink);
  background: var(--gal-panel-light);
}

.npc-profile__identity {
  flex: 1;
  min-width: 0;
}

.npc-profile__name {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 800;
  color: var(--gal-text);
  line-height: 1.2;
  word-break: break-word;
}

.npc-profile__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.npc-profile__meta-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--gal-border);

  span {
    color: var(--gal-text-muted);
    flex-shrink: 0;
  }

  strong {
    text-align: right;
    word-break: break-word;
  }
}

.npc-profile__level {
  color: var(--gal-blue);
}

.npc-profile__bonds {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bond-card {
  padding: 12px 12px 10px;
}

.bond-card__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--gal-text-muted);

  i {
    font-size: 13px;
    color: var(--gal-pink);
  }

  strong {
    margin-left: auto;
    font-size: 18px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--gal-text);
  }
}

.bond-card__bar {
  height: 5px;
  border-radius: var(--gal-radius-pill);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.bond-card__fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.35s ease;

  &--heart {
    background: linear-gradient(90deg, #fb7185, #f472b6);
  }

  &--lust {
    background: linear-gradient(90deg, #f97316, #fb7185);
  }
}

.npc-profile__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat-card {
  text-align: center;
  padding: 14px 10px;

  i {
    display: block;
    font-size: 18px;
    margin-bottom: 6px;
    color: var(--gal-violet);
  }
}

.stat-card__label {
  display: block;
  font-size: 10px;
  color: var(--gal-text-muted);
  letter-spacing: 0.06em;
}

.stat-card__value {
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.npc-profile__thought {
  padding: 12px 14px;
}

.npc-profile__thought-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--gal-violet);
  font-weight: 700;

  i {
    font-size: 11px;
    opacity: 0.9;
  }
}

.npc-profile__thought p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--gal-text-muted);
  font-style: italic;
}
</style>

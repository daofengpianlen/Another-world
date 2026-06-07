<template>
  <div class="portrait-circle" :class="[`portrait-circle--${tone}`]" :style="size_style" :title="label">
    <img
      v-if="display_url && !failed"
      class="portrait-circle__img"
      :class="{ 'portrait-circle__img--npc': tone === 'npc' || tone === 'enemy' }"
      :src="display_url"
      :alt="label"
      @error="failed = true"
    />
    <span v-else class="portrait-circle__initial">{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
import { getAvatarInitial } from '../chatPersona';
import { NPC_AVATAR_OBJECT_POSITION } from '../media';
import { useCachedMedia } from '../useCachedMedia';

const props = withDefaults(
  defineProps<{
    src?: string;
    label: string;
    size?: number;
    tone?: 'npc' | 'user' | 'enemy';
  }>(),
  { size: 44, tone: 'npc' },
);

const failed = ref(false);

const source = computed(() => props.src ?? '');
const { display_url } = useCachedMedia(source);

watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);

const initial = computed(() => getAvatarInitial(props.label));
const size_style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  '--portrait-object-position': NPC_AVATAR_OBJECT_POSITION,
}));
</script>

<style lang="scss" scoped>
.portrait-circle {
  position: relative;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  background: var(--gal-panel-light);
  isolation: isolate;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2;
    box-shadow: inset 0 0 0 2px rgba(96, 165, 250, 0.55);
  }

  &--user::after {
    box-shadow: inset 0 0 0 2px rgba(244, 114, 182, 0.55);
  }

  &--enemy::after {
    box-shadow: inset 0 0 0 2px rgba(244, 114, 182, 0.65);
  }
}

.portrait-circle__img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
}

.portrait-circle__img--npc {
  object-position: var(--portrait-object-position);
}

.portrait-circle__initial {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 38%;
  color: var(--gal-pink);
  line-height: 1;
}

.portrait-circle--user .portrait-circle__initial {
  background: linear-gradient(145deg, var(--gal-blue), var(--gal-violet));
  -webkit-background-clip: border-box;
  background-clip: border-box;
  color: #fff;
}

.portrait-circle--enemy .portrait-circle__initial {
  background: linear-gradient(145deg, #fb7185, #f472b6);
  -webkit-background-clip: border-box;
  background-clip: border-box;
  color: #fff;
}
</style>

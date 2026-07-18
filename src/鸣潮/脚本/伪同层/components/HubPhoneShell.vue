<template>
  <div v-show="visible" class="hub-phone" @click.self="close">
    <div class="hub-phone__device">
      <div ref="legacy_host_ref" class="hub-phone__legacy-host"></div>
    </div>
    <button type="button" class="hub-phone__close" title="关闭手机" @click="close">
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { closeHubLegacyPhone, destroyHubLegacyPhone, openHubLegacyPhone } from '../hubLegacyPhone';

const visible = defineModel<boolean>('visible', { default: false });
const legacy_host_ref = ref<HTMLElement | null>(null);
const opening = ref(false);

async function open() {
  const host = legacy_host_ref.value;
  if (!host || opening.value) return;
  opening.value = true;
  try {
    await openHubLegacyPhone(host);
  } catch (error) {
    console.error('[鸣潮伪同层] 打开手机失败', error);
    toastr.error('手机界面加载失败，请刷新后重试');
    visible.value = false;
  } finally {
    opening.value = false;
  }
}

function close() {
  closeHubLegacyPhone();
  visible.value = false;
}

watch(visible, open_now => {
  if (open_now) {
    nextTick(() => open());
  } else {
    closeHubLegacyPhone();
  }
});

onUnmounted(() => {
  destroyHubLegacyPhone();
});
</script>

<style scoped lang="scss">
.hub-phone {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(5px);
}

.hub-phone__device {
  position: relative;
  width: min(92vw, 375px);
  max-height: min(92vh, 737px);
  aspect-ratio: 375 / 737;
  background: #1a1a1a;
  border-radius: 40px;
  padding: 8px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.hub-phone__legacy-host {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 32px;
  overflow: hidden;
  background: #111;
  pointer-events: auto;
}

.hub-phone__close {
  position: absolute;
  top: calc(50% - min(46vh, 368px) - 20px);
  right: max(12px, calc(50% - min(46vw, 187px) - 40px));
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  z-index: 3;
  font-size: 16px;
}

@media (max-width: 480px) {
  .hub-phone__close {
    top: 12px;
    right: 12px;
  }
}
</style>

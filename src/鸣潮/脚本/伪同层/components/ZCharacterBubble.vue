<template>
  <!-- 对齐参考脚本：大头像版-角色聊天框（电脑/手机专用） -->
  <div class="z-bubble" :class="layout === 'mobile' ? 'z-bubble--mobile' : 'z-bubble--desktop'">
    <template v-if="layout === 'desktop'">
      <div class="z-bubble__name z-bubble__name--desktop">{{ name }}</div>
      <div class="z-bubble__row">
        <div class="z-bubble__avatar">
          <video
            v-if="pic_url && is_video"
            :src="pic_url"
            class="z-bubble__media"
            autoplay
            loop
            muted
            playsinline
          />
          <img v-else-if="pic_url" :src="pic_url" class="z-bubble__media" :alt="name" />
        </div>

        <details class="z-bubble__flip">
          <summary>
            <div class="z-bubble__card">
              <div class="z-bubble__face z-bubble__face--front z-bubble__face--desktop-front">
                <div class="z-bubble__speech">{{ speech }}</div>
                <div class="z-bubble__arrow" aria-hidden="true"></div>
              </div>
              <div class="z-bubble__face z-bubble__face--back">
                <div class="z-bubble__heart-wrap">
                  <div class="z-bubble__heart-label">· 心声独白 ·</div>
                  <span class="z-bubble__heart">“ {{ heart }} ”</span>
                </div>
              </div>
            </div>
          </summary>
        </details>
      </div>
      <div class="z-bubble__hint z-bubble__hint--desktop">※ 点击对话框开启/关闭内心视角</div>
    </template>

    <template v-else>
      <div class="z-bubble__name z-bubble__name--mobile">{{ name }}</div>
      <div class="z-bubble__stack">
        <div class="z-bubble__avatar">
          <video
            v-if="pic_url && is_video"
            :src="pic_url"
            class="z-bubble__media"
            autoplay
            loop
            muted
            playsinline
          />
          <img v-else-if="pic_url" :src="pic_url" class="z-bubble__media" :alt="name" />
        </div>

        <details class="z-bubble__flip z-bubble__flip--full">
          <summary>
            <div class="z-bubble__card">
              <div class="z-bubble__face z-bubble__face--front z-bubble__face--mobile-front">
                <div class="z-bubble__speech">{{ speech }}</div>
              </div>
              <div class="z-bubble__face z-bubble__face--back">
                <div class="z-bubble__heart-wrap">
                  <div class="z-bubble__heart-label">· 心声独白 ·</div>
                  <span class="z-bubble__heart">“ {{ heart }} ”</span>
                </div>
              </div>
            </div>
          </summary>
        </details>
      </div>
      <div class="z-bubble__hint">※ 点击对话框开启/关闭内心视角</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import type { HubLayoutMode } from '../hubSettingsStore';
import { isVideoUrl, resolvePicUrl } from '../picResolver';

const props = defineProps<{
  name: string;
  pic?: string;
  speech: string;
  heart: string;
  layout: HubLayoutMode;
}>();

const pic_url = computed(() => (props.pic ? resolvePicUrl(props.pic, props.name) : ''));
const is_video = computed(() => isVideoUrl(pic_url.value));

watch(
  () => [props.name, props.pic] as const,
  ([name, pic]) => {
    if (pic) window.unlockCgByRoleAndScene?.(name, pic);
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.z-bubble {
  margin: 30px 0;
  font-family: var(--hub-font-family, 'Microsoft YaHei', sans-serif);
  position: relative;
}

.z-bubble--desktop {
  display: flex;
  flex-direction: column;
}

.z-bubble--mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.z-bubble__name--desktop {
  margin-left: 132px;
  background: #c44569;
  color: #fff;
  padding: 3px 18px;
  border-radius: 8px 8px 0 0;
  font-size: calc(12px * var(--hub-font-scale, 1));
  width: fit-content;
  z-index: 11;
  position: relative;
  bottom: -1px;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
  letter-spacing: 1px;
  font-weight: bold;
}

.z-bubble__name--mobile {
  background: linear-gradient(90deg, #f25292, #c44569, #f8a5c2, #f25292);
  background-size: 300% 100%;
  animation: name-flow 3.5s linear infinite;
  color: #fff;
  padding: 5px 22px;
  border-radius: 50px;
  font-size: calc(13px * var(--hub-font-scale, 1));
  z-index: 11;
  margin-bottom: 8px;
  letter-spacing: 2px;
  font-weight: bold;
  box-shadow: 0 3px 10px rgba(196, 69, 105, 0.3);
}

.z-bubble__row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.z-bubble__stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.z-bubble__avatar {
  width: 120px;
  height: 160px;
  flex-shrink: 0;
  border: 4px solid #e6b8c9;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 15px rgba(216, 162, 179, 0.4);
  z-index: 10;
  background: #fff0f5;
}

.z-bubble__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.z-bubble__flip {
  flex: 1;
  perspective: 1200px;
  position: relative;
  min-height: 160px;
  cursor: pointer;

  &--full {
    width: 100%;
  }

  summary {
    list-style: none;
    outline: none;
    display: block;

    &::-webkit-details-marker {
      display: none;
    }
  }

  &[open] .z-bubble__card {
    transform: rotateY(180deg);
  }
}

.z-bubble__card {
  width: 100%;
  min-height: 160px;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
  position: relative;
  display: grid;
  grid-template-columns: 100%;
}

.z-bubble__face {
  grid-area: 1 / 1;
  width: 100%;
  min-height: 160px;
  backface-visibility: hidden;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  align-items: center;

  &--front {
    z-index: 2;
  }

  &--desktop-front {
    background: linear-gradient(135deg, #fff5f7 0%, #ffe4e6 100%);
    border: 3px solid #d8a2b3;
    border-radius: 0 20px 20px 20px;
    color: #7a4b5a;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    position: relative;
  }

  &--mobile-front {
    background: linear-gradient(135deg, #fff5f7 0%, #ffe4e6 100%);
    border: 3px solid #d8a2b3;
    border-radius: 20px;
    color: #7a4b5a;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  &--back {
    transform: rotateY(180deg);
    background: linear-gradient(135deg, #f3e7ff 0%, #e9d5ff 100%);
    color: #6b46c1;
    border: 2px dashed #b794f4;
    border-radius: 45px 25px 45px 25px / 25px 40px 25px 40px;
    box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.6);
  }
}

.z-bubble__speech {
  line-height: 1.7;
  font-size: calc(15px * var(--hub-font-scale, 1));
  width: 100%;
  word-break: break-word;
  font-weight: 500;
  white-space: pre-wrap;
}

.z-bubble__arrow {
  position: absolute;
  left: -12px;
  top: -3px;
  width: 0;
  height: 0;
  border-bottom: 18px solid transparent;
  border-right: 12px solid #d8a2b3;
}

.z-bubble__heart-wrap {
  line-height: 1.7;
  font-size: calc(14.5px * var(--hub-font-scale, 1));
  text-align: center;
  width: 100%;
  word-break: break-word;
}

.z-bubble__heart-label {
  font-size: calc(12px * var(--hub-font-scale, 1));
  color: #9f7aea;
  margin-bottom: 8px;
  letter-spacing: 2px;
  font-weight: bold;
}

.z-bubble__heart {
  font-style: italic;
  opacity: 0.9;
  white-space: pre-wrap;
}

.z-bubble__hint {
  font-size: calc(10px * var(--hub-font-scale, 1));
  color: #d8a2b3;
  margin-top: 6px;
  opacity: 0.8;

  &--desktop {
    margin-left: 132px;
  }
}

@keyframes name-flow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 300% 50%;
  }
}
</style>

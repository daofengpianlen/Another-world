<template>
  <div class="opening-screen">
      <div class="opening-bg" aria-hidden="true">
        <div class="opening-bg__vignette"></div>
        <div class="opening-bg__nebula opening-bg__nebula--violet"></div>
        <div class="opening-bg__nebula opening-bg__nebula--blue"></div>

        <div class="opening-bg__parallax opening-bg__parallax--far"></div>
        <div class="opening-bg__parallax opening-bg__parallax--near"></div>

        <div class="opening-bg__magic">
          <div class="opening-bg__magic-ring opening-bg__magic-ring--outer">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="96" class="opening-bg__stroke" />
              <circle cx="100" cy="100" r="88" class="opening-bg__stroke opening-bg__stroke--dash" />
              <g class="opening-bg__ticks">
                <line v-for="n in 24" :key="n" x1="100" y1="8" x2="100" y2="18" :transform="`rotate(${(n - 1) * 15} 100 100)`" />
              </g>
            </svg>
          </div>
          <div class="opening-bg__magic-ring opening-bg__magic-ring--mid">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <polygon points="100,14 178,58 178,142 100,186 22,142 22,58" class="opening-bg__stroke" />
              <polygon points="100,32 160,62 160,138 100,168 40,138 40,62" class="opening-bg__stroke opening-bg__stroke--dash" />
              <circle cx="100" cy="100" r="28" class="opening-bg__stroke opening-bg__stroke--glow" />
            </svg>
          </div>
          <div class="opening-bg__magic-ring opening-bg__magic-ring--inner">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <polygon points="100,24 154,88 130,164 70,164 46,88" class="opening-bg__stroke opening-bg__stroke--star" />
              <polygon points="100,40 138,88 122,148 78,148 62,88" class="opening-bg__stroke opening-bg__stroke--dash" />
            </svg>
          </div>
          <div class="opening-bg__magic-core"></div>
        </div>

        <div class="opening-bg__stars">
          <span v-for="n in 28" :key="`star-${n}`" class="opening-bg__star" :style="star_style(n)"></span>
        </div>

        <div class="opening-bg__shooting">
          <span
            v-for="n in 6"
            :key="`meteor-${n}`"
            class="opening-bg__meteor"
            :style="meteor_style(n)"
          ></span>
        </div>

        <div class="opening-bg__motes">
          <span v-for="n in 14" :key="`mote-${n}`" class="opening-bg__mote" :style="mote_style(n)"></span>
        </div>
      </div>

      <div class="gal-shell__glow gal-shell__glow--pink" aria-hidden="true"></div>
      <div class="gal-shell__glow gal-shell__glow--blue" aria-hidden="true"></div>

      <header class="opening-shell__top">
        <div class="opening-shell__brand">
          <h1 ref="title_ref" class="opening-shell__title">{{ OPENING_TITLE }}</h1>
          <p ref="subtitle_ref" class="opening-shell__tagline">被女神召唤的勇者 · 四圣器之旅</p>
        </div>
        <button
          class="opening-shell__fullscreen"
          :class="{ 'opening-shell__fullscreen--active': is_fullscreen }"
          type="button"
          :title="is_fullscreen ? '还原' : '全屏'"
          @click="toggle_fullscreen"
        >
          <i :class="is_fullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
          <span>{{ is_fullscreen ? '还原' : '全屏' }}</span>
        </button>
      </header>

      <div class="opening-shell__body">
        <form ref="form_ref" class="opening-layout" @submit.prevent="submit">
          <aside ref="hero_ref" class="opening-profile">
            <div class="opening-profile__card">
              <p class="opening-profile__heading"><i class="fa-solid fa-id-card"></i>勇者形象</p>

              <div class="opening-profile__frame">
                <span class="opening-profile__orbit" aria-hidden="true"></span>
                <label
                  class="opening-profile__avatar"
                  for="opening-avatar-upload"
                  :class="{ 'opening-profile__avatar--has-image': avatar_src }"
                >
                  <img v-if="avatar_src" :src="avatar_src" alt="主角头像" class="opening-profile__avatar-img" />
                  <span v-else class="opening-profile__avatar-placeholder">
                    <i class="fa-solid fa-user"></i>
                    <em v-if="avatar_initial">{{ avatar_initial }}</em>
                  </span>
                  <span class="opening-profile__avatar-hint">
                    <i class="fa-solid fa-camera"></i>
                    {{ avatar_src ? '更换立绘' : '上传立绘' }}
                  </span>
                  <input
                    id="opening-avatar-upload"
                    name="avatar"
                    type="file"
                    accept="image/*"
                    hidden
                    :disabled="loading"
                    @change="on_avatar_upload"
                  />
                </label>
              </div>

              <p class="opening-profile__name">{{ display_name }}</p>
              <p class="opening-profile__meta">
                <span>{{ form.性别 }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ form.开局难度 }}</span>
              </p>

              <div ref="stats_ref" class="opening-profile__stats" aria-live="polite">
                <span v-for="item in stat_preview" :key="item.key" class="opening-profile__stat">
                  <i :class="item.icon"></i>
                  <em>{{ item.label }}</em>
                  <strong>{{ item.value }}</strong>
                </span>
              </div>
            </div>
          </aside>

          <div class="opening-main">
            <div class="opening-shell__form-card">
              <p class="opening-main__heading"><i class="fa-solid fa-scroll"></i>角色设定</p>

              <label class="opening-field" for="opening-name">
                <span class="opening-field__label"><i class="fa-solid fa-signature"></i>姓名</span>
                <input
                  id="opening-name"
                  name="姓名"
                  v-model="form.姓名"
                  class="opening-field__input"
                  type="text"
                  placeholder="为你的化身命名"
                  maxlength="20"
                  :disabled="loading"
                />
              </label>

              <fieldset class="opening-field opening-field--group">
                <legend class="opening-field__label"><i class="fa-solid fa-venus-mars"></i>性别</legend>
                <div class="opening-segment opening-segment--gender" role="radiogroup" aria-label="性别">
                  <button
                    v-for="option in gender_options"
                    :key="option.value"
                    class="opening-segment__btn opening-segment__btn--icon"
                    :class="{ 'opening-segment__btn--active': form.性别 === option.value }"
                    type="button"
                    role="radio"
                    :aria-checked="form.性别 === option.value"
                    :disabled="loading"
                    @click="form.性别 = option.value"
                  >
                    <i :class="option.icon"></i>
                    <span>{{ option.value }}</span>
                  </button>
                </div>
              </fieldset>

              <label class="opening-field" for="opening-personality">
                <span class="opening-field__label"><i class="fa-solid fa-heart"></i>性格</span>
                <input
                  id="opening-personality"
                  name="性格"
                  v-model="form.性格"
                  class="opening-field__input"
                  type="text"
                  placeholder="冷静、善良、好奇心强……"
                  maxlength="60"
                  :disabled="loading"
                />
              </label>

              <label class="opening-field" for="opening-appearance">
                <span class="opening-field__label"><i class="fa-solid fa-wand-magic-sparkles"></i>外貌</span>
                <textarea
                  id="opening-appearance"
                  name="外貌"
                  v-model="form.外貌"
                  class="opening-field__input opening-field__textarea"
                  placeholder="发色、瞳色、装束等外在特征"
                  maxlength="120"
                  rows="3"
                  :disabled="loading"
                />
              </label>

              <fieldset class="opening-field opening-field--group">
                <legend class="opening-field__label"><i class="fa-solid fa-shield-halved"></i>开局难度</legend>
                <div class="opening-segment opening-segment--difficulty" role="radiogroup" aria-label="开局难度">
                  <button
                    v-for="option in difficulty_options"
                    :key="option"
                    class="opening-segment__btn opening-segment__btn--difficulty"
                    :class="[
                      difficulty_class(option),
                      { 'opening-segment__btn--active': form.开局难度 === option },
                    ]"
                    type="button"
                    role="radio"
                    :aria-checked="form.开局难度 === option"
                    :disabled="loading"
                    @click="form.开局难度 = option"
                  >
                    {{ option }}
                  </button>
                </div>
              </fieldset>
            </div>

            <p v-if="error" class="opening-shell__error">{{ error }}</p>

            <button
              ref="submit_ref"
              class="opening-shell__submit gal-btn gal-btn--primary gal-btn--pill"
              type="submit"
              :disabled="!can_submit || loading"
            >
              <span class="opening-shell__submit-shine" aria-hidden="true"></span>
              <i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-dungeon'"></i>
              {{ loading ? '正在穿越至艾瑟兰…' : '踏入艾瑟兰' }}
            </button>
          </div>
        </form>
      </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import {
  OPENING_DIFFICULTY_STATS,
  OPENING_TITLE,
  startGame,
  type OpeningDifficulty,
  type ProtagonistCreation,
  type ProtagonistGender,
} from '../gameFlow';
import { read_hero_avatar, write_hero_avatar } from '../heroAvatar';
import { GAL_FULLSCREEN_KEY } from '../galFullscreenContext';
import { syncDataFromMvu, useGalStore, useGamePhaseStore } from '../store';

const gender_options: { value: ProtagonistGender; icon: string }[] = [
  { value: '男', icon: 'fa-solid fa-mars' },
  { value: '女', icon: 'fa-solid fa-venus' },
  { value: '其他', icon: 'fa-solid fa-infinity' },
];

const difficulty_options: OpeningDifficulty[] = ['简单', '普通', '困难'];

const stat_icons: Record<string, string> = {
  生命: 'fa-solid fa-heart-pulse',
  力量: 'fa-solid fa-hand-fist',
  体魄: 'fa-solid fa-shield',
  智慧: 'fa-solid fa-brain',
};

const form = ref<ProtagonistCreation>({
  姓名: '',
  性别: '男',
  性格: '',
  外貌: '',
  开局难度: '普通',
});

const loading = ref(false);
const error = ref('');
const avatar_src = ref(read_hero_avatar());
const hero_ref = ref<HTMLElement | null>(null);
const title_ref = ref<HTMLElement | null>(null);
const subtitle_ref = ref<HTMLElement | null>(null);
const form_ref = ref<HTMLElement | null>(null);
const stats_ref = ref<HTMLElement | null>(null);
const submit_ref = ref<HTMLElement | null>(null);

const { is_fullscreen, toggle_fullscreen } = inject(GAL_FULLSCREEN_KEY)!;

const can_submit = computed(
  () => form.value.姓名.trim() && form.value.性格.trim() && form.value.外貌.trim() && form.value.性别 && form.value.开局难度,
);

const avatar_initial = computed(() => form.value.姓名.trim().charAt(0));

const display_name = computed(() => form.value.姓名.trim() || '未命名勇者');

function on_avatar_upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toastr.warning('请选择图片文件');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string') return;
    avatar_src.value = reader.result;
    write_hero_avatar(reader.result);
    toastr.success('头像已设置');
  };
  reader.onerror = () => toastr.error('头像读取失败');
  reader.readAsDataURL(file);
  (event.target as HTMLInputElement).value = '';
}

const stat_preview = computed(() => {
  const stats = OPENING_DIFFICULTY_STATS[form.value.开局难度];
  return (['生命', '力量', '体魄', '智慧'] as const).map(key => ({
    key,
    label: key,
    value: stats[key],
    icon: stat_icons[key],
  }));
});

function difficulty_class(option: OpeningDifficulty): string {
  if (option === '简单') return 'opening-segment__btn--easy';
  if (option === '困难') return 'opening-segment__btn--hard';
  return 'opening-segment__btn--normal';
}

function star_style(index: number): Record<string, string> {
  const left = ((index * 17 + 11) % 94) + 3;
  const top = ((index * 23 + 7) % 88) + 4;
  const delay = `${(index % 6) * 0.7}s`;
  const size = index % 3 === 0 ? '3px' : '2px';
  return { left: `${left}%`, top: `${top}%`, animationDelay: delay, width: size, height: size };
}

function meteor_style(index: number): Record<string, string> {
  const top = ((index * 13 + 5) % 55) + 5;
  const left = ((index * 19 + 3) % 70) + 10;
  const delay = `${index * 1.35 + 0.2}s`;
  const duration = `${2.8 + (index % 3) * 0.6}s`;
  return {
    top: `${top}%`,
    left: `${left}%`,
    animationDelay: delay,
    animationDuration: duration,
  };
}

function mote_style(index: number): Record<string, string> {
  const left = ((index * 29 + 7) % 92) + 4;
  const delay = `${(index % 5) * 1.1}s`;
  const duration = `${5 + (index % 4) * 1.2}s`;
  const scale = index % 2 === 0 ? '1' : '0.75';
  return {
    left: `${left}%`,
    animationDelay: delay,
    animationDuration: duration,
    transform: `scale(${scale})`,
  };
}

function animate_entrance() {
  const hero = hero_ref.value;
  const title = title_ref.value;
  const subtitle = subtitle_ref.value;
  const form_el = form_ref.value;
  const submit = submit_ref.value;
  if (!hero || !title || !subtitle || !form_el || !submit) return;

  gsap.set([hero, form_el, submit], { opacity: 1 });

  gsap.from('.opening-bg__magic-ring', {
    scale: 0.72,
    opacity: 0,
    duration: 1.4,
    stagger: 0.12,
    ease: 'power2.out',
  });
  gsap.from('.opening-bg__magic-core', { scale: 0, opacity: 0, duration: 0.9, delay: 0.25, ease: 'back.out(2)' });

  gsap.from('.opening-bg__star', {
    opacity: 0,
    scale: 0,
    duration: 1.1,
    stagger: 0.03,
    ease: 'power2.out',
  });

  gsap.from(title, {
    y: 12,
    opacity: 0,
    letterSpacing: '0.28em',
    duration: 0.85,
    ease: 'power3.out',
  });
  gsap.from(subtitle, { y: 8, opacity: 0, duration: 0.6, delay: 0.08, ease: 'power2.out' });
  gsap.from('.opening-profile__card', { x: -20, opacity: 0, duration: 0.75, delay: 0.15, ease: 'power3.out' });
  gsap.from('.opening-main > *', {
    x: 20,
    opacity: 0,
    duration: 0.65,
    stagger: 0.08,
    delay: 0.22,
    ease: 'power2.out',
  });

  gsap.to('.opening-profile__orbit', {
    rotation: 360,
    duration: 22,
    repeat: -1,
    ease: 'none',
  });

  gsap.to('.opening-bg__magic-core', {
    scale: 1.08,
    opacity: 0.55,
    duration: 3.2,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });
}

const BG_TWEEN_TARGETS =
  '.opening-profile__orbit, .opening-bg__magic-core, .opening-bg__magic-ring';

function pulse_stats_preview() {
  const el = stats_ref.value;
  if (!el) return;
  gsap.fromTo(el, { scale: 0.98, opacity: 0.72 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' });
}

watch(
  () => form.value.开局难度,
  () => nextTick(pulse_stats_preview),
);

async function submit() {
  if (!can_submit.value || loading.value) return;

  const phase = useGamePhaseStore();
  const gal = useGalStore();

  loading.value = true;
  error.value = '';
  phase.enterPlaying();
  phase.generating_opening = true;

  try {
    await startGame({ ...form.value, 头像: avatar_src.value });
    gal.refreshFromGameplayMessage();
    syncDataFromMvu();
    toastr.success('冒险开始！');
  } catch (err) {
    phase.revertToOpening();
    const msg = err instanceof Error ? err.message : '生成失败，请重试';
    error.value = msg;
    toastr.error(msg);
    console.error('[艾瑟兰] 开局失败', err);
  } finally {
    phase.generating_opening = false;
    loading.value = false;
  }
}

$(() => {
  nextTick(animate_entrance);
});

onUnmounted(() => {
  gsap.killTweensOf(BG_TWEEN_TARGETS);
});
</script>

<style lang="scss" scoped>
.opening-screen {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  color: var(--gal-text);
  --gal-topbar-h: 44px;
  --gal-body-h: 668px;
}

.opening-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.opening-bg__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 85% 72% at 50% 38%, transparent 0%, rgba(6, 9, 18, 0.55) 68%, rgba(6, 9, 18, 0.88) 100%);
  z-index: 5;
}

.opening-bg__nebula {
  position: absolute;
  border-radius: 50%;
  filter: blur(56px);
  opacity: 0.45;
  animation: opening-nebula-drift 14s ease-in-out infinite alternate;

  &--violet {
    width: 340px;
    height: 340px;
    top: 18%;
    left: 2%;
    transform: none;
    background: rgba(139, 92, 246, 0.28);
    animation-name: opening-nebula-drift-violet;
  }

  &--blue {
    width: 280px;
    height: 280px;
    bottom: 12%;
    right: -4%;
    background: rgba(59, 130, 246, 0.22);
    animation-name: opening-nebula-drift-blue;
    animation-delay: -4s;
    animation-direction: alternate-reverse;
  }
}

.opening-bg__parallax {
  position: absolute;
  inset: -30%;
  opacity: 0.35;
  background-repeat: repeat;
  will-change: transform;

  &--far {
    background-image:
      radial-gradient(1px 1px at 10% 20%, rgba(255, 255, 255, 0.7), transparent),
      radial-gradient(1px 1px at 35% 65%, rgba(255, 255, 255, 0.55), transparent),
      radial-gradient(1.5px 1.5px at 72% 28%, rgba(196, 181, 253, 0.65), transparent),
      radial-gradient(1px 1px at 88% 78%, rgba(255, 255, 255, 0.45), transparent),
      radial-gradient(1px 1px at 52% 42%, rgba(147, 197, 253, 0.5), transparent);
    background-size: 280px 280px;
    animation: opening-parallax-drift 90s linear infinite;
  }

  &--near {
    opacity: 0.55;
    background-image:
      radial-gradient(1.5px 1.5px at 18% 38%, rgba(255, 255, 255, 0.85), transparent),
      radial-gradient(1px 1px at 62% 18%, rgba(244, 114, 182, 0.55), transparent),
      radial-gradient(1px 1px at 44% 82%, rgba(255, 255, 255, 0.65), transparent),
      radial-gradient(2px 2px at 78% 56%, rgba(167, 139, 250, 0.75), transparent);
    background-size: 220px 220px;
    animation: opening-parallax-drift 55s linear infinite reverse;
  }
}

.opening-bg__magic {
  position: absolute;
  top: 14%;
  left: 4%;
  width: min(340px, 38%);
  aspect-ratio: 1;
  transform: none;
  z-index: 1;
}

.opening-bg__magic-ring {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.42;

  svg {
    width: 100%;
    height: 100%;
  }

  &--outer {
    animation: opening-magic-spin 52s linear infinite;
  }

  &--mid {
    inset: 12%;
    opacity: 0.5;
    animation: opening-magic-spin-reverse 38s linear infinite;
  }

  &--inner {
    inset: 24%;
    opacity: 0.58;
    animation: opening-magic-spin 26s linear infinite;
  }
}

.opening-bg__stroke {
  fill: none;
  stroke: rgba(167, 139, 250, 0.55);
  stroke-width: 1.2;
  vector-effect: non-scaling-stroke;

  &--dash {
    stroke-dasharray: 6 8;
    stroke: rgba(96, 165, 250, 0.45);
  }

  &--glow {
    stroke: rgba(244, 114, 182, 0.5);
    filter: drop-shadow(0 0 4px rgba(244, 114, 182, 0.35));
  }

  &--star {
    stroke: rgba(252, 211, 77, 0.42);
    stroke-width: 1;
  }
}

.opening-bg__ticks line {
  stroke: rgba(196, 181, 253, 0.55);
  stroke-width: 1.5;
  stroke-linecap: round;
}

.opening-bg__magic-core {
  position: absolute;
  inset: 42%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.35) 0%, rgba(96, 165, 250, 0.12) 55%, transparent 72%);
  box-shadow: 0 0 28px rgba(129, 140, 248, 0.35);
}

.opening-bg__stars {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.opening-bg__star {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 8px rgba(167, 139, 250, 0.55);
  animation: opening-star-twinkle 3.2s ease-in-out infinite;
}

.opening-bg__shooting {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
}

.opening-bg__meteor {
  position: absolute;
  width: 96px;
  height: 2px;
  border-radius: var(--gal-radius-pill);
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 20%, rgba(255, 255, 255, 0.95) 55%, transparent 100%);
  transform: rotate(-38deg);
  opacity: 0;
  animation-name: opening-meteor-fly;
  animation-timing-function: ease-in;
  animation-iteration-count: infinite;
  filter: drop-shadow(0 0 6px rgba(147, 197, 253, 0.65));
}

.opening-bg__motes {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.opening-bg__mote {
  position: absolute;
  bottom: -8px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(196, 181, 253, 0.85);
  box-shadow: 0 0 10px rgba(167, 139, 250, 0.65);
  animation-name: opening-mote-rise;
  animation-timing-function: ease-out;
  animation-iteration-count: infinite;
  opacity: 0;
}

.gal-shell__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  pointer-events: none;
  opacity: 0.55;
  z-index: 1;

  &--pink {
    width: 280px;
    height: 280px;
    top: -80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(244, 114, 182, 0.22);
    animation: opening-glow-drift 8s ease-in-out infinite alternate;
  }

  &--blue {
    width: 240px;
    height: 240px;
    bottom: 8%;
    right: 6%;
    background: rgba(96, 165, 250, 0.18);
    animation: opening-glow-drift 10s ease-in-out infinite alternate-reverse;
  }
}

.opening-shell__top {
  position: relative;
  z-index: 3;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: var(--gal-topbar-h);
  padding: 10px 16px;
  background: linear-gradient(105deg, rgba(26, 16, 53, 0.94) 0%, rgba(30, 42, 74, 0.88) 100%);
  border-bottom: 1px solid var(--gal-border-strong);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.22);

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--gal-gradient-primary);
    opacity: 0.55;
  }
}

.opening-shell__brand {
  min-width: 0;
  flex: 1;
}

.opening-shell__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  line-height: 1.3;
  color: #f8fafc;
  animation: opening-title-glow 3.2s ease-in-out infinite alternate;
  will-change: filter;
}

.opening-shell__tagline {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--gal-text-muted);
  letter-spacing: 0.06em;
}

.opening-shell__fullscreen {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 32px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--gal-border);
  border-radius: 10px;
  background: var(--gal-glass);
  color: var(--gal-text);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--gal-transition);

  &:hover,
  &--active {
    border-color: rgba(96, 165, 250, 0.5);
    color: var(--gal-blue);
    background: var(--gal-blue-soft);
  }
}

.opening-shell__body {
  position: relative;
  z-index: 2;
  min-height: var(--gal-body-h);
  max-height: var(--gal-body-h);
  overflow-y: auto;
  padding: 16px 20px 18px;
  background: rgba(14, 20, 36, 0.28);
  backdrop-filter: blur(2px);
}

.opening-layout {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  gap: 18px;
  min-height: 100%;
}

.opening-profile {
  flex: 0 0 248px;
  min-width: 0;
}

.opening-profile__card {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 14px;
  border-radius: var(--gal-radius-md);
  border: 1px solid rgba(167, 139, 250, 0.28);
  background: linear-gradient(165deg, rgba(18, 24, 42, 0.88) 0%, rgba(26, 16, 48, 0.72) 100%);
  backdrop-filter: blur(12px);
  box-shadow:
    0 10px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.opening-profile__heading,
.opening-main__heading {
  width: 100%;
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--gal-text-muted);
  text-transform: uppercase;

  i {
    margin-right: 6px;
    color: var(--gal-violet);
  }
}

.opening-profile__frame {
  position: relative;
  width: 132px;
  margin-bottom: 12px;
}

.opening-profile__orbit {
  position: absolute;
  inset: -10px -6px;
  border-radius: calc(var(--gal-radius-md) + 6px);
  border: 1px dashed rgba(167, 139, 250, 0.4);
  box-shadow: 0 0 20px rgba(129, 140, 248, 0.2);
  pointer-events: none;
}

.opening-profile__avatar {
  position: relative;
  display: block;
  width: 132px;
  aspect-ratio: 295 / 358;
  border-radius: var(--gal-radius-md);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  background:
    linear-gradient(rgba(8, 12, 24, 0.92), rgba(8, 12, 24, 0.92)) padding-box,
    var(--gal-gradient-primary) border-box;
  box-shadow: var(--gal-shadow-glow);
  transition:
    transform var(--gal-transition),
    box-shadow var(--gal-transition);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(129, 140, 248, 0.35);

    .opening-profile__avatar-hint {
      opacity: 1;
    }
  }

  &--has-image .opening-profile__avatar-hint {
    opacity: 0;
  }

  &--has-image:hover .opening-profile__avatar-hint {
    opacity: 1;
  }
}

.opening-profile__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
}

.opening-profile__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(160deg, rgba(244, 114, 182, 0.12) 0%, rgba(96, 165, 250, 0.1) 100%);

  i {
    font-size: 36px;
    color: rgba(167, 139, 250, 0.55);
  }

  em {
    font-style: normal;
    font-size: 28px;
    font-weight: 800;
    color: var(--gal-pink);
    line-height: 1;
  }
}

.opening-profile__avatar-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fff;
  background: rgba(6, 9, 18, 0.68);
  opacity: 0;
  transition: opacity var(--gal-transition);

  i {
    font-size: 20px;
  }
}

.opening-profile__avatar:not(.opening-profile__avatar--has-image) .opening-profile__avatar-hint {
  opacity: 0.9;
  justify-content: flex-end;
  padding-bottom: 14px;
  background: linear-gradient(180deg, transparent 45%, rgba(6, 9, 18, 0.82) 100%);
}

.opening-profile__name {
  margin: 0;
  max-width: 100%;
  font-size: 17px;
  font-weight: 800;
  text-align: center;
  word-break: break-word;
  color: var(--gal-pink);
}

.opening-profile__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--gal-text-muted);
}

.opening-profile__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--gal-border);
}

.opening-profile__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: var(--gal-radius-sm);
  background: rgba(129, 140, 248, 0.08);
  text-align: center;

  i {
    font-size: 11px;
    color: var(--gal-violet);
  }

  em {
    font-style: normal;
    font-size: 10px;
    color: var(--gal-text-muted);
  }

  strong {
    font-size: 15px;
    font-weight: 800;
    color: var(--gal-text);
  }
}

.opening-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.opening-shell__form-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: var(--gal-radius-md);
  border: 1px solid rgba(167, 139, 250, 0.22);
  background: linear-gradient(155deg, rgba(18, 24, 42, 0.82) 0%, rgba(26, 16, 48, 0.68) 100%);
  backdrop-filter: blur(10px);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.opening-main__heading {
  margin-bottom: 4px;
}

.opening-row {
  display: flex;
  gap: 14px;
  align-items: flex-end;
}

.opening-row--split {
  flex-wrap: wrap;
}

.opening-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.opening-field--grow {
  flex: 1 1 220px;
}

.opening-field--gender {
  flex: 0 1 auto;
}

.opening-field--group {
  gap: 10px;
}

.opening-field__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--gal-pink);
  letter-spacing: 0.1em;

  i {
    font-size: 10px;
    opacity: 0.85;
  }
}

.opening-field__input {
  width: 100%;
  padding: 11px 14px;
  border-radius: var(--gal-radius-sm);
  border: 1px solid var(--gal-border);
  background: rgba(8, 12, 24, 0.88);
  color: var(--gal-text);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.45;
  transition:
    border-color var(--gal-transition),
    box-shadow var(--gal-transition),
    background var(--gal-transition);

  &::placeholder {
    color: rgba(226, 232, 240, 0.32);
  }

  &:hover:not(:disabled) {
    border-color: rgba(244, 114, 182, 0.28);
  }

  &:focus {
    outline: none;
    border-color: rgba(96, 165, 250, 0.55);
    box-shadow: 0 0 0 3px var(--gal-blue-soft);
    background: rgba(10, 14, 28, 0.95);
  }

  &:disabled {
    opacity: 0.65;
  }
}

.opening-field__textarea {
  resize: vertical;
  min-height: 58px;
}

.opening-segment {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.opening-segment--gender {
  flex-wrap: nowrap;
}

.opening-segment--difficulty {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.opening-segment__btn {
  flex: 1;
  min-width: 64px;
  padding: 10px 14px;
  border-radius: var(--gal-radius-sm);
  border: 1px solid var(--gal-border);
  background: rgba(8, 12, 24, 0.88);
  color: var(--gal-text-muted);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--gal-transition);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    color: var(--gal-text);
  }

  &--active {
    color: var(--gal-text);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.opening-segment__btn--icon {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 56px;
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 600;

  i {
    font-size: 15px;
  }
}

.opening-segment__btn--icon.opening-segment__btn--active {
  border-color: rgba(244, 114, 182, 0.55);
  background: var(--gal-pink-soft);
}

.opening-segment__btn--difficulty {
  padding: 12px 8px;
  letter-spacing: 0.12em;
  text-indent: 0.12em;
}

.opening-segment__btn--easy.opening-segment__btn--active {
  border-color: rgba(52, 211, 153, 0.55);
  background: rgba(52, 211, 153, 0.12);
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.15);
}

.opening-segment__btn--normal.opening-segment__btn--active {
  border-color: rgba(96, 165, 250, 0.55);
  background: var(--gal-blue-soft);
}

.opening-segment__btn--hard.opening-segment__btn--active {
  border-color: rgba(251, 113, 133, 0.55);
  background: rgba(251, 113, 133, 0.12);
  box-shadow: 0 0 20px rgba(251, 113, 133, 0.12);
}

.opening-stats-preview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--gal-radius-sm);
  border: 1px dashed rgba(167, 139, 250, 0.28);
  background: rgba(129, 140, 248, 0.06);
}

.opening-stats-preview__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  text-align: center;

  i {
    font-size: 11px;
    color: var(--gal-violet);
    opacity: 0.9;
  }

  em {
    font-style: normal;
    font-size: 10px;
    color: var(--gal-text-muted);
  }

  strong {
    font-size: 15px;
    font-weight: 800;
    color: var(--gal-text);
    line-height: 1.1;
  }
}

.opening-shell__error {
  margin: 0;
  font-size: 12px;
  color: var(--gal-danger);
  text-align: center;
}

.opening-shell__submit {
  position: relative;
  overflow: hidden;
  margin-top: 2px;
  padding: 15px 28px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-indent: 0.14em;
}

.opening-shell__submit-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.22) 48%,
    transparent 100%
  );
  transform: translateX(-120%);
  animation: opening-submit-shine 3.6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes opening-title-glow {
  0% {
    filter: drop-shadow(0 0 6px rgba(167, 139, 250, 0.28));
  }

  100% {
    filter: drop-shadow(0 0 14px rgba(244, 114, 182, 0.42));
  }
}

@keyframes opening-star-twinkle {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }

  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes opening-glow-drift {
  0% {
    transform: translateX(-50%) translateY(0);
  }

  100% {
    transform: translateX(-48%) translateY(12px);
  }
}

@keyframes opening-submit-shine {
  0%,
  72% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(120%);
  }
}

@keyframes opening-magic-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes opening-magic-spin-reverse {
  from {
    transform: rotate(360deg);
  }

  to {
    transform: rotate(0deg);
  }
}

@keyframes opening-meteor-fly {
  0% {
    opacity: 0;
    transform: rotate(-38deg) translateX(0);
  }

  8% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: rotate(-38deg) translateX(220px) translateY(120px);
  }
}

@keyframes opening-mote-rise {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.6);
  }

  12% {
    opacity: 0.85;
  }

  100% {
    opacity: 0;
    transform: translateY(-320px) scale(1.1);
  }
}

@keyframes opening-parallax-drift {
  from {
    transform: translate3d(0, 0, 0);
  }

  to {
    transform: translate3d(-120px, -80px, 0);
  }
}

@keyframes opening-nebula-drift-violet {
  0% {
    transform: translate(0, 0) scale(1);
  }

  100% {
    transform: translate(8px, 16px) scale(1.06);
  }
}

@keyframes opening-nebula-drift-blue {
  0% {
    transform: translate(0, 0) scale(1);
  }

  100% {
    transform: translate(-14px, -12px) scale(1.05);
  }
}
</style>

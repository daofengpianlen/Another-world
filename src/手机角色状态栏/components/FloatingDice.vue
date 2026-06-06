<template>
  <div class="floating-dice" :class="{ 'floating-dice--compact': compact }">
    <div class="floating-dice__stage">
      <div ref="cube_ref" class="floating-dice__cube" aria-hidden="true">
        <div v-for="face in faces" :key="face" class="floating-dice__face" :class="`floating-dice__face--${face}`">
          <span class="floating-dice__pip" v-for="n in pip_count(face)" :key="n"></span>
        </div>
      </div>
      <div class="floating-dice__shadow" aria-hidden="true"></div>
    </div>
    <p v-if="caption" class="floating-dice__caption">{{ caption }}</p>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';

const props = withDefaults(
  defineProps<{
    caption?: string;
    compact?: boolean;
  }>(),
  {
    caption: '',
    compact: false,
  },
);

const cube_ref = ref<HTMLElement | null>(null);
const faces = [1, 2, 3, 4, 5, 6] as const;

function pip_count(face: number): number[] {
  const map: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
  return _.range(map[face]);
}

let tween: gsap.core.Tween | null = null;
let float_tween: gsap.core.Tween | null = null;

onMounted(() => {
  const cube = cube_ref.value;
  if (!cube) return;

  gsap.set(cube, { rotateX: -18, rotateY: 24 });

  tween = gsap.to(cube, {
    rotateY: '+=360',
    rotateX: '-=12',
    duration: props.compact ? 9 : 12,
    ease: 'none',
    repeat: -1,
  });

  float_tween = gsap.to(cube, {
    y: props.compact ? -5 : -8,
    duration: 1.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
});

onUnmounted(() => {
  tween?.kill();
  float_tween?.kill();
});
</script>

<style lang="scss" scoped>
.floating-dice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  user-select: none;
}

.floating-dice__stage {
  position: relative;
  width: 52px;
  height: 52px;
  perspective: 220px;
}

.floating-dice--compact .floating-dice__stage {
  width: 44px;
  height: 44px;
  perspective: 180px;
}

.floating-dice__cube {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.floating-dice__face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 5px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(145deg, rgba(88, 130, 255, 0.95), rgba(168, 85, 247, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -2px 6px rgba(0, 0, 0, 0.25);
  backface-visibility: hidden;
}

.floating-dice--compact .floating-dice__face {
  border-radius: 6px;
  padding: 4px;
}

.floating-dice__face--1 {
  transform: rotateY(0deg) translateZ(26px);
}
.floating-dice__face--2 {
  transform: rotateY(180deg) translateZ(26px);
}
.floating-dice__face--3 {
  transform: rotateY(90deg) translateZ(26px);
}
.floating-dice__face--4 {
  transform: rotateY(-90deg) translateZ(26px);
}
.floating-dice__face--5 {
  transform: rotateX(90deg) translateZ(26px);
}
.floating-dice__face--6 {
  transform: rotateX(-90deg) translateZ(26px);
}

.floating-dice--compact .floating-dice__face--1 {
  transform: rotateY(0deg) translateZ(22px);
}
.floating-dice--compact .floating-dice__face--2 {
  transform: rotateY(180deg) translateZ(22px);
}
.floating-dice--compact .floating-dice__face--3 {
  transform: rotateY(90deg) translateZ(22px);
}
.floating-dice--compact .floating-dice__face--4 {
  transform: rotateY(-90deg) translateZ(22px);
}
.floating-dice--compact .floating-dice__face--5 {
  transform: rotateX(90deg) translateZ(22px);
}
.floating-dice--compact .floating-dice__face--6 {
  transform: rotateX(-90deg) translateZ(22px);
}

.floating-dice__pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.45);
  place-self: center;
}

.floating-dice--compact .floating-dice__pip {
  width: 4px;
  height: 4px;
}

/* 标准骰面点数布局 */
.floating-dice__face--1 .floating-dice__pip:nth-child(1) {
  grid-area: 2 / 2;
}

.floating-dice__face--2 .floating-dice__pip:nth-child(1) {
  grid-area: 1 / 1;
}
.floating-dice__face--2 .floating-dice__pip:nth-child(2) {
  grid-area: 3 / 3;
}

.floating-dice__face--3 .floating-dice__pip:nth-child(1) {
  grid-area: 1 / 1;
}
.floating-dice__face--3 .floating-dice__pip:nth-child(2) {
  grid-area: 2 / 2;
}
.floating-dice__face--3 .floating-dice__pip:nth-child(3) {
  grid-area: 3 / 3;
}

.floating-dice__face--4 .floating-dice__pip:nth-child(1) {
  grid-area: 1 / 1;
}
.floating-dice__face--4 .floating-dice__pip:nth-child(2) {
  grid-area: 1 / 3;
}
.floating-dice__face--4 .floating-dice__pip:nth-child(3) {
  grid-area: 3 / 1;
}
.floating-dice__face--4 .floating-dice__pip:nth-child(4) {
  grid-area: 3 / 3;
}

.floating-dice__face--5 .floating-dice__pip:nth-child(1) {
  grid-area: 1 / 1;
}
.floating-dice__face--5 .floating-dice__pip:nth-child(2) {
  grid-area: 1 / 3;
}
.floating-dice__face--5 .floating-dice__pip:nth-child(3) {
  grid-area: 2 / 2;
}
.floating-dice__face--5 .floating-dice__pip:nth-child(4) {
  grid-area: 3 / 1;
}
.floating-dice__face--5 .floating-dice__pip:nth-child(5) {
  grid-area: 3 / 3;
}

.floating-dice__face--6 .floating-dice__pip:nth-child(1) {
  grid-area: 1 / 1;
}
.floating-dice__face--6 .floating-dice__pip:nth-child(2) {
  grid-area: 1 / 3;
}
.floating-dice__face--6 .floating-dice__pip:nth-child(3) {
  grid-area: 2 / 1;
}
.floating-dice__face--6 .floating-dice__pip:nth-child(4) {
  grid-area: 2 / 3;
}
.floating-dice__face--6 .floating-dice__pip:nth-child(5) {
  grid-area: 3 / 1;
}
.floating-dice__face--6 .floating-dice__pip:nth-child(6) {
  grid-area: 3 / 3;
}

.floating-dice__shadow {
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 36px;
  height: 8px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(168, 85, 247, 0.35), transparent 70%);
  filter: blur(2px);
  animation: dice-shadow 1.6s ease-in-out infinite alternate;
}

.floating-dice--compact .floating-dice__shadow {
  width: 30px;
  height: 6px;
}

.floating-dice__caption {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--gal-text-muted);
  text-align: center;

  :deep(strong) {
    color: var(--gal-blue);
    font-weight: 700;
  }
}

@keyframes dice-shadow {
  from {
    opacity: 0.45;
    transform: translateX(-50%) scale(0.85);
  }

  to {
    opacity: 0.75;
    transform: translateX(-50%) scale(1.05);
  }
}
</style>

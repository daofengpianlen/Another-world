<template>
  <div class="opening-screen">
    <div class="opening-screen__glow opening-screen__glow--pink" aria-hidden="true"></div>
    <div class="opening-screen__glow opening-screen__glow--blue" aria-hidden="true"></div>

    <div class="opening-screen__card">
      <header class="opening-screen__header">
        <div class="opening-screen__icon-wrap">
          <i class="fa-solid fa-dragon"></i>
        </div>
        <h1 class="opening-screen__title">{{ OPENING_TITLE }}</h1>
        <p class="opening-screen__subtitle">创建你的异世界化身，开启冒险之旅</p>
      </header>

      <form class="opening-screen__form" @submit.prevent="submit">
        <label v-for="field in fields" :key="field.key" class="opening-field">
          <span class="opening-field__label">{{ field.label }}</span>
          <textarea
            v-if="field.multiline"
            :id="`opening-${field.key}`"
            :name="field.key"
            v-model="form[field.key]"
            class="opening-field__input opening-field__textarea"
            :placeholder="field.placeholder"
            :maxlength="field.max"
            rows="2"
            :disabled="loading"
          />
          <input
            v-else
            :id="`opening-${field.key}`"
            :name="field.key"
            v-model="form[field.key]"
            class="opening-field__input"
            type="text"
            :placeholder="field.placeholder"
            :maxlength="field.max"
            :disabled="loading"
          />
        </label>

        <p v-if="error" class="opening-screen__error">{{ error }}</p>

        <button class="opening-screen__submit gal-btn gal-btn--primary gal-btn--pill" type="submit" :disabled="!can_submit || loading">
          <i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-play'"></i>
          {{ loading ? '正在进入异世界…' : '开始游戏' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OPENING_TITLE, startGame, type ProtagonistCreation } from '../gameFlow';
import { syncDataFromMvu, useGalStore, useGamePhaseStore } from '../store';

const form = ref<ProtagonistCreation>({
  姓名: '',
  性格: '',
  外貌: '',
  身份: '',
});

const fields = [
  { key: '姓名' as const, label: '姓名', placeholder: '例如：艾伦', max: 20 },
  { key: '性格' as const, label: '性格', placeholder: '例如：冷静、善良、好奇心强', max: 60 },
  { key: '外貌' as const, label: '外貌', placeholder: '例如：黑短发，琥珀色眼睛', max: 120, multiline: true },
  { key: '身份' as const, label: '身份', placeholder: '例如：流浪剑士、学院新生', max: 40 },
];

const loading = ref(false);
const error = ref('');

const can_submit = computed(
  () => form.value.姓名.trim() && form.value.性格.trim() && form.value.外貌.trim() && form.value.身份.trim(),
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
    await startGame(form.value);
    gal.refreshFromGameplayMessage();
    syncDataFromMvu();
    toastr.success('冒险开始！');
  } catch (err) {
    phase.revertToOpening();
    const msg = err instanceof Error ? err.message : '生成失败，请重试';
    error.value = msg;
    toastr.error(msg);
    console.error('[异世界大冒险] 开局失败', err);
  } finally {
    phase.generating_opening = false;
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.opening-screen {
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: 16px auto;
  padding: 0 12px;
}

.opening-screen__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  pointer-events: none;
  opacity: 0.55;

  &--pink {
    width: 200px;
    height: 200px;
    top: -20px;
    right: 0;
    background: rgba(244, 114, 182, 0.35);
  }

  &--blue {
    width: 220px;
    height: 220px;
    bottom: 0;
    left: -40px;
    background: rgba(96, 165, 250, 0.28);
  }
}

.opening-screen__card {
  position: relative;
  border: 1px solid var(--gal-border-strong);
  border-radius: var(--gal-radius-lg);
  background: var(--gal-gradient-bg);
  box-shadow: var(--gal-shadow-card);
  overflow: hidden;
}

.opening-screen__header {
  padding: 32px 24px 22px;
  text-align: center;
  background: var(--gal-gradient-header);
  border-bottom: 1px solid var(--gal-border);

  &::after {
    content: '';
    display: block;
    width: 60%;
    height: 1px;
    margin: 16px auto 0;
    background: var(--gal-gradient-primary);
    opacity: 0.7;
  }
}

.opening-screen__icon-wrap {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: var(--gal-gradient-primary);
  box-shadow: var(--gal-shadow-glow);

  i {
    font-size: 28px;
    color: #fff;
  }
}

.opening-screen__title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #fff, var(--gal-pink), var(--gal-blue));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.opening-screen__subtitle {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--gal-text-muted);
}

.opening-screen__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 24px 26px;
}

.opening-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.opening-field__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--gal-pink);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.opening-field__input-wrap {
  padding: 1px;
  border-radius: var(--gal-radius-sm);
  background: var(--gal-gradient-input);
}

.opening-field__input {
  width: 100%;
  padding: 11px 14px;
  border-radius: var(--gal-radius-sm);
  border: 1px solid var(--gal-border);
  background: rgba(10, 14, 26, 0.9);
  color: var(--gal-text);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.45;
  transition: border-color var(--gal-transition);

  &:focus {
    outline: none;
    border-color: rgba(96, 165, 250, 0.5);
    box-shadow: 0 0 0 3px var(--gal-blue-soft);
  }

  &:disabled {
    opacity: 0.65;
  }
}

.opening-field__textarea {
  resize: vertical;
  min-height: 56px;
}

.opening-screen__error {
  margin: 0;
  font-size: 12px;
  color: var(--gal-danger);
  text-align: center;
}

.opening-screen__submit {
  margin-top: 6px;
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
</style>

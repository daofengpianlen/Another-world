<template>
  <section class="protagonist-panel">
    <div class="protagonist-panel__hero gal-card">
        <label class="avatar-upload" :class="{ 'avatar-upload--has-image': avatar_src }">
          <img v-if="avatar_src" :src="avatar_src" alt="主角头像" />
          <div v-else class="avatar-upload__placeholder">{{ initial }}</div>
          <input id="protagonist-avatar-upload" name="avatar" type="file" accept="image/*" hidden @change="onUpload" />
          <span class="avatar-upload__hint"><i class="fa-solid fa-camera"></i></span>
        </label>
        <div class="protagonist-panel__info">
          <h3 class="protagonist-panel__name">{{ hero.姓名 }}</h3>
          <div class="info-grid">
            <div class="info-row"><span>性格</span><strong>{{ hero.性格 || '—' }}</strong></div>
            <div class="info-row"><span>外貌</span><strong>{{ hero.外貌 || '—' }}</strong></div>
            <div class="info-row"><span>性别</span><strong>{{ hero.性别 }}</strong></div>
            <div class="info-row"><span>身份</span><strong>{{ hero.身份 }}</strong></div>
            <div class="info-row"><span>等级</span><strong class="info-row__level">Lv.{{ hero.等级 }}</strong></div>
            <div class="info-row info-row--exp">
              <span>经验</span>
              <div class="info-row__exp">
                <strong>{{ exp_text }}</strong>
                <div v-if="hero.等级 < 100" class="exp-bar">
                  <div class="exp-bar__fill" :style="{ width: `${exp_ratio * 100}%` }"></div>
                </div>
              </div>
            </div>
            <div class="info-row"><span>金币</span><strong class="info-row__gold">{{ hero.金币 }}</strong></div>
          </div>
        </div>
      </div>
      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.key" class="stat-card gal-card">
          <i :class="stat.icon"></i>
          <span class="stat-card__label">{{ stat.label }}</span>
          <strong class="stat-card__value">{{ stat.value }}</strong>
        </div>
      </div>
  </section>
</template>

<script setup lang="ts">
import { write_hero_avatar } from '../../heroAvatar';
import { exp_progress_ratio, format_exp_progress } from '../../progression';
import { useDataStore } from '../../store';

const data = useDataStore();
const hero = computed(() => data.data.主角);
const avatar_src = computed(() => hero.value.头像);
const initial = computed(() => hero.value.姓名.charAt(0) || '主');
const exp_text = computed(() => format_exp_progress(hero.value.等级, hero.value.经验));
const exp_ratio = computed(() => exp_progress_ratio(hero.value.等级, hero.value.经验));
const stats = computed(() => [
  { key: 'hp', label: '生命', icon: 'fa-solid fa-heart', value: hero.value.能力.生命 },
  { key: 'str', label: '力量', icon: 'fa-solid fa-hand-fist', value: hero.value.能力.力量 },
  { key: 'con', label: '体魄', icon: 'fa-solid fa-shield-halved', value: hero.value.能力.体魄 },
  { key: 'wis', label: '智慧', icon: 'fa-solid fa-brain', value: hero.value.能力.智慧 },
]);

function onUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      write_hero_avatar(reader.result);
      data.data.主角.头像 = reader.result;
    }
  };
  reader.readAsDataURL(file);
}
</script>

<style lang="scss" scoped>
.protagonist-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.protagonist-panel__hero {
  display: flex;
  gap: 14px;
}

.avatar-upload {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: var(--gal-radius-md);
  overflow: hidden;
  border: 2px solid transparent;
  background: linear-gradient(var(--gal-bg), var(--gal-bg)) padding-box,
    var(--gal-gradient-primary) border-box;
  cursor: pointer;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &--has-image .avatar-upload__hint {
    opacity: 0;
  }

  &--has-image:hover .avatar-upload__hint {
    opacity: 1;
  }
}

.avatar-upload__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gal-pink-soft);
  font-size: 30px;
  font-weight: 700;
  color: var(--gal-pink);
}

.avatar-upload__hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px;
  font-size: 11px;
  text-align: center;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  opacity: 1;
  transition: opacity var(--gal-transition);
}

.protagonist-panel__info {
  flex: 1;
  min-width: 0;
}

.protagonist-panel__name {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 800;
  color: var(--gal-text);
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
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
    color: var(--gal-text);
  }
}

.info-row__level {
  color: var(--gal-blue);
}

.info-row__gold {
  color: var(--gal-gold);
}

.info-row--exp {
  align-items: flex-start;
}

.info-row__exp {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;

  strong {
    font-variant-numeric: tabular-nums;
    color: var(--gal-violet);
  }
}

.exp-bar {
  width: 100%;
  max-width: 120px;
  height: 4px;
  border-radius: var(--gal-radius-pill);
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.exp-bar__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--gal-violet), var(--gal-pink));
  transition: width 0.35s ease;
}

.stats-grid {
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
  color: var(--gal-text);
}
</style>

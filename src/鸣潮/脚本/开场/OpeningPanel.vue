<template>
  <div class="wuwa-opening" :class="{ 'wuwa-opening--expanded': is_expanded || is_fullscreen }">
    <div v-if="show_disclaimer" class="disclaimer-overlay">
      <div class="disclaimer-box">
        <h3>⚠️ 严正声明</h3>
        <p>本作品完全免费，如果你从别处购买，说明你被骗了，同时请勿在墙内社区、QQ群传播、讨论相关内容。</p>
        <label class="disclaimer-check-row" :class="{ 'disclaimer-check-row--warn': disclaimer_warn, 'shake-animation': disclaimer_shake }">
          <input v-model="disclaimer_checked" type="checkbox" />
          <span>我已阅读、知晓并严格遵守上述规定</span>
        </label>
        <button type="button" class="wuwa-btn-base start-btn disclaimer-btn" @click="acceptDisclaimer">我已同意上方协议</button>
      </div>
    </div>

    <div ref="shell_ref" class="wuwa-shell">
      <div v-if="waiting_for_ai" class="wuwa-waiting">
        <div class="wuwa-waiting__spinner" aria-hidden="true"></div>
        <h3 class="wuwa-waiting__title">正在开启索拉里斯之旅</h3>
        <p class="wuwa-waiting__hint">AI 正在生成开场剧情，请稍候…</p>
        <p class="wuwa-waiting__sub">生成完成后将自动进入互动界面</p>
      </div>

      <template v-else>
      <button
        type="button"
        class="wuwa-fullscreen-btn"
        :class="{ 'wuwa-fullscreen-btn--active': is_fullscreen }"
        :title="is_fullscreen ? '还原' : '全屏'"
        @click="toggle_fullscreen"
      >
        <svg class="wuwa-fullscreen-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            v-if="!is_fullscreen"
            fill="currentColor"
            d="M7 3H3v4h2V5h2V3zm10 0v2h2v2h2V3h-4zM5 17H3v4h4v-2H5v-2zm14 2h-2v2h2v2h2v-4h-2z"
          />
          <path
            v-else
            fill="currentColor"
            d="M9 3H5v4h2V5h2V3zm10 0v2h2v2h2V3h-4zM5 17H3v4h4v-2H5v-2zm12 0h2v4h-4v-2h2v-2zM11 11H5v2h6v-2zm8 0h-6v2h6v-2z"
          />
        </svg>
        <span>{{ is_fullscreen ? '还原' : '全屏' }}</span>
      </button>

      <div class="wuwa-panel">
      <div class="wuwa-deco wuwa-deco--wave-top">
        <img :src="waveUrl" alt="" />
      </div>

      <div class="wuwa-ducks" aria-hidden="true">
        <div class="wuwa-duck wuwa-duck--a">
          <img :src="duckAUrl" alt="" />
        </div>
        <div class="wuwa-duck wuwa-duck--b">
          <img :src="duckBUrl" alt="" />
        </div>
      </div>

      <div class="wuwa-panel__scroll">
      <div class="wuwa-logo-container" :class="{ 'wuwa-logo-container--intro': intro_ready }">
        <img :src="logoUrl" alt="WuWa Logo" class="wuwa-logo" />
      </div>

      <div class="wuwa-grid" :class="{ 'wuwa-grid--intro': intro_ready }">
        <div class="col-left">
          <label class="toggle-row">
            <input v-model="form.isRover" type="checkbox" @change="onRoverToggle" />
            <span class="toggle-text">扮演漂泊者</span>
          </label>

          <div id="gender-selection-area" :class="{ 'fading-out': gender_fading }">
            <div v-if="form.isRover" class="gender-grid rover-mode">
              <div
                class="gender-card"
                :class="{ selected: form.myGender === '男' }"
                @click="selectMyGender('男')"
              >
                <div class="img-wrap"><img :src="roverMaleUrl" alt="男漂泊者" /></div>
                <div class="card-label">男漂泊者</div>
              </div>
              <div
                class="gender-card"
                :class="{ selected: form.myGender === '女' }"
                @click="selectMyGender('女')"
              >
                <div class="img-wrap"><img :src="roverFemaleUrl" alt="女漂泊者" /></div>
                <div class="card-label">女漂泊者</div>
              </div>
            </div>
            <div v-else class="gender-grid normal-mode">
              <div
                class="gender-card normal-btn"
                :class="{ selected: form.myGender === '男' }"
                @click="selectMyGender('男')"
              >
                ♂️ 男
              </div>
              <div
                class="gender-card normal-btn"
                :class="{ selected: form.myGender === '女' }"
                @click="selectMyGender('女')"
              >
                ♀️ 女
              </div>
              <div
                class="gender-card normal-btn"
                :class="{ selected: form.myGender === '未知' }"
                @click="selectMyGender('未知')"
              >
                ⚧️ 未知
              </div>
            </div>
          </div>

          <label class="wuwa-label">自定义身份/设定</label>
          <textarea
            v-model="form.customIdentity"
            class="wuwa-textarea"
            placeholder="在此输入额外的身份背景、能力设定或外貌描述..."
          ></textarea>

          <label v-show="!form.isRover" class="toggle-row toggle-row--refine">
            <input v-model="form.aiRefine" type="checkbox" />
            <span class="toggle-text toggle-text--small">让 AI 根据设定自动完善此变量</span>
          </label>

          <div v-show="!form.isRover" class="warning-text">
            ⚠️提示：您取消了“扮演漂泊者”。为了减少剧情串戏概率，请务必在上方输入框中补充您的简要设定，同时确认自己已通过世界书或者“用户设定管理”（顶部笑脸）**手动**注入了自己的完整设定！
          </div>

          <div class="npc-panel">
            <label class="toggle-row toggle-row--plain">
              <input v-model="form.npcExists" type="checkbox" />
              <span class="toggle-text">存在 NPC 漂泊者</span>
            </label>

            <div class="anim-box" :class="{ open: form.npcExists }">
              <div style="margin-top: 15px">
                <label class="wuwa-label">NPC 性别</label>
                <div class="gender-grid rover-mode">
                  <div
                    class="gender-card"
                    :class="{ selected: form.npcGender === '女' }"
                    @click="form.npcGender = '女'"
                  >
                    <div class="img-wrap"><img :src="roverFemaleUrl" alt="女漂泊者" /></div>
                    <div class="card-label">女漂泊者</div>
                  </div>
                  <div
                    class="gender-card"
                    :class="{ selected: form.npcGender === '男' }"
                    @click="form.npcGender = '男'"
                  >
                    <div class="img-wrap"><img :src="roverMaleUrl" alt="男漂泊者" /></div>
                    <div class="card-label">男漂泊者</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-right">
          <div class="npc-panel npc-panel--top">
            <label class="toggle-row toggle-row--plain">
              <input v-model="form.isStoryMode" type="checkbox" />
              <span class="toggle-text">剧情演绎模式</span>
            </label>
            <div class="story-hint">
              *不勾选则自动选择当前最新剧情版本的后日谈模式。注意：尽量选择某个大版本最结尾的部分为后日谈（比如v3.1，请选择“日光落处 (下)”作为后日谈版本，否则可能触发一些奇怪的问题）
            </div>

            <div class="anim-box" :class="{ open: form.isStoryMode }">
              <div style="margin-top: 10px">
                <label class="wuwa-label">剧情版本</label>
                <select v-model="form.storyVer" class="wuwa-select" :disabled="story_loading && !story_options.length">
                  <option v-if="story_loading && !story_options.length" disabled value="">
                    正在读取全局剧情数据…
                  </option>
                  <option v-else-if="!story_options.length" disabled value="">
                    未能加载剧情版本（请刷新页面或启用鸣潮共享脚本）
                  </option>
                  <option v-for="option in story_options" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>

                <label class="wuwa-label">剧情阶段</label>
                <select v-model="form.storyStage" class="wuwa-select">
                  <option v-for="stage in STORY_STAGE_OPTIONS" :key="stage" :value="stage">{{ stage }}</option>
                </select>
              </div>
            </div>
          </div>

          <label class="wuwa-label">所处区域</label>
          <select v-model="form.locationMain" class="wuwa-select">
            <option v-for="location in LOCATION_OPTIONS" :key="location" :value="location">{{ location }}</option>
          </select>

          <label class="wuwa-label">详细地点</label>
          <input
            v-model="form.locationDetail"
            class="wuwa-input"
            type="text"
            placeholder="如：星炬学院，留空则让AI自由发挥"
          />

          <label class="wuwa-label wuwa-label--required">开局见到的角色 (必填)</label>
          <input
            v-model="form.targetChar"
            class="wuwa-input"
            :class="{ 'wuwa-input--error': target_error }"
            type="text"
            placeholder="如：秧秧、炽霞 (多人请用顿号隔开)"
          />

          <label class="wuwa-label">补充剧情</label>
          <textarea
            v-model="form.plotExtra"
            class="wuwa-textarea"
            placeholder="如：从床上醒来，留空则让AI自由发挥"
          ></textarea>
        </div>
      </div>

      <div class="action-row" :class="{ 'action-row--intro': intro_ready }">
        <button type="button" class="wuwa-btn-base example-btn" :disabled="submitting" @click="fillExample">
          <span class="example-btn__icon">✎</span> 填写示例
        </button>
        <button
          type="button"
          class="wuwa-btn-base start-btn"
          :class="{ 'start-btn--loading': submitting }"
          :disabled="submitting || !env.ready"
          @click="startGame"
        >
          {{ submitting ? '正在开启旅程…' : '开启我的索拉里斯之旅' }}
        </button>
      </div>

      <div class="status-bar-bottom" :class="{ 'status-bar-bottom--intro': intro_ready }">
        系统状态:
        <span class="status-badge" :class="env.ready ? 'status-ok' : 'status-err'">{{ status_text }}</span>
      </div>
      </div>

      <div class="wuwa-deco wuwa-deco--wave-bottom">
        <img :src="waveUrl" alt="" />
      </div>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { resolveWuwaMediaUrl } from '../../shared/wuwaMedia';
import {
  DUCK_A_URL,
  DUCK_B_URL,
  LOCATION_OPTIONS,
  LOGO_URL,
  ROVER_FEMALE_URL,
  ROVER_MALE_URL,
  STORY_STAGE_OPTIONS,
  WAVE_URL,
} from './constants';
import {
  applyExampleForm,
  buildStoryVersionOptions,
  chatHasWuwaGameStarted,
  hasGalBlock,
  createDefaultFormState,
  detectOpeningEnvironment,
  mergeFormFromYaml,
  submitOpeningForm,
} from './openingLogic';
import type { Gender, OpeningEnvironment, OpeningFormState } from './types';
import { WUWA_SHELL_FULLSCREEN_KEY } from '../伪同层/wuwaShellContext';

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });

const shell_ctx = inject(WUWA_SHELL_FULLSCREEN_KEY, null);

const waveUrl = computed(() => resolveWuwaMediaUrl(WAVE_URL));
const duckAUrl = computed(() => resolveWuwaMediaUrl(DUCK_A_URL));
const duckBUrl = computed(() => resolveWuwaMediaUrl(DUCK_B_URL));
const logoUrl = computed(() => resolveWuwaMediaUrl(LOGO_URL));
const roverMaleUrl = computed(() => resolveWuwaMediaUrl(ROVER_MALE_URL));
const roverFemaleUrl = computed(() => resolveWuwaMediaUrl(ROVER_FEMALE_URL));

const shell_ref = ref<HTMLElement | null>(null);
const fallback_fullscreen = ref(false);
const fallback_expanded = ref(false);
const is_fullscreen = shell_ctx?.is_fullscreen ?? fallback_fullscreen;
const is_expanded = shell_ctx?.is_expanded ?? fallback_expanded;
const toggle_fullscreen = shell_ctx?.toggle_fullscreen ?? (() => undefined);

const form = reactive<OpeningFormState>(createDefaultFormState());
const env = reactive<OpeningEnvironment>({
  ready: false,
  errors: [],
  warnings: [],
  storyMap: null,
  targetBookName: null,
  initEntryUid: null,
  openingEntryUid: null,
  openingContent: '',
});

const show_disclaimer = ref(true);
const disclaimer_checked = ref(false);
const disclaimer_warn = ref(false);
const disclaimer_shake = ref(false);
const intro_ready = ref(false);
const gender_fading = ref(false);
const submitting = ref(false);
const waiting_for_ai = ref(false);
const story_loading = ref(true);
const target_error = ref(false);

const story_options = computed(() => buildStoryVersionOptions(env.storyMap));

const status_text = computed(() => {
  if (!env.ready) return `异常: ${env.errors.join(' | ')}`;
  if (story_loading.value && !story_options.value.length) return '正在读取全局剧情…';
  if (!story_options.value.length && env.warnings.length) return env.warnings.join(' | ');
  if (env.warnings.length) return `环境就绪（${env.warnings[0]}）`;
  return '环境就绪';
});

async function refreshEnvironment() {
  const detected = await detectOpeningEnvironment();
  Object.assign(env, detected);
  story_loading.value = false;

  if (env.storyMap && story_options.value.length > 0) {
    const has_current = story_options.value.some(option => option.value === form.storyVer);
    if (!form.storyVer || !has_current) form.storyVer = story_options.value[0].value;
  }
}

function acceptDisclaimer() {
  if (!disclaimer_checked.value) {
    toastr.warning('请先勾选确认方框，表示您已同意条款！');
    disclaimer_warn.value = true;
    disclaimer_shake.value = false;
    void document.body.offsetWidth;
    disclaimer_shake.value = true;
    return;
  }
  show_disclaimer.value = false;
}

function selectMyGender(gender: Gender) {
  form.myGender = gender;
}

function onRoverToggle() {
  gender_fading.value = true;
  setTimeout(() => {
    if (form.isRover && form.myGender === '未知') form.myGender = '男';
    gender_fading.value = false;
  }, 250);
}

function fillExample() {
  Object.assign(form, applyExampleForm());
  toastr.success('已填入示例数据');
}

function tryDismissWaitingOverlay() {
  if (!waiting_for_ai.value) return;
  if (chatHasWuwaGameStarted()) waiting_for_ai.value = false;
}

async function waitForOpeningGalReady(reply: string, timeout_ms = 45000) {
  if (hasGalBlock(reply) || chatHasWuwaGameStarted()) {
    waiting_for_ai.value = false;
    return;
  }

  const started_at = Date.now();
  while (Date.now() - started_at < timeout_ms) {
    await new Promise<void>(resolve => window.setTimeout(resolve, 400));
    if (hasGalBlock(reply) || chatHasWuwaGameStarted()) {
      waiting_for_ai.value = false;
      return;
    }
  }

  waiting_for_ai.value = false;
  toastr.warning('开场剧情已生成，但未检测到 <gal> 标签；请刷新页面或检查 AI 输出格式', { timeOut: 8000 });
}

async function startGame() {
  if (!env.ready) {
    toastr.error(`环境未就绪，无法开局：${env.errors.join(' | ')}`, { timeOut: 6000 });
    return;
  }

  if (form.isStoryMode && !story_options.value.length) {
    toastr.error('剧情版本列表尚未加载，请刷新页面或启用「鸣潮共享」脚本', { timeOut: 6000 });
    return;
  }

  if (form.isStoryMode && !form.storyVer) {
    toastr.error('请选择剧情版本', { timeOut: 4000 });
    return;
  }

  target_error.value = false;
  submitting.value = true;
  waiting_for_ai.value = true;
  try {
    const reply = await submitOpeningForm(form, env);
    toastr.info('正在等待 AI 生成开场剧情…');
    await waitForOpeningGalReady(reply);
  } catch (error) {
    waiting_for_ai.value = false;
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'missing target character') {
      target_error.value = true;
    } else {
      toastr.error(`开局失败：${message}`, { timeOut: 6000 });
      console.error('[鸣潮开场] 提交失败', error);
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  toastr.options = { positionClass: 'toast-bottom-right', timeOut: '4000' };

  const dismiss_events = [
    tavern_events.CHARACTER_MESSAGE_RENDERED,
    tavern_events.MESSAGE_RECEIVED,
    tavern_events.GENERATION_ENDED,
    tavern_events.CHAT_CHANGED,
  ] as const;
  for (const event of dismiss_events) {
    eventOn(event, tryDismissWaitingOverlay);
  }

  await refreshEnvironment();
  Object.assign(form, mergeFormFromYaml(form, env.openingContent));

  if (!env.storyMap) {
    for (let i = 0; i < 4; i += 1) {
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      story_loading.value = true;
      await refreshEnvironment();
      if (env.storyMap) break;
    }
  }

  intro_ready.value = true;
});
</script>

<style lang="scss" scoped>
@use './opening.scss';
</style>

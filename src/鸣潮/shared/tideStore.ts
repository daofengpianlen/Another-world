import { ensureWuwaStatDataReady, isWuwaTruthy, readWuwaStatData, type StatData } from './tideMvuReader';
import { hasMeaningfulStatData } from './tideDisplay';
import { getMvuApi } from './wuwaTavern';

type TideTrigger = {
  事件类别?: string;
  事件简述?: string;
  状态?: string;
  事件计时?: string;
};

type TideForeshadow = {
  伏笔内容?: string;
  指向的预期结果?: string;
};

export const useTideStore = defineStore('wuwa_tide', () => {
  const stat_data = ref<StatData>({});
  const data_ready = ref(false);
  const load_error = ref('');

  const safe = (value: unknown, fallback = '--') =>
    value !== undefined && value !== null && value !== '' ? String(value) : fallback;

  const has_data = computed(() => hasMeaningfulStatData(stat_data.value));

  const protagonist = computed(() => (stat_data.value.主角信息 as Record<string, unknown>) ?? {});
  const npc_rover = computed(() => (stat_data.value.NPC漂泊者 as Record<string, unknown>) ?? {});
  const heroines = computed(() => (stat_data.value.女性角色 as Record<string, Record<string, unknown>>) ?? {});
  const inventory = computed(() => (protagonist.value.物品栏 as Record<string, Record<string, unknown>>) ?? {});
  const triggers = computed(() => (stat_data.value.剧情触发器 as TideTrigger[]) ?? []);
  const foreshadows = computed(() => (stat_data.value.伏笔 as TideForeshadow[]) ?? []);

  async function refresh() {
    load_error.value = '';
    try {
      const next = readWuwaStatData();
      stat_data.value = next;
      data_ready.value = hasMeaningfulStatData(next);
      if (!data_ready.value) {
        load_error.value =
          '未读取到有效 MVU 数据。请确认：① 已启用 MVU ② 已完成开场 ③ AI 回复含 <UpdateVariable>（或聊天第 0 楼已有 initvar）';
      }
    } catch (error) {
      data_ready.value = false;
      load_error.value = (error as Error).message || '读取变量失败';
      console.error('[鸣潮浪潮] refresh 失败', error);
    }
  }

  async function init() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      stat_data.value =
        attempt === 0 ? await ensureWuwaStatDataReady() : readWuwaStatData();
      if (hasMeaningfulStatData(stat_data.value)) break;
      await new Promise(resolve => window.setTimeout(resolve, 180 * (attempt + 1)));
    }

    data_ready.value = hasMeaningfulStatData(stat_data.value);
    if (!data_ready.value) {
      load_error.value =
        '未读取到有效 MVU 数据。请确认：① 已启用 MVU ② 已完成开场 ③ AI 回复含 <UpdateVariable>（或聊天第 0 楼已有 initvar）';
    }

    try {
      const MvuApi = getMvuApi();
      eventOn(MvuApi.events.VARIABLE_UPDATE_ENDED, () => void refresh());
    } catch {
      /* MVU 事件不可用 */
    }

    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, () => void refresh());
    eventOn(tavern_events.MESSAGE_RECEIVED, () => void refresh());
    eventOn(tavern_events.CHAT_CHANGED, () => void refresh());
  }

  void init();

  return {
    stat_data,
    data_ready,
    load_error,
    has_data,
    protagonist,
    npc_rover,
    heroines,
    inventory,
    triggers,
    foreshadows,
    safe,
    isTruthy: isWuwaTruthy,
    refresh,
  };
});

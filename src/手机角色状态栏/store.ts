import { CG_GALLERY, findCgOwner, isSameMediaUrl, resolveMediaUrl } from './config';
import type { PanelId } from './components/FunctionBar.vue';
import { useCombatStore } from './combatStore';
import { useEventStore } from './eventStore';
import {
  build_event_ai_prompt,
  read_player_stat,
  resolve_event_choice,
  resolve_event_ignore,
} from './eventSystem';
import { chatHasGalBlock, chatHasOpeningMarker, getLatestGalMessage, getLastRegenerableGameExchange, OPENING_FLOOR_ID, regenerateLastGameMessage, resolveGameplayMessageId, sendGameMessage } from './gameFlow';
import { getUserPersonaDisplay } from './chatPersona';
import { load_npc_thread, open_npc_thread, send_private_chat, regenerate_private_chat_from, edit_private_chat_message } from './privateChat';
import {
  isBattleTimelineStep,
  isEventTimelineStep,
  lastDialogueIndexBefore,
  parseGalFromMessage,
  primaryBattleTimelineIndex,
  primaryEventTimelineIndex,
  resolveMediaState,
  timelineIndexOfDialogue,
  type ParsedGal,
} from './galParser';
import { isOpeningFloor, useMessageScope } from './messageScope';
import { merge_hero_avatar_into_stat_data } from './heroAvatar';
import { Schema, emptyStatData, parseStatData } from './schema';
import { useStatChangeStore } from './statChangeStore';
import { write_current_region } from './regionState';
import {
  getDefaultMapAreaBackgroundForRegion,
  getDefaultMapAreaLabelForRegion,
  resolveMapAreaRef,
} from './mapAreaScenes';
import {
  build_wild_journal_summary_prompt,
  clear_wild_journal,
} from './wildJournal';

export const useGamePhaseStore = defineStore('game_phase', () => {
  function readPhase(): 'opening' | 'playing' {
    if (chatHasGalBlock()) return 'playing';
    if (chatHasOpeningMarker()) return 'opening';
    const chat_phase = _.get(getVariables({ type: 'chat' }), 'gal_phase');
    return chat_phase === 'playing' ? 'playing' : 'opening';
  }

  const phase = ref<'opening' | 'playing'>(readPhase());
  const generating_opening = ref(false);

  function enterPlaying() {
    phase.value = 'playing';
    replaceVariables(klona({ ...getVariables({ type: 'chat' }), gal_phase: 'playing' }), { type: 'chat' });
  }

  function revertToOpening() {
    phase.value = 'opening';
    replaceVariables(klona({ ...getVariables({ type: 'chat' }), gal_phase: 'opening' }), { type: 'chat' });
  }

  function syncPhase() {
    phase.value = readPhase();
  }

  return {
    phase,
    generating_opening,
    enterPlaying,
    revertToOpening,
    syncPhase,
  };
});

export const useDataStore = defineStore('phone_character_mvu', () => {
  const { message_id } = useMessageScope();
  const data = ref(emptyStatData()) as Ref<Schema>;

  function resolveMvuMessageId(): number | 'latest' {
    const phase = useGamePhaseStore();
    if (phase.phase === 'playing') {
      const latest_gal = getLatestGalMessage();
      if (latest_gal) return latest_gal.message_id;
      return resolveGameplayMessageId(OPENING_FLOOR_ID);
    }
    return message_id.value;
  }

  function readStatData(target_id: number | 'latest'): unknown {
    try {
      return _.get(Mvu.getMvuData({ type: 'message', message_id: target_id }), 'stat_data', {});
    } catch {
      return _.get(getVariables({ type: 'message', message_id: target_id }), 'stat_data', {});
    }
  }

  function syncFromVariables() {
    const target_id = resolveMvuMessageId();
    const stat_data = readStatData(target_id);
    try {
      const merged = merge_hero_avatar_into_stat_data(parseStatData(stat_data));
      useStatChangeStore().ingest(merged);
      data.value = merged;
    } catch (error) {
      console.warn('[MVU] stat_data 解析失败', {
        target_id,
        error: error instanceof z.ZodError ? z.prettifyError(error) : error,
      });
    }
  }

  syncFromVariables();

  useIntervalFn(syncFromVariables, 2000);

  void waitGlobalInitialized('Mvu').then(() => {
    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
      syncFromVariables();
    });
  });

  watch(
    () => useGamePhaseStore().phase,
    (next, prev) => {
      if (next === 'playing' && prev === 'opening') syncFromVariables();
    },
  );

  watch(
    data,
    new_data => {
      const result = Schema.safeParse(new_data);
      if (!result.success) return;
      updateVariablesWith(variables => _.set(variables, 'stat_data', result.data), {
        type: 'message',
        message_id: resolveMvuMessageId(),
      });
    },
    { deep: true },
  );

  watch(message_id, () => {
    useStatChangeStore().reset();
    syncFromVariables();
  });

  return { data, syncFromVariables };
});

/** 从 MVU 楼层变量同步 stat_data；兼容旧 bundle 未导出 syncFromVariables 的情况 */
export function syncDataFromMvu() {
  const store = useDataStore();
  if (typeof store.syncFromVariables === 'function') {
    store.syncFromVariables();
  }
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'system' | 'npc';
  text: string;
}

export const useUiStore = defineStore('gal_ui', () => {
  const chat_npc = ref<string | null>(null);
  const npc_profile_name = ref<string | null>(null);
  const chat_threads = ref<Record<string, ChatMessage[]>>({});
  const chat_sending = ref(false);
  const navigate_to = ref<PanelId | null>(null);

  function sync_chat_thread(name: string) {
    chat_threads.value = {
      ...chat_threads.value,
      [name]: load_npc_thread(name),
    };
  }

  function open_npc_chat(name: string) {
    chat_npc.value = name;
    chat_threads.value = {
      ...chat_threads.value,
      [name]: open_npc_thread(name),
    };
  }

  function close_npc_chat() {
    chat_npc.value = null;
  }

  function open_npc_profile(name: string) {
    npc_profile_name.value = name;
  }

  function close_npc_profile() {
    npc_profile_name.value = null;
  }

  async function send_npc_chat(text: string) {
    const name = chat_npc.value;
    if (!name || !text.trim() || chat_sending.value) return;

    const data = useDataStore();
    const npc = data.data.邂逅名录[name];
    if (!npc) {
      toastr.error(`未找到 ${name}`);
      return;
    }

    chat_sending.value = true;
    try {
      const player_name = data.data.主角.姓名 || getUserPersonaDisplay().name;
      const thread = await send_private_chat(
        name,
        text.trim(),
        player_name,
        npc,
        data.data.主角,
        updated => {
          chat_threads.value = { ...chat_threads.value, [name]: [...updated] };
        },
      );
      chat_threads.value = { ...chat_threads.value, [name]: thread };
    } catch (error) {
      const message = error instanceof Error ? error.message : '私聊发送失败';
      console.error('[私聊]', error);
      toastr.error(message);
      sync_chat_thread(name);
    } finally {
      chat_sending.value = false;
    }
  }

  async function regenerate_npc_chat(message_id: string) {
    const name = chat_npc.value;
    if (!name || !message_id || chat_sending.value) return;

    const data = useDataStore();
    const npc = data.data.邂逅名录[name];
    if (!npc) {
      toastr.error(`未找到 ${name}`);
      return;
    }

    chat_sending.value = true;
    try {
      const player_name = data.data.主角.姓名 || getUserPersonaDisplay().name;
      const thread = await regenerate_private_chat_from(
        name,
        message_id,
        player_name,
        npc,
        data.data.主角,
        updated => {
          chat_threads.value = { ...chat_threads.value, [name]: [...updated] };
        },
      );
      chat_threads.value = { ...chat_threads.value, [name]: thread };
    } catch (error) {
      const message = error instanceof Error ? error.message : '重新生成失败';
      console.error('[私聊]', error);
      toastr.error(message);
      sync_chat_thread(name);
    } finally {
      chat_sending.value = false;
    }
  }

  async function edit_npc_chat_message(message_id: string, new_text: string) {
    const name = chat_npc.value;
    if (!name || !message_id || !new_text.trim() || chat_sending.value) return;

    const data = useDataStore();
    const npc = data.data.邂逅名录[name];
    if (!npc) {
      toastr.error(`未找到 ${name}`);
      return;
    }

    chat_sending.value = true;
    try {
      const player_name = data.data.主角.姓名 || getUserPersonaDisplay().name;
      const thread = await edit_private_chat_message(
        name,
        message_id,
        new_text.trim(),
        player_name,
        npc,
        data.data.主角,
        updated => {
          chat_threads.value = { ...chat_threads.value, [name]: [...updated] };
        },
      );
      chat_threads.value = { ...chat_threads.value, [name]: thread };
    } catch (error) {
      const message = error instanceof Error ? error.message : '编辑失败';
      console.error('[私聊]', error);
      toastr.error(message);
      sync_chat_thread(name);
    } finally {
      chat_sending.value = false;
    }
  }

  function consume_navigation(): PanelId | null {
    const target = navigate_to.value;
    navigate_to.value = null;
    return target;
  }

  return {
    chat_npc,
    npc_profile_name,
    chat_threads,
    chat_sending,
    navigate_to,
    open_npc_chat,
    close_npc_chat,
    open_npc_profile,
    close_npc_profile,
    send_npc_chat,
    regenerate_npc_chat,
    edit_npc_chat_message,
    sync_chat_thread,
    consume_navigation,
  };
});

export const useGalStore = defineStore('gal_playback', () => {
  const { message_id, message_text, is_streaming } = useMessageScope();
  const parsed = ref<ParsedGal | null>(null);
  const dialogue_index = ref(0);
  const timeline_step = ref(0);
  const current_bgm = ref('');
  const current_background = ref('');
  const current_background_label = ref('');
  const sending = ref(false);
  const user_input = ref('');
  /** 第 0 楼 hub 当前跟踪的最新 GAL 楼层 */
  const hub_gal_message_id = ref<number | null>(null);

  function isHubPanel(): boolean {
    return useGamePhaseStore().phase === 'playing' && isOpeningFloor(message_id.value);
  }

  function resolveGameplayMessage(): string {
    if (isHubPanel()) {
      return getLatestGalMessage()?.message ?? message_text.value;
    }
    return message_text.value;
  }

  function resetTimelineStep() {
    if (!parsed.value?.timeline.length) {
      timeline_step.value = 0;
      return;
    }
    timeline_step.value = timelineIndexOfDialogue(parsed.value.timeline, dialogue_index.value);
  }

  function eventEncounterId(event_timeline_index: number): string {
    const gal_id = isHubPanel() ? resolveGameplayMessageId(message_id.value) : message_id.value;
    return `event:${gal_id}:${event_timeline_index}`;
  }

  function isEventResolved(event_timeline_index: number): boolean {
    return useEventStore().is_resolved(eventEncounterId(event_timeline_index));
  }

  const is_at_event_step = computed(() => {
    if (!parsed.value) return false;
    return isEventTimelineStep(parsed.value.timeline, timeline_step.value);
  });

  const current_event = computed(() => {
    if (!parsed.value || !is_at_event_step.value) return null;
    return parsed.value.timeline[timeline_step.value]?.event ?? null;
  });

  const is_event_pending = computed(
    () => is_at_event_step.value && !isEventResolved(timeline_step.value),
  );

  watch(
    () => [is_at_event_step.value, timeline_step.value, parsed.value?.timeline.length] as const,
    () => {
      const events = useEventStore();
      if (!is_at_event_step.value || !current_event.value) {
        events.clear_active();
        return;
      }
      const id = eventEncounterId(timeline_step.value);
      if (events.is_resolved(id)) {
        events.clear_active();
        return;
      }
      events.ensure_check(id, useDataStore().data.主角, current_event.value);
    },
    { immediate: true },
  );

  function battleEncounterId(battle_timeline_index: number): string {
    const gal_id = isHubPanel() ? resolveGameplayMessageId(message_id.value) : message_id.value;
    return `${gal_id}:${battle_timeline_index}`;
  }

  function isBattleResolved(battle_timeline_index: number): boolean {
    return useCombatStore().is_encounter_resolved(battleEncounterId(battle_timeline_index));
  }

  const is_at_battle_step = computed(() => {
    if (!parsed.value) return false;
    return isBattleTimelineStep(parsed.value.timeline, timeline_step.value);
  });

  const pending_battle_index = computed(() => {
    if (!parsed.value) return null;
    return primaryBattleTimelineIndex(parsed.value.timeline);
  });

  function sync_battle_encounter() {
    const combat = useCombatStore();
    combat.refresh_resolved_encounters();
    if (combat.active) return;
    /** 地图「野外遇敌」不由 GAL 时间线驱动，勿被 sync 清掉 */
    if (combat.encounter_offer?.source === 'wild') return;

    if (!parsed.value) {
      combat.clear_encounter_offer();
      return;
    }

    const timeline = parsed.value.timeline;
    const step = timeline_step.value;
    const entry = timeline[step];

    if (entry?.kind === 'battle' && entry.battle) {
      combat.try_offer_encounter(battleEncounterId(step), entry.battle);
      return;
    }

    combat.clear_encounter_offer();
  }

  function advancePastEvent() {
    if (!parsed.value) return;
    const timeline = parsed.value.timeline;
    const battle_idx = primaryBattleTimelineIndex(timeline);

    if (battle_idx !== null && !isBattleResolved(battle_idx)) {
      timeline_step.value = battle_idx;
      sync_battle_encounter();
    } else {
      dialogue_index.value = Math.max(parsed.value.dialogues.length - 1, 0);
      timeline_step.value = Math.max(timeline.length - 1, 0);
    }
    applyMediaState();
  }

  function advancePastBattle() {
    if (!parsed.value) return;
    dialogue_index.value = Math.max(parsed.value.dialogues.length - 1, 0);
    timeline_step.value = Math.max(parsed.value.timeline.length - 1, 0);
    sync_battle_encounter();
    applyMediaState();

    const pending = useEventStore().consume_pending_prompt();
    if (pending) {
      void sendToAi(pending).then(() => advancePastEvent());
    }
  }

  function loadFromGameplayMessage() {
    const gameplay_id = isHubPanel() ? getLatestGalMessage()?.message_id ?? null : message_id.value;
    if (gameplay_id !== null && hub_gal_message_id.value !== gameplay_id) {
      hub_gal_message_id.value = gameplay_id;
      dialogue_index.value = 0;
      timeline_step.value = 0;
    }

    parsed.value = parseGalFromMessage(resolveGameplayMessage());
    if (!parsed.value) {
      dialogue_index.value = 0;
      timeline_step.value = 0;
      current_bgm.value = '';
      current_background.value = '';
      current_background_label.value = '';
      const combat = useCombatStore();
      if (combat.encounter_offer?.source !== 'wild') {
        combat.clear_encounter_offer();
      }
      return;
    }
    dialogue_index.value = _.clamp(dialogue_index.value, 0, Math.max(parsed.value.dialogues.length - 1, 0));
    if (!isBattleTimelineStep(parsed.value.timeline, timeline_step.value) && !isEventTimelineStep(parsed.value.timeline, timeline_step.value)) {
      resetTimelineStep();
    }
    applyMediaState();
    unlockCgFromBackground();
    sync_battle_encounter();
    useEventStore().refresh();
  }

  function loadFromCurrentMessage() {
    loadFromGameplayMessage();
  }

  function refreshFromGameplayMessage() {
    loadFromGameplayMessage();
    syncDataFromMvu();
  }

  function applyMediaState() {
    if (!parsed.value) return;
    const media = resolveMediaState(parsed.value.timeline, timeline_step.value);
    if (media.bgm && media.bgm !== current_bgm.value) {
      current_bgm.value = media.bgm;
      playAudio('bgm', { url: media.bgm });
    }
    if (media.background) {
      current_background.value = media.background;
      current_background_label.value = media.background_label;
      unlockCgFromBackground();
    }
  }

  function unlockCgFromBackground() {
    if (!current_background.value) return;
    const owner = findCgOwner(current_background.value);
    if (!owner) return;

    const resolved = resolveMediaUrl(current_background.value);
    const data_store = useDataStore();
    const unlocked = data_store.data.已解锁CG[owner.character] ?? [];
    if (!unlocked.some(url => isSameMediaUrl(url, resolved))) {
      data_store.data.已解锁CG = {
        ...data_store.data.已解锁CG,
        [owner.character]: [...unlocked, resolved],
      };
    }
  }

  function unlockAllCgForCharacter(character: string) {
    const data_store = useDataStore();
    const all = CG_GALLERY[character];
    if (!all?.length) return;
    data_store.data.已解锁CG = {
      ...data_store.data.已解锁CG,
      [character]: [...all],
    };
  }

  function nextDialogue() {
    if (!parsed.value?.dialogues.length) return;
    const timeline = parsed.value.timeline;

    if (isEventTimelineStep(timeline, timeline_step.value)) {
      if (isEventResolved(timeline_step.value)) {
        advancePastEvent();
      }
      return;
    }

    if (isBattleTimelineStep(timeline, timeline_step.value)) {
      if (isBattleResolved(timeline_step.value)) {
        advancePastBattle();
      }
      return;
    }

    const current_tl = timelineIndexOfDialogue(timeline, dialogue_index.value);
    const battle_idx = primaryBattleTimelineIndex(timeline);
    const event_idx = primaryEventTimelineIndex(timeline);

    if (event_idx !== null && current_tl < event_idx) {
      const last_before_event = lastDialogueIndexBefore(timeline, event_idx);
      if (dialogue_index.value >= last_before_event) {
        timeline_step.value = event_idx;
        applyMediaState();
        return;
      }
    }

    if (battle_idx !== null && current_tl < battle_idx) {
      const last_before_battle = lastDialogueIndexBefore(timeline, battle_idx);
      if (dialogue_index.value >= last_before_battle) {
        timeline_step.value = battle_idx;
        sync_battle_encounter();
        applyMediaState();
        return;
      }
    }

    dialogue_index.value = Math.min(dialogue_index.value + 1, parsed.value.dialogues.length - 1);
    timeline_step.value = timelineIndexOfDialogue(timeline, dialogue_index.value);

    applyMediaState();
    sync_battle_encounter();
  }

  function prevDialogue() {
    if (!parsed.value?.dialogues.length) return;
    const timeline = parsed.value.timeline;

    if (isEventTimelineStep(timeline, timeline_step.value)) {
      const event_idx = timeline_step.value;
      dialogue_index.value = lastDialogueIndexBefore(timeline, event_idx);
      timeline_step.value = timelineIndexOfDialogue(timeline, dialogue_index.value);
      applyMediaState();
      return;
    }

    if (isBattleTimelineStep(timeline, timeline_step.value)) {
      const battle_idx = timeline_step.value;
      dialogue_index.value = lastDialogueIndexBefore(timeline, battle_idx);
      timeline_step.value = timelineIndexOfDialogue(timeline, dialogue_index.value);
      sync_battle_encounter();
      applyMediaState();
      return;
    }

    dialogue_index.value = Math.max(dialogue_index.value - 1, 0);
    timeline_step.value = timelineIndexOfDialogue(timeline, dialogue_index.value);
    applyMediaState();
    sync_battle_encounter();
  }

  const current_dialogue = computed(() => {
    if (!parsed.value) return null;
    const timeline = parsed.value.timeline;
    if (isBattleTimelineStep(timeline, timeline_step.value)) {
      const battle = timeline[timeline_step.value].battle;
      if (battle) {
        return {
          kind: 'dialogue' as const,
          dialogue_kind: 'narrator' as const,
          speaker: battle.name,
          text: battle.desc || `${battle.name} 拦住了去路！请在右下选择「战斗」或「撤退」。`,
        };
      }
    }
    return parsed.value.dialogues[dialogue_index.value] ?? null;
  });

  const can_next_dialogue = computed(() => {
    if (!parsed.value?.dialogues.length) return false;
    const timeline = parsed.value.timeline;
    if (isEventTimelineStep(timeline, timeline_step.value)) {
      return isEventResolved(timeline_step.value);
    }
    if (isBattleTimelineStep(timeline, timeline_step.value)) {
      const battle_idx = timeline_step.value;
      return isBattleResolved(battle_idx);
    }
    const battle_idx = primaryBattleTimelineIndex(timeline);
    const event_idx = primaryEventTimelineIndex(timeline);
    if (event_idx !== null) {
      const last_before_event = lastDialogueIndexBefore(timeline, event_idx);
      if (dialogue_index.value < last_before_event) return true;
      if (dialogue_index.value === last_before_event && !isEventResolved(event_idx)) return true;
    }
    if (battle_idx !== null) {
      const last_before = lastDialogueIndexBefore(timeline, battle_idx);
      if (dialogue_index.value < last_before) return true;
      if (dialogue_index.value === last_before && !isBattleResolved(battle_idx)) return true;
    }
    return dialogue_index.value < parsed.value.dialogues.length - 1;
  });

  const can_prev_dialogue = computed(() => {
    if (!parsed.value?.dialogues.length) return false;
    if (isEventTimelineStep(parsed.value.timeline, timeline_step.value)) return true;
    if (isBattleTimelineStep(parsed.value.timeline, timeline_step.value)) return true;
    return dialogue_index.value > 0;
  });
  const has_dialogues = computed(() => (parsed.value?.dialogues.length ?? 0) > 0);

  const can_regenerate = computed(() => {
    if (sending.value || useUiStore().chat_npc) return false;
    return Boolean(getLastRegenerableGameExchange());
  });

  async function sendToAi(text: string) {
    const input = text.trim();
    if (!input) throw new Error('发送内容为空');
    if (sending.value) throw new Error('正在等待上一条消息，请稍候');

    sending.value = true;
    const data = useDataStore();

    try {
      await sendGameMessage(input);
      dialogue_index.value = 0;
      timeline_step.value = 0;
      refreshFromGameplayMessage();
      data.syncFromVariables();
    } finally {
      sending.value = false;
    }
  }

  async function summarizeWildJournal() {
    if (sending.value) throw new Error('正在等待上一条消息，请稍候');

    const data = useDataStore();
    const prompt = build_wild_journal_summary_prompt(data.data.主角);
    if (!prompt) throw new Error('暂无待总结的野外经历');

    sending.value = true;
    try {
      await sendGameMessage(prompt);
      clear_wild_journal();
      dialogue_index.value = 0;
      timeline_step.value = 0;
      refreshFromGameplayMessage();
      data.syncFromVariables();
      toastr.success('野外历练已总结，剧情已更新');
    } finally {
      sending.value = false;
    }
  }

  async function regenerateLastReply() {
    if (sending.value) throw new Error('正在等待上一条消息，请稍候');
    if (!getLastRegenerableGameExchange()) throw new Error('暂无可重新生成的 AI 回复');

    sending.value = true;
    const data = useDataStore();

    try {
      await regenerateLastGameMessage();
      dialogue_index.value = 0;
      timeline_step.value = 0;
      refreshFromGameplayMessage();
      data.syncFromVariables();
      toastr.info('已重新生成上一段剧情');
    } finally {
      sending.value = false;
    }
  }

  async function submitInput() {
    const text = user_input.value;
    user_input.value = '';
    await sendToAi(text);
  }

  function setMapAreaBackground(area_label: string) {
    const bg = resolveMapAreaRef(area_label);
    if (!bg) return false;
    current_background.value = bg;
    current_background_label.value = area_label.trim();
    return true;
  }

  async function teleportToRegion(region_name: string, player_level: number) {
    write_current_region(region_name);
    const bg = getDefaultMapAreaBackgroundForRegion(region_name);
    if (bg) {
      current_background.value = bg;
      current_background_label.value = getDefaultMapAreaLabelForRegion(region_name);
    }
    let detail = `玩家等级已到达${player_level}，玩家来到${region_name}区域。`;
    if (region_name === '天空之门') {
      detail +=
        '此处为圣域唯一入口，由圣光教会重兵镇守；第十二章须战胜守门者「教会圣骑士·修伦」后，方可经「界域转译阵」进入圣域。';
    } else if (region_name === '圣域') {
      detail += '玩家经天空之门界域转译阵抵达圣域。';
    }
    await sendToAi(detail);
  }

  async function handleEventResolve() {
    const event = current_event.value;
    if (!event || !is_event_pending.value) throw new Error('当前没有待处理的突发事件');

    const id = eventEncounterId(timeline_step.value);
    const data = useDataStore();
    const check = useEventStore().ensure_check(id, data.data.主角, event);
    const outcome = resolve_event_choice(data.data.主角, event, check);

    useEventStore().mark_resolved(id);
    advancePastEvent();

    const player_val = read_player_stat(data.data.主角, check.stat);
    const detail = `${outcome.summary}\n（判定 ${check.stat}：${player_val} / 要求 ≥${check.threshold}）`;
    await sendToAi(build_event_ai_prompt(event, 'resolve', detail));
    data.syncFromVariables();
    toastr.info(outcome.success ? '判定成功' : '判定失败');
  }

  async function handleEventIgnore() {
    const event = current_event.value;
    if (!event || !is_event_pending.value) throw new Error('当前没有待处理的突发事件');

    const id = eventEncounterId(timeline_step.value);
    const data = useDataStore();
    useEventStore().ensure_check(id, data.data.主角, event);
    const outcome = resolve_event_ignore(data.data.主角, event);

    if (outcome.kind === 'battle' && event.battle) {
      useEventStore().mark_resolved(id);
      const detail = `${outcome.summary}\n请根据战斗结果在 <gal> 中续写。`;
      useEventStore().set_pending_prompt(build_event_ai_prompt(event, 'ignore', detail));
      useCombatStore().try_offer_encounter(`${id}:ambush`, event.battle);
      data.syncFromVariables();
      toastr.warning('遭遇战！请在右下选择战斗或撤退');
      return;
    }

    useEventStore().mark_resolved(id);
    advancePastEvent();
    await sendToAi(build_event_ai_prompt(event, 'ignore', outcome.summary));
    data.syncFromVariables();

    if (outcome.kind === 'reward') toastr.success('意外收获');
    else if (outcome.kind === 'punish') toastr.warning('受到了影响');
  }

  watch(message_text, () => {
    loadFromGameplayMessage();
  });

  watch(message_id, () => {
    hub_gal_message_id.value = null;
    dialogue_index.value = 0;
    timeline_step.value = 0;
    loadFromGameplayMessage();
  });

  eventOn(tavern_events.STREAM_TOKEN_RECEIVED, () => {
    if (isHubPanel()) loadFromGameplayMessage();
  });

  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, () => {
    if (isHubPanel()) loadFromGameplayMessage();
  });

  loadFromGameplayMessage();

  useIntervalFn(() => {
    if (isHubPanel() || !is_streaming.value) loadFromGameplayMessage();
  }, 2000);

  return {
    parsed,
    dialogue_index,
    timeline_step,
    is_at_battle_step,
    is_at_event_step,
    is_event_pending,
    pending_battle_index,
    current_event,
    current_bgm,
    current_background,
    current_background_label,
    current_dialogue,
    has_dialogues,
    can_next_dialogue,
    can_prev_dialogue,
    can_regenerate,
    sending,
    user_input,
    loadFromCurrentMessage,
    refreshFromGameplayMessage,
    advancePastBattle,
    nextDialogue,
    prevDialogue,
    submitInput,
    regenerateLastReply,
    summarizeWildJournal,
    teleportToRegion,
    setMapAreaBackground,
    handleEventResolve,
    handleEventIgnore,
    unlockAllCgForCharacter,
    sendToAi,
  };
});

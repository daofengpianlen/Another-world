import JSON5 from 'json5';
import { chat$, getSillyTavernChat } from '../../shared/chatHost';
import { getPatchedStoryMap, patchStoryMap } from '../../shared/storyMapData';
import { ensureWuWaSharedRegistered } from '../../shared/register';
import { parseTargetCharacterNames } from '../../shared/heroineDefaults';
import {
  collectHeroineNames,
  extractNamesFromLegacyStat,
  writeHeroinesToStatData,
} from '../../shared/statDataCompat';
import { applyHeroinesViaMvu } from '../../shared/mvuPatch';
import {
  getHeroinesFromStat,
  preserveHeroinesAfterParse,
  syncHeroinesFromFloorZero,
} from '../../shared/statDataMerge';
import {
  DEFAULT_OOC_IDENTITY,
  DEFAULT_ROVER_IDENTITY_PREFIX,
  OPENING_MARKER,
  STORY_STAGE_OPTIONS,
} from './constants';
import type { Gender, OpeningEnvironment, OpeningFormState, StartConfig, StoryStage, StoryVersion } from './types';

export function isOpeningMessage(message: string): boolean {
  return message.includes(OPENING_MARKER);
}

export function hasGalBlock(message: string): boolean {
  const body = message
    .replace(/<UpdateVariable>[\s\S]*$/i, '')
    .replace(/<current_event>[\s\S]*$/i, '')
    .replace(/<progress>[\s\S]*$/i, '')
    .replace(/<konatan_chat>[\s\S]*$/i, '')
    .trim();
  if (/<gal>[\s\S]*?<\/gal>/i.test(body)) return true;
  return /<gal>\s*[\s\S]{16,}/i.test(body);
}

function readAssistantMessageByFloor(message_id: number): string {
  try {
    return getChatMessages(message_id)[0]?.message ?? '';
  } catch {
    /* fallback */
  }
  return getSillyTavernChat()?.[message_id]?.mes ?? '';
}

/** 聊天中是否已有可游玩的 <gal> 剧情（仅以真实 gal 为准） */
export function chatHasWuwaGameStarted(): boolean {
  try {
    const messages = getChatMessages('0-{{lastMessageId}}', { role: 'assistant' });
    if (messages.some(m => hasGalBlock(m.message ?? ''))) return true;
  } catch {
    /* fallback to DOM */
  }

  try {
    let found = false;
    chat$()('#chat')
      .children(".mes[is_user='false'][is_system='false']")
      .each((_, el) => {
        const id = Number($(el).attr('mesid'));
        if (Number.isNaN(id)) return;
        if (hasGalBlock(readAssistantMessageByFloor(id))) found = true;
      });
    if (found) return true;
  } catch {
    /* ignore */
  }

  return false;
}

/** 是否仍应显示开局面板（第 0 楼有开场标记且尚未生成 gal） */
export function shouldShowOpeningPanel(message: string): boolean {
  if (!isOpeningMessage(message)) return false;
  return !chatHasWuwaGameStarted();
}

function getGlobalValue<T>(key: string): T | null {
  const sources: unknown[] = [window, globalThis];
  if (window.parent !== window) sources.push(window.parent);
  for (const src of sources) {
    const value = (src as Record<string, unknown> | null)?.[key];
    if (value !== undefined) return value as T;
  }
  return null;
}

function collectGlobalSources(): unknown[] {
  const sources: unknown[] = [];
  const seen = new Set<unknown>();
  const push = (value: unknown) => {
    if (value && typeof value === 'object' && !seen.has(value)) {
      seen.add(value);
      sources.push(value);
    }
  };

  push(globalThis);
  push(window);
  try {
    push(window.parent);
  } catch {
    /* cross-origin */
  }
  try {
    push(window.top);
  } catch {
    /* cross-origin */
  }

  return sources;
}

function readStoryMapFromGlobals(): StoryVersion[] | null {
  const sharedCandidates: Array<{ STORY_MAP?: StoryVersion[] } | undefined> = [];

  try {
    const direct = (globalThis as { WuWaShared?: { STORY_MAP?: StoryVersion[] } }).WuWaShared;
    if (direct) sharedCandidates.push(direct);
  } catch {
    /* ignore */
  }

  for (const src of collectGlobalSources()) {
    const shared = (src as { WuWaShared?: { STORY_MAP?: StoryVersion[] } } | null)?.WuWaShared;
    if (shared) sharedCandidates.push(shared);
  }

  for (const shared of sharedCandidates) {
    if (shared?.STORY_MAP?.length) return patchStoryMap(shared.STORY_MAP);
  }
  return null;
}

function isStoryMapPayload(value: unknown): value is StoryVersion[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(item => typeof item === 'object' && item !== null && 'version' in item && Array.isArray(item.parts))
  );
}

async function tryLoadStoryMapFromWorldbook(): Promise<StoryVersion[] | null> {
  try {
    const charBooks = getCharWorldbookNames('current');
    if (!charBooks?.primary) return null;

    const entries = await getWorldbook(charBooks.primary);
    const entry = entries.find(
      item =>
        item.name.includes('[STORY_MAP]') ||
        item.strategy.keys.some(key => String(key).includes('[STORY_MAP]')) ||
        item.content.includes('[STORY_MAP]'),
    );
    if (!entry?.content?.trim()) return null;

    const markerMatch = entry.content.match(/\[STORY_MAP\]\s*([\s\S]+)/);
    const raw = (markerMatch?.[1] ?? entry.content).trim();
    const parsed = JSON5.parse(raw) as unknown;
    if (!isStoryMapPayload(parsed)) return null;

    console.info('[鸣潮开场] 已从世界书 [STORY_MAP] 读取剧情版本');
    return patchStoryMap(parsed);
  } catch (error) {
    console.warn('[鸣潮开场] 世界书 STORY_MAP 解析失败:', error);
    return null;
  }
}

/** 同步读取（可能尚未完成 WuWaShared 初始化） */
export function getStoryMap(): StoryVersion[] | null {
  return readStoryMapFromGlobals();
}

/** 等待 WuWaShared 共享脚本后再读取 STORY_MAP */
export async function resolveStoryMap(): Promise<StoryVersion[] | null> {
  ensureWuWaSharedRegistered();

  let map = readStoryMapFromGlobals();
  if (map) return map;

  try {
    await Promise.race([
      waitGlobalInitialized<{ STORY_MAP?: StoryVersion[] }>('WuWaShared'),
      new Promise<void>(resolve => setTimeout(resolve, 1500)),
    ]);
  } catch {
    /* 外部共享脚本未注册 */
  }

  map = readStoryMapFromGlobals();
  if (map) return map;

  for (let i = 0; i < 3; i += 1) {
    await new Promise<void>(resolve => setTimeout(resolve, 300));
    map = readStoryMapFromGlobals();
    if (map) return map;
  }

  map = await tryLoadStoryMapFromWorldbook();
  if (map) return map;

  return getPatchedStoryMap();
}

export function tryApplyStoryLogic(stat_data: Record<string, unknown>): Record<string, unknown> {
  const fn = getGlobalValue<(data: Record<string, unknown>) => Record<string, unknown>>('calculateStoryLogic');
  if (typeof fn === 'function') {
    try {
      return fn(stat_data);
    } catch (error) {
      console.warn('[鸣潮开场] Story Logic Sync Failed:', error);
    }
  }
  return stat_data;
}

function findEntryUid(entries: WorldbookEntry[], marker: string): WorldbookEntry | undefined {
  return entries.find(
    entry =>
      entry.name.includes(marker) ||
      entry.strategy.keys.some(key => String(key).includes(marker)) ||
      entry.content.includes(marker),
  );
}

export function buildStoryVersionOptions(storyMap: StoryVersion[] | null): Array<{ value: string; label: string }> {
  if (!storyMap?.length) return [];
  const options: Array<{ value: string; label: string }> = [];
  storyMap.forEach((verObj, majorIdx) => {
    verObj.parts.forEach((title, partIdx) => {
      options.push({
        value: `${majorIdx},${partIdx}`,
        label: `v${verObj.version} Part ${partIdx + 1}: ${title}`,
      });
    });
  });
  return options;
}

function parseYamlField(yaml: string, key: string): string | undefined {
  const match = yaml.match(new RegExp(`^\\s*${key}:\\s*"?([^"\\r\\n]*)"?`, 'm'));
  return match?.[1];
}

function parseYamlBool(yaml: string, key: string): boolean | undefined {
  const match = yaml.match(new RegExp(`^\\s*${key}:\\s*(true|false)`, 'm'));
  if (!match) return undefined;
  return match[1] === 'true';
}

export function parseOpeningYaml(yaml: string): Partial<OpeningFormState> {
  if (!yaml.trim()) return {};

  const customMatch = yaml.match(/^\s*UI_CustomIdentity:\s*"?((?:[^"\\]|\\.)*)"?/m);
  const customIdentity = customMatch?.[1]?.replace(/\\"/g, '"') ?? undefined;

  return {
    isRover: parseYamlBool(yaml, 'UI_PlayRover'),
    myGender: (parseYamlField(yaml, 'UI_MyGender') as Gender | undefined) ?? undefined,
    npcExists: parseYamlBool(yaml, 'UI_NpcExist'),
    npcGender: (parseYamlField(yaml, 'UI_NpcGender') as Exclude<Gender, '未知'> | undefined) ?? undefined,
    isStoryMode: parseYamlBool(yaml, 'UI_IsStoryMode'),
    storyVer: parseYamlField(yaml, 'UI_StoryVer'),
    storyStage: parseYamlField(yaml, 'UI_StoryStage') as StoryStage | undefined,
    customIdentity,
    aiRefine: parseYamlBool(yaml, 'UI_AiRefine'),
    locationMain: parseYamlField(yaml, '所在区域'),
    locationDetail: parseYamlField(yaml, '详细地点'),
    targetChar: parseYamlField(yaml, '目标角色'),
    plotExtra: parseYamlField(yaml, '补充剧情'),
  };
}

export async function detectOpeningEnvironment(): Promise<OpeningEnvironment> {
  const env: OpeningEnvironment = {
    ready: true,
    errors: [],
    warnings: [],
    storyMap: null,
    targetBookName: null,
    initEntryUid: null,
    openingEntryUid: null,
    openingContent: '',
  };

  try {
    await Promise.race([
      waitGlobalInitialized('Mvu'),
      new Promise<void>(resolve => setTimeout(resolve, 3000)),
    ]);
  } catch (error) {
    console.warn('[鸣潮开场] MVU 等待超时或未加载:', error);
  }

  const external_story_map = readStoryMapFromGlobals();
  env.storyMap = await resolveStoryMap();
  if (!external_story_map) {
    env.warnings.push('当前使用内置 STORY_MAP；若角色卡有专用共享脚本或世界书 [STORY_MAP]，将优先采用');
  }

  try {
    const charBooks = getCharWorldbookNames('current');
    if (!charBooks?.primary) {
      env.ready = false;
      env.errors.push('未绑定主世界书 (修复建议：请检查是否正确导入了角色世界书，并在当前角色卡中绑定)');
      return env;
    }

    env.targetBookName = charBooks.primary;
    const entries = await getWorldbook(charBooks.primary);

    const initEntry = findEntryUid(entries, '[initvar]');
    if (initEntry) {
      env.initEntryUid = initEntry.uid;
    } else {
      env.ready = false;
      env.errors.push('未找到 [initvar] 条目 (修复建议：请检查角色世界书内容是否完整导入)');
    }

    const openingEntry = findEntryUid(entries, '[opening]');
    if (openingEntry) {
      env.openingEntryUid = openingEntry.uid;
      env.openingContent = openingEntry.content || '';
    } else {
      toastr.warning('未找到 [opening] 条目，UI 状态无法保存。建议新建一个名为 [opening] 的空条目。');
    }
  } catch (error) {
    env.ready = false;
    env.errors.push(`世界书读取错误: ${(error as Error).message} (修复建议：请尝试重新刷新酒馆网页)`);
  }

  return env;
}

function safeReplace(yamlString: string, key: string, newValue: string | number | boolean): string {
  const regex = new RegExp(`(^\\s*${key}\\s*:)(.*)$`, 'm');
  if (!regex.test(yamlString)) return yamlString;
  return yamlString.replace(regex, (_match, prefixGroup: string) => `${prefixGroup} ${newValue}`);
}

export function createDefaultFormState(): OpeningFormState {
  return {
    isRover: true,
    myGender: '男',
    npcExists: false,
    npcGender: '女',
    isStoryMode: true,
    storyVer: '0,0',
    storyStage: '发生前',
    customIdentity: '',
    aiRefine: true,
    locationMain: '瑝珑-今州',
    locationDetail: '',
    targetChar: '',
    plotExtra: '',
  };
}

export function applyExampleForm(): OpeningFormState {
  return {
    ...createDefaultFormState(),
    isStoryMode: true,
    storyVer: '0,0',
    storyStage: '发生前',
    locationMain: '瑝珑-今州',
    locationDetail: '云陵谷',
    targetChar: '秧秧，炽霞',
    plotExtra: '我睁开双眼，发现我正枕在一名黑发少女的大腿上，旁边是一名活泼好动的红发少女。',
  };
}

export function mergeFormFromYaml(form: OpeningFormState, yaml: string): OpeningFormState {
  const parsed = parseOpeningYaml(yaml);
  const merged = { ...form, ...parsed };
  if (merged.isRover && merged.myGender === '未知') merged.myGender = '男';
  if (parsed.isRover === undefined) merged.isRover = form.isRover;
  return merged;
}

function resolveStorySelection(
  form: OpeningFormState,
  storyMap: StoryVersion[] | null,
): { config: Pick<StartConfig, 'majorVerIdx' | 'partIdx' | 'isPostScript' | 'anchorVerStr'>; storyLocTitle: string; storyStageStr: StoryStage; uiStoryVer: string } {
  let majorVerIdx = 13;
  let partIdx = 3;
  let isPostScript = true;
  let storyLocTitle = 'v3.0 Part 4 后日谈模式';
  let storyStageStr: StoryStage = '后日谈';
  let uiStoryVer = '';

  if (!form.isStoryMode && storyMap?.length) {
    const latestVer = storyMap[storyMap.length - 1];
    majorVerIdx = storyMap.length - 1;
    partIdx = latestVer.parts.length - 1;
    isPostScript = true;
    const cleanTitle = latestVer.parts[partIdx].replace(/\s*[（\(](上|中|下)[）\)]/g, '');
    storyLocTitle = `v${latestVer.version} 后日谈: ${cleanTitle} (已完结)`;
  }

  if (form.isStoryMode) {
    uiStoryVer = form.storyVer;
    const indices = uiStoryVer.split(',');
    if (indices.length === 2) {
      majorVerIdx = parseInt(indices[0], 10);
      partIdx = parseInt(indices[1], 10);
    }
    storyStageStr = form.storyStage;
    isPostScript = storyStageStr === '后日谈';
    const option = buildStoryVersionOptions(storyMap).find(item => item.value === uiStoryVer);
    storyLocTitle = option?.label ?? storyLocTitle;
  }

  const targetVerObj = storyMap?.[majorVerIdx] ?? null;
  const anchorVerStr = targetVerObj
    ? targetVerObj.version
    : storyMap?.length
      ? storyMap[storyMap.length - 1].version
      : '3.0';

  return {
    config: { majorVerIdx, partIdx, isPostScript, anchorVerStr },
    storyLocTitle,
    storyStageStr,
    uiStoryVer,
  };
}

function buildFinalIdentity(form: OpeningFormState): { identity: string; wantAiRefine: boolean } {
  const customInput = form.customIdentity.trim().replace(/[\r\n]+/g, ' ');
  const wantAiRefine = !form.isRover && form.aiRefine;

  if (form.isRover) {
    return {
      identity: `${DEFAULT_ROVER_IDENTITY_PREFIX}${customInput}`.replace(/"/g, '\\"'),
      wantAiRefine: false,
    };
  }

  let identity = customInput || DEFAULT_OOC_IDENTITY;
  if (wantAiRefine) identity += ' (等待AI根据用户指令重写并完善...)';
  return { identity: identity.replace(/"/g, '\\"'), wantAiRefine };
}

export async function forceUpdateFloorZero(
  config: StartConfig,
  storyLocTitle: string,
  opening?: { locationMain?: string; locationDetail?: string; targetCharacters?: string[] },
): Promise<void> {
  let mvu_shell: Mvu.MvuData = { stat_data: {}, initialized_lorebooks: {} };
  let useMvu = typeof Mvu !== 'undefined';

  try {
    if (useMvu) {
      mvu_shell = Mvu.getMvuData({ type: 'message', message_id: 0 }) ?? mvu_shell;
    } else {
      const vars = getVariables({ type: 'message', message_id: 0 });
      mvu_shell = { stat_data: vars.stat_data || {}, initialized_lorebooks: {} };
      useMvu = false;
    }
  } catch (error) {
    console.warn('[鸣潮开场] 0 楼读取失败', error);
  }

  let targetData: Record<string, unknown> = { ...(mvu_shell.stat_data || {}) };

  if (!targetData._storyState) targetData._storyState = {};
  Object.assign(targetData._storyState as Record<string, unknown>, {
    majorVerIdx: config.majorVerIdx,
    partIdx: config.partIdx,
    isPostScript: config.isPostScript,
    _anchorVer: config.anchorVerStr,
  });

  if (!targetData.指令) targetData.指令 = {};
  Object.assign(targetData.指令 as Record<string, unknown>, {
    推进剧情: null,
    跳转版本: null,
    修改后日谈模式为: null,
  });

  targetData.剧情显示 = storyLocTitle;
  targetData.是否为后日谈 = String(config.isPostScript);

  if (!targetData.主角信息) targetData.主角信息 = {};
  Object.assign(targetData.主角信息 as Record<string, unknown>, {
    是否是漂泊者: config.isRover,
    性别: config.myGender,
    身份与额外设定: config.identity,
  });

  if (!targetData.NPC漂泊者) targetData.NPC漂泊者 = {};
  Object.assign(targetData.NPC漂泊者 as Record<string, unknown>, {
    是否存在: config.npcExists,
    ...(config.npcExists ? { 性别: config.npcGender } : {}),
  });

  const loc_main = opening?.locationMain?.trim() ?? '';
  const loc_detail = opening?.locationDetail?.trim() ?? '';
  if (loc_main || loc_detail) {
    targetData.所在地点 = [loc_main, loc_detail].filter(Boolean).join('-') || targetData.所在地点;
  }
  if (!targetData.当前时间) targetData.当前时间 = '第1年 1月1日 周一 08:00';
  if (!targetData.当前长期目标) {
    targetData.当前长期目标 = '寻找丢失的记忆，跟随指引前往今州城。';
  }

  const user_info = targetData.主角信息 as Record<string, unknown>;
  if (!user_info.当前状态) {
    user_info.当前状态 = '刚苏醒，轻微失忆感';
  }

  targetData = tryApplyStoryLogic(targetData);

  const heroine_names = collectHeroineNames(
    targetData,
    opening?.targetCharacters,
    extractNamesFromLegacyStat(targetData),
  );

  mvu_shell.stat_data = targetData;

  if (useMvu && heroine_names.length) {
    try {
      mvu_shell = await applyHeroinesViaMvu(mvu_shell, heroine_names);
    } catch (error) {
      console.warn('[鸣潮开场] MVU insert 女性角色失败，降级直接写入', error);
      mvu_shell.stat_data = writeHeroinesToStatData(targetData, heroine_names);
    }
  } else if (heroine_names.length) {
    mvu_shell.stat_data = writeHeroinesToStatData(targetData, heroine_names);
  }

  targetData = mvu_shell.stat_data as Record<string, unknown>;

  const written_names = Object.keys(getHeroinesFromStat(targetData));

  try {
    if (useMvu) {
      await Mvu.replaceMvuData(mvu_shell, { type: 'message', message_id: 0 });
    } else {
      await updateVariablesWith(vars => {
        vars.stat_data = targetData;
        return vars;
      }, { type: 'message', message_id: 0 });
    }
    console.info('[鸣潮开场] 0 楼 stat_data 已写入，女性角色:', written_names);
    if (written_names.length) {
      toastr.success(`✅ 已预置角色：${written_names.join('、')}`);
    } else if (opening?.targetCharacters?.length) {
      toastr.warning('⚠️ 开场面板角色名未写入 stat_data，请检查 MVU 是否启用');
    } else {
      toastr.success('✅ 开场数据已就绪！');
    }
  } catch (error) {
    toastr.error(`数据写入失败: ${(error as Error).message}`);
  }
}

function buildOpeningYaml(form: OpeningFormState, uiStoryVer: string, storyStageStr: StoryStage): string {
  const charTarget = form.targetChar.trim().replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"');
  const locDetail = form.locationDetail.trim().replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"');
  const plotExtra = form.plotExtra.trim().replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"');
  const customInput = form.customIdentity.trim().replace(/"/g, '\\"');

  return dedent`
    UI_PlayRover: ${form.isRover}
    UI_MyGender: "${form.myGender}"
    UI_NpcExist: ${form.npcExists}
    UI_NpcGender: "${form.npcGender}"
    UI_IsStoryMode: ${form.isStoryMode}
    UI_StoryVer: "${uiStoryVer}"
    UI_StoryStage: "${storyStageStr}"
    UI_CustomIdentity: "${customInput}"
    UI_AiRefine: ${!form.isRover && form.aiRefine}
    所在区域: "${form.locationMain}"
    详细地点: "${locDetail}"
    目标角色: "${charTarget}"
    补充剧情: "${plotExtra}"
  `.trim();
}

function buildStartPrompt(
  form: OpeningFormState,
  storyLocTitle: string,
  storyStageStr: StoryStage,
  finalIdentity: string,
  wantAiRefine: boolean,
): string {
  const charTarget = form.targetChar.trim().replace(/[\r\n]+/g, ' ');
  const locFinal = form.locationDetail.trim() || '自由发挥';
  const plotFinal = form.plotExtra.trim() || '自由发挥';

  let prompt =
    '<status>\n' +
    '[系统指令：生成开场剧情]\n' +
    `1. 剧情定位：${storyLocTitle} (${storyStageStr})\n` +
    `2. 地点：${form.locationMain}-${locFinal}\n` +
    `3. 主角设定：${form.myGender}性, ${finalIdentity.replace(/\\"/g, '"')}\n` +
    `4. 初始情境：${plotFinal}\n` +
    `5. 互动角色：${charTarget}\n\n`;

  if (wantAiRefine) {
    prompt +=
      '6. 检测到用户提供了自定义设定，请基于用户的描述，重新生成并完善【身份与额外设定】变量，使其包含外貌、能力、性格等细节。\n\n';
  }

  prompt +=
    '请根据上述设定，直接开始描写开场剧情。\n' +
    '请聚焦于环境描写、角色登场以及主角的感官体验。\n' +
    '如果前文没有特别要求，登场角色无论是谁，都应该穿着其默认装扮。\n' +
    '输出格式要求（详见世界书 GAL输出格式、[mvu_update]变量输出格式）：\n' +
    '- 剧情正文必须完整包裹在 <gal>...</gal> 内（<p> 旁白；漂泊者与 女性角色 只用 <z>；未入库次要路人 只用 <other>；禁止混用标签）；\n' +
    '- 快捷行动写在 <options> 内，每行 <font color="#...">…</font>；\n' +
    '- 末尾依次输出 <StatusPlaceHolderImpl/> 与 <UpdateVariable><JSONPatch>[...]</JSONPatch></UpdateVariable>；\n' +
    '- 须更新：当前时间、所在地点、主角信息/当前状态、登场角色的 女性角色/{名}（建议 insert 完整结构，见变量输出格式示例）。\n' +
    '</status>';

  return prompt;
}

function normalizeGenerateResult(result: string | GenerateToolCallResult): string {
  return typeof result === 'string' ? result : (result.content ?? '');
}

/** 写入用户引导词并自动请求 AI 生成开场剧情 */
export async function sendOpeningPrompt(prompt: string): Promise<string> {
  const old_data = Mvu.getMvuData({ type: 'message', message_id: 0 }) ?? {};

  await createChatMessages([{ role: 'user', message: prompt }]);

  const raw = await generate({
    user_input: prompt,
    max_chat_history: 40,
    should_silence: true,
  });
  const message = normalizeGenerateResult(raw);
  if (!message.trim()) throw new Error('AI 未返回有效回复');

  let data: Mvu.MvuData;
  try {
    data = preserveHeroinesAfterParse(await Mvu.parseMessage(message, old_data), old_data);
  } catch (error) {
    console.error('[鸣潮开场] MVU 解析失败，仍保存 AI 回复', error);
    data = preserveHeroinesAfterParse(old_data, old_data);
  }

  const heroine_names = collectHeroineNames(old_data.stat_data, data.stat_data);
  try {
    data = await applyHeroinesViaMvu(data, heroine_names);
  } catch (error) {
    console.warn('[鸣潮开场] 首楼 MVU insert 女性角色失败', error);
    data.stat_data = writeHeroinesToStatData(
      tryApplyStoryLogic({ ...(data.stat_data ?? {}) }),
      heroine_names,
    );
  }

  await createChatMessages([{ role: 'assistant', message, data }]);
  await syncHeroinesFromFloorZero('latest');
  return message;
}

export async function submitOpeningForm(form: OpeningFormState, env: OpeningEnvironment): Promise<string> {
  const charTarget = form.targetChar.trim().replace(/[\r\n]+/g, ' ');
  if (!charTarget) {
    toastr.error('❌ 初始化失败：必须填写“开局见到的角色”！<br>若不清楚，请查阅对应剧情版本的世界书。', {
      escapeHtml: false,
      timeOut: 5000,
    });
    throw new Error('missing target character');
  }

  const { identity, wantAiRefine } = buildFinalIdentity(form);
  const { config: storyConfig, storyLocTitle, storyStageStr, uiStoryVer } = resolveStorySelection(form, env.storyMap);

  const config: StartConfig = {
    ...storyConfig,
    isRover: form.isRover,
    myGender: form.myGender,
    identity,
    npcExists: form.npcExists,
    npcGender: form.npcGender,
  };

  await forceUpdateFloorZero(config, storyLocTitle, {
    locationMain: form.locationMain,
    locationDetail: form.locationDetail,
    targetCharacters: parseTargetCharacterNames(charTarget),
  });

  if (!env.targetBookName || env.initEntryUid === null) {
    throw new Error('worldbook not ready');
  }

  try {
    await updateWorldbookWith(
      env.targetBookName,
      entries =>
        entries.map(entry => {
          if (entry.uid === env.initEntryUid) {
            let content = entry.content || '';
            content = safeReplace(content, 'majorVerIdx', config.majorVerIdx);
            content = safeReplace(content, 'partIdx', config.partIdx);
            content = safeReplace(content, 'isPostScript', config.isPostScript);
            content = safeReplace(content, '_anchorVer', `"${config.anchorVerStr}"`);

            const blocks = content.split('NPC漂泊者:');
            if (blocks.length > 0) {
              blocks[0] = safeReplace(blocks[0], '是否是漂泊者', config.isRover);
              blocks[0] = safeReplace(blocks[0], '性别', `"${config.myGender}"`);
              blocks[0] = safeReplace(blocks[0], '身份与额外设定', `"${config.identity}"`);
            }
            if (blocks.length > 1) {
              blocks[1] = safeReplace(blocks[1], '是否存在', config.npcExists);
              blocks[1] = safeReplace(blocks[1], '性别', `"${config.npcGender}"`);
            }
            return { ...entry, content: blocks.join('NPC漂泊者:') };
          }

          if (env.openingEntryUid !== null && entry.uid === env.openingEntryUid) {
            return { ...entry, content: buildOpeningYaml(form, uiStoryVer, storyStageStr) };
          }
          return entry;
        }),
      { render: 'immediate' },
    );
  } catch (error) {
    toastr.error(`世界书写入异常: ${(error as Error).message}`);
    throw error;
  }

  const prompt = buildStartPrompt(form, storyLocTitle, storyStageStr, identity, wantAiRefine);
  return sendOpeningPrompt(prompt);
}

export function isValidStoryStage(value: string): value is StoryStage {
  return (STORY_STAGE_OPTIONS as readonly string[]).includes(value);
}

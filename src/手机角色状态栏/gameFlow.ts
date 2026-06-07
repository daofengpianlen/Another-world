import type { Ability } from './ability';
import { merge_hero_avatar_into_mvu_data, merge_hero_avatar_into_stat_data } from './heroAvatar';
import { parseGalFromMessage } from './galParser';
import { hasGalBlock } from './messageScope';
import { Schema, parseStatData } from './schema';

export const OPENING_TITLE = '艾瑟兰大世界';
export const OPENING_FLOOR_ID = 0;
export const OPENING_MESSAGE_MARKER = '<GalGameOpening/>';
/** 角色卡 first_mes 亦可仅写「开局」两字（与旧版酒馆正则一致） */
export const OPENING_TEXT_MARKER = '开局';

export type ProtagonistGender = '男' | '女' | '其他';
export type OpeningDifficulty = '简单' | '普通' | '困难';

export const OPENING_DIFFICULTY_STATS: Record<OpeningDifficulty, Ability> = {
  简单: { 生命: 200, 力量: 20, 体魄: 20, 智慧: 10 },
  普通: { 生命: 100, 力量: 10, 体魄: 10, 智慧: 5 },
  困难: { 生命: 50, 力量: 5, 体魄: 5, 智慧: 1 },
};

export interface ProtagonistCreation {
  姓名: string;
  性别: ProtagonistGender;
  性格: string;
  外貌: string;
  开局难度: OpeningDifficulty;
  头像?: string;
}

function trimForm(form: ProtagonistCreation): ProtagonistCreation {
  return {
    姓名: form.姓名.trim(),
    性别: form.性别,
    性格: form.性格.trim(),
    外貌: form.外貌.trim(),
    开局难度: form.开局难度,
  };
}

function abilityForDifficulty(difficulty: OpeningDifficulty): Ability {
  return { ...OPENING_DIFFICULTY_STATS[difficulty] };
}

export function normalizeGenerateResult(result: string | GenerateToolCallResult): string {
  return typeof result === 'string' ? result : (result.content ?? '');
}

export function chatHasGalBlock(): boolean {
  const messages = getChatMessages('0-{{lastMessageId}}');
  return messages.some(m => hasGalBlock(m.message));
}

export function hasOpeningMarker(message: string): boolean {
  const stripped = message
    .replace(/<UpdateVariable>[\s\S]*$/i, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  if (/^开局$/u.test(stripped)) return true;
  if (/^<GalGameOpening\s*\/?>$/i.test(message.trim())) return true;
  return /<GalGameOpening\s*\/?>/i.test(message);
}

export function chatHasOpeningMarker(): boolean {
  const messages = getChatMessages('0-{{lastMessageId}}', { role: 'assistant' });
  return messages.some(m => hasOpeningMarker(m.message ?? ''));
}

export function getLatestGalMessage(): { message_id: number; message: string } | null {
  const messages = getChatMessages('0-{{lastMessageId}}', { role: 'assistant' });
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i].message ?? '';
    if (hasGalBlock(message)) {
      return { message_id: messages[i].message_id, message };
    }
  }
  return null;
}

/** 取可重新生成的最后一轮：上一楼 assistant(GAL) + 对应 user 输入 */
export function getLastRegenerableGameExchange(): {
  assistant_id: number;
  user_input: string;
  mvu_baseline_id: number;
} | null {
  const messages = getChatMessages('0-{{lastMessageId}}');
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const assistant = messages[i];
    if (assistant.role !== 'assistant') continue;
    if (!hasGalBlock(assistant.message ?? '')) continue;

    let user_input = '';
    for (let j = i - 1; j >= 0; j -= 1) {
      if (messages[j].role === 'user') {
        user_input = messages[j].message?.trim() ?? '';
        break;
      }
    }
    if (!user_input) return null;

    let mvu_baseline_id = OPENING_FLOOR_ID;
    for (let j = i - 1; j >= 0; j -= 1) {
      const msg = messages[j];
      if (msg.role !== 'assistant') continue;
      try {
        const data = Mvu.getMvuData({ type: 'message', message_id: msg.message_id });
        if (data && _.get(data, 'stat_data')) {
          mvu_baseline_id = msg.message_id;
          break;
        }
      } catch {
        /* 继续向前查找 */
      }
    }

    return { assistant_id: assistant.message_id, user_input, mvu_baseline_id };
  }
  return null;
}

/** 删除最新 GAL 回复并基于同一用户输入重新生成 */
export async function regenerateLastGameMessage(): Promise<string> {
  const exchange = getLastRegenerableGameExchange();
  if (!exchange) throw new Error('暂无可重新生成的 AI 回复');

  const old_data =
    Mvu.getMvuData({ type: 'message', message_id: exchange.mvu_baseline_id }) ??
    resolveGameplayMvuBaseline();

  await deleteChatMessages([exchange.assistant_id], { refresh: 'affected' });

  const raw = await generate({
    user_input: exchange.user_input,
    max_chat_history: 40,
    should_silence: true,
  });
  const message = normalizeGenerateResult(raw);
  if (!message.trim()) throw new Error('AI 未返回有效回复');

  let data: Mvu.MvuData;
  try {
    data = merge_hero_avatar_into_mvu_data(await Mvu.parseMessage(message, old_data));
  } catch (error) {
    console.error('[gameFlow] 重新生成 MVU 解析失败，仍保存 AI 回复', error);
    data = merge_hero_avatar_into_mvu_data(old_data);
  }
  await createChatMessages([{ role: 'assistant', message, data }]);
  return message;
}

export function resolveGameplayMessageId(fallback: number): number {
  const latest = getLatestGalMessage();
  return latest?.message_id ?? fallback;
}

/** 全局脚本 iframe 无 getCurrentMessageId，MVU 应对齐最新 GAL 楼层 */
export function resolveGameplayMvuMessageId(): number {
  return resolveGameplayMessageId(OPENING_FLOOR_ID);
}

/** 取主剧情 MVU 基线（须与 data store 写入楼层一致，勿用裸 latest） */
export function resolveGameplayMvuBaseline(): Mvu.MvuData {
  const baseline_id = resolveGameplayMvuMessageId();
  try {
    return Mvu.getMvuData({ type: 'message', message_id: baseline_id }) ?? {};
  } catch (error) {
    console.warn('[gameFlow] 读取 gameplay MVU 失败，回退 latest', error);
    try {
      return Mvu.getMvuData({ type: 'message', message_id: 'latest' }) ?? {};
    } catch {
      return {};
    }
  }
}

export async function persistHeroStatBeforeSend(hero: ReturnType<typeof Schema.parse>['主角']): Promise<number> {
  const baseline_id = resolveGameplayMvuMessageId();
  const old_data = Mvu.getMvuData({ type: 'message', message_id: baseline_id }) ?? {};
  const stat_data = parseStatData({
    ..._.get(old_data, 'stat_data', {}),
    主角: klona(hero),
  });
  merge_hero_avatar_into_stat_data(stat_data);
  await Mvu.replaceMvuData({ ...old_data, stat_data }, { type: 'message', message_id: baseline_id });
  return baseline_id;
}

export function buildOpeningPrompt(form: ProtagonistCreation): string {
  const f = trimForm(form);
  const stats = abilityForDifficulty(f.开局难度);
  return `[游戏开始·角色创建]
玩家已创建角色并被女神召唤至艾瑟兰，请生成**第一章**开场剧情。

【主角设定】
- 姓名：${f.姓名}
- 性别：${f.性别}
- 性格：${f.性格}
- 外貌：${f.外貌}
- 开局难度：${f.开局难度}
- 初始能力：生命 ${stats.生命} / 力量 ${stats.力量} / 体魄 ${stats.体魄} / 智慧 ${stats.智慧}
- 身份：被女神召唤的异世界勇者

【第一章要点·召唤与圣女】
- 地点：圣光教会圣地·召唤祭坛 / 圣光教会总坛
- 教主接见穿越勇者，以「收集四圣器、讨伐魔王」为名下达任务
- 首位重要同伴：**圣女伊洛丝**与勇者搭档，即将一同南下赴王城（凛、艾莉亚、莉莉安此时尚未入队）
- 四圣器顺序：勇者之剑 → 生命之心 → 双翼之盾 → 心灵之镜（此章勿提前剧透后续章节）
- 当前区域：圣光教会圣地

【输出要求】
1. 必须使用 <gal>...</gal> 格式。
2. 主要角色对话统一使用 <j>角色名<pic>表情</pic>文本</j>（pic 闭合必须是 </pic>，禁止 </p>），不区分 SFW/NSFW，不使用 <s> 标签；教主等无立绘者用 <other name="教主">。
3. 包含 background、旁白 <p>；剧情结束后由玩家在界面底部输入框自由输入，**不要**输出 <choice> 选项标签。
4. 末尾输出 <UpdateVariable> 更新相关变量（含 /主角/当前区域 等）。`;
}

export async function persistProtagonist(form: ProtagonistCreation): Promise<void> {
  const f = trimForm(form);
  const message_id = OPENING_FLOOR_ID;
  const old_data = Mvu.getMvuData({ type: 'message', message_id }) ?? {};
  const stat_data = merge_hero_avatar_into_stat_data(
    parseStatData({
      ..._.get(old_data, 'stat_data', {}),
      主角: {
        ..._.get(old_data, 'stat_data.主角', {}),
        姓名: f.姓名,
        性别: f.性别,
        性格: f.性格,
        外貌: f.外貌,
        身份: '异世界勇者',
        能力: abilityForDifficulty(f.开局难度),
        ...(f.头像?.trim() ? { 头像: f.头像.trim() } : {}),
      },
    }),
  );
  if (f.头像?.trim()) write_hero_avatar(f.头像.trim());
  await Mvu.replaceMvuData({ ...old_data, stat_data }, { type: 'message', message_id });
}

function mergeProtagonistIntoData(data: Mvu.MvuData, form: ProtagonistCreation): Mvu.MvuData {
  const f = trimForm(form);
  const next = _.cloneDeep(data);
  _.set(next, 'stat_data.主角.姓名', f.姓名);
  _.set(next, 'stat_data.主角.性别', f.性别);
  _.set(next, 'stat_data.主角.性格', f.性格);
  _.set(next, 'stat_data.主角.外貌', f.外貌);
  _.set(next, 'stat_data.主角.身份', '异世界勇者');
  _.set(next, 'stat_data.主角.能力', abilityForDifficulty(f.开局难度));
  if (f.头像?.trim()) _.set(next, 'stat_data.主角.头像', f.头像.trim());
  return next;
}

export function extractNpcDialogues(message: string, npc_name: string): string[] {
  const parsed = parseGalFromMessage(message);
  if (!parsed) return [];

  const matched = parsed.dialogues
    .filter(d => d.speaker === npc_name && d.text?.trim())
    .map(d => d.text!.trim());
  if (matched.length) return matched;

  const fallback = parsed.dialogues.find(d => d.dialogue_kind !== 'narrator' && d.text?.trim());
  return fallback?.text ? [fallback.text.trim()] : [];
}

export function extractPlainReply(message: string): string {
  return message
    .replace(/<UpdateVariable>[\s\S]*$/i, '')
    .replace(/<gal>[\s\S]*?<\/gal>/i, '')
    .replace(/<\/?gal>/gi, '')
    .trim()
    .slice(0, 500);
}

export async function sendGameMessage(
  text: string,
  options?: { skip_user_message?: boolean },
): Promise<string> {
  const input = text.trim();
  if (!input) throw new Error('发送内容为空');

  /** 必须在创建用户楼层之前取基线，且应对齐最新 GAL 楼层而非裸 latest */
  const old_data = resolveGameplayMvuBaseline();

  if (!options?.skip_user_message) {
    await createChatMessages([{ role: 'user', message: input }]);
  }

  const raw = await generate({
    user_input: input,
    max_chat_history: 40,
    should_silence: true,
  });
  const message = normalizeGenerateResult(raw);
  if (!message.trim()) throw new Error('AI 未返回有效回复');

  let data: Mvu.MvuData;
  try {
    data = merge_hero_avatar_into_mvu_data(await Mvu.parseMessage(message, old_data));
  } catch (error) {
    console.error('[gameFlow] MVU 解析失败，仍保存 AI 回复', error);
    data = merge_hero_avatar_into_mvu_data(old_data);
  }
  await createChatMessages([{ role: 'assistant', message, data }]);
  return message;
}

/** 战斗结算：先持久化战后 HP，再请求 AI 推进剧情 */
export async function sendBattleSettlementMessage(
  prompt: string,
  hero: ReturnType<typeof Schema.parse>['主角'],
): Promise<string> {
  const input = prompt.trim();
  if (!input) throw new Error('战斗结算内容为空');

  await persistHeroStatBeforeSend(hero);
  const old_data = resolveGameplayMvuBaseline();

  await createChatMessages([{ role: 'user', message: input }]);

  const raw = await generate({
    user_input: input,
    max_chat_history: 40,
    should_silence: true,
  });
  const message = normalizeGenerateResult(raw);
  if (!message.trim()) throw new Error('AI 未返回有效回复');

  let data: Mvu.MvuData;
  let parse_failed = false;
  try {
    data = merge_hero_avatar_into_mvu_data(await Mvu.parseMessage(message, old_data));
  } catch (error) {
    parse_failed = true;
    console.error('[战斗结算] MVU 解析失败，仍保存 AI 回复', error);
    data = merge_hero_avatar_into_mvu_data(old_data);
  }
  await createChatMessages([{ role: 'assistant', message, data }]);

  if (parse_failed) {
    toastr.warning('剧情已更新，但经验/金币变量可能未写入，请检查 AI 是否输出 <UpdateVariable>');
  }

  return message;
}

/** 战败撤离：本地 GAL 叙事 + MVU 结算，不调用 AI */
export async function injectLocalDefeatNarrative(
  message: string,
  hero: ReturnType<typeof Schema.parse>['主角'],
): Promise<void> {
  const content = message.trim();
  if (!content) throw new Error('战败叙事内容为空');

  await persistHeroStatBeforeSend(hero);
  const old_data = resolveGameplayMvuBaseline();

  let data: Mvu.MvuData;
  try {
    data = merge_hero_avatar_into_mvu_data(await Mvu.parseMessage(content, old_data));
  } catch (error) {
    console.error('[战败撤离] MVU 解析失败，仍保存本地叙事', error);
    data = merge_hero_avatar_into_mvu_data(old_data);
  }
  await createChatMessages([{ role: 'assistant', message: content, data }]);
}

export async function startGame(form: ProtagonistCreation): Promise<string> {
  const trimmed = trimForm(form);
  if (!trimmed.姓名) {
    throw new Error('请输入主角姓名');
  }
  if (!trimmed.性格 || !trimmed.外貌) {
    throw new Error('请完整填写性格与外貌');
  }
  if (!trimmed.性别) {
    throw new Error('请选择性别');
  }
  if (!trimmed.开局难度) {
    throw new Error('请选择开局难度');
  }

  await persistProtagonist(trimmed);
  const prompt = buildOpeningPrompt(trimmed);

  /** 基线取第 0 楼（已写入主角），勿在创建用户楼之后取 latest */
  const old_data = Mvu.getMvuData({ type: 'message', message_id: OPENING_FLOOR_ID });
  await createChatMessages([{ role: 'user', message: prompt }]);

  const raw = await generate({
    user_input: prompt,
    max_chat_history: 40,
    should_silence: true,
  });
  const message = normalizeGenerateResult(raw);
  let data = merge_hero_avatar_into_mvu_data(await Mvu.parseMessage(message, old_data));
  data = mergeProtagonistIntoData(data, trimmed);

  await createChatMessages([{ role: 'assistant', message, data }]);
  console.info('[异世界大冒险] 开场剧情已生成');
  return message;
}

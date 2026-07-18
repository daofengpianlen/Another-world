import { preserveHeroinesAfterParse, syncHeroinesFromFloorZero } from '../../shared/statDataMerge';

import { ensureHeroinesAfterCardLogic } from '../../shared/heroineGuard';

import {

  buildWuwaMvuContinuationPrompt,

  buildWuwaMvuUserPrompt,

  isWuwaReplyMissingUpdateVariable,

  mergeTruncatedWuwaReply,

} from '../../shared/mvuGeneratePrompt';

import { applyHeroinesViaMvu } from '../../shared/mvuPatch';

import { collectHeroineNames } from '../../shared/statDataCompat';

import { syncWorldbookBeforeGenerate } from '../../shared/worldbookControl/worldbookPreGenerateSync';

import { HUB_FLOOR_ID } from './constants';

import {

  ensureMvuReady,

  formatWuwaError,

  getMvuApi,

  getTavernHelper,

} from '../../shared/wuwaTavern';

import { getLatestWuwaMessage, hasGalBlock } from './wuwaParser';



export function normalizeGenerateResult(result: string | GenerateToolCallResult): string {

  return typeof result === 'string' ? result : (result.content ?? '');

}



export function getLastRegenerableExchange(): {

  assistant_id: number;

  user_input: string;

  mvu_baseline_id: number;

} | null {

  let TH: typeof TavernHelper;

  try {

    TH = getTavernHelper();

  } catch {

    return null;

  }



  const messages = TH.getChatMessages('0-{{lastMessageId}}');

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



    let mvu_baseline_id = HUB_FLOOR_ID;

    let MvuApi: typeof Mvu | undefined;

    try {

      MvuApi = getMvuApi();

    } catch {

      MvuApi = undefined;

    }

    for (let j = i - 1; j >= 0; j -= 1) {

      const msg = messages[j];

      if (msg.role !== 'assistant') continue;

      if (!MvuApi) break;

      try {

        const data = MvuApi.getMvuData({ type: 'message', message_id: msg.message_id });

        if (data && _.get(data, 'stat_data')) {

          mvu_baseline_id = msg.message_id;

          break;

        }

      } catch {

        /* continue */

      }

    }



    return { assistant_id: assistant.message_id, user_input, mvu_baseline_id };

  }

  return null;

}



export function resolveGameplayMvuMessageId(): number {

  return getLatestWuwaMessage()?.message_id ?? HUB_FLOOR_ID;

}



export function resolveGameplayMvuBaseline(): Mvu.MvuData {

  const baseline_id = resolveGameplayMvuMessageId();

  try {

    const MvuApi = getMvuApi();

    return MvuApi.getMvuData({ type: 'message', message_id: baseline_id }) ?? {};

  } catch (error) {

    console.warn('[鸣潮伪同层] 读取 MVU 失败，回退 latest', error);

    try {

      return getMvuApi().getMvuData({ type: 'message', message_id: 'latest' }) ?? {};

    } catch {

      return {};

    }

  }

}



async function requestWuwaGenerate(

  TH: typeof TavernHelper,

  user_prompt: string,

): Promise<string> {

  const raw = await TH.generate({

    user_input: user_prompt,

    max_chat_history: 40,

    should_silence: true,

  });

  return normalizeGenerateResult(raw);

}



async function ensureCompleteWuwaReply(

  TH: typeof TavernHelper,

  message: string,

  stat_data?: Record<string, unknown>,

): Promise<string> {

  if (!isWuwaReplyMissingUpdateVariable(message)) return message;



  console.warn('[鸣潮伪同层] 回复缺少 UpdateVariable，尝试续写 MVU 块');

  const tail = await requestWuwaGenerate(TH, buildWuwaMvuContinuationPrompt(stat_data));

  if (!tail.trim() || !/<UpdateVariable>/i.test(tail)) {

    console.warn('[鸣潮伪同层] 续写仍未包含 UpdateVariable');

    return message;

  }



  return mergeTruncatedWuwaReply(message, tail);

}



export async function sendWuwaMessage(text: string): Promise<string> {

  const input = text.trim();

  if (!input) throw new Error('发送内容为空');



  const TH = getTavernHelper();

  const MvuApi = await ensureMvuReady();

  const old_data = resolveGameplayMvuBaseline();

  const user_prompt = buildWuwaMvuUserPrompt(input, old_data.stat_data);



  try {

    await TH.createChatMessages([{ role: 'user', message: user_prompt }]);

    await syncWorldbookBeforeGenerate(input);

    let message = await requestWuwaGenerate(TH, user_prompt);

    message = await ensureCompleteWuwaReply(TH, message, old_data.stat_data);

    if (!message.trim()) throw new Error('AI 未返回有效回复');



    let data: Mvu.MvuData;

    try {

      data = preserveHeroinesAfterParse(await MvuApi.parseMessage(message, old_data), old_data);

    } catch (error) {

      console.error('[鸣潮伪同层] MVU 解析失败，仍保存 AI 回复', error);

      data = preserveHeroinesAfterParse(old_data, old_data);

    }



    const heroine_names = collectHeroineNames(old_data.stat_data, data.stat_data);

    try {

      data = await applyHeroinesViaMvu(data, heroine_names);

    } catch (error) {

      console.warn('[鸣潮伪同层] MVU insert 女性角色失败', error);

    }



    ensureHeroinesAfterCardLogic(data, old_data, message);



    await TH.createChatMessages([{ role: 'assistant', message, data }]);

    await syncHeroinesFromFloorZero('latest');

    return message;

  } catch (error) {

    console.error('[鸣潮伪同层] sendWuwaMessage 失败', error);

    throw new Error(formatWuwaError(error));

  }

}



export async function regenerateLastWuwaMessage(): Promise<string> {

  const exchange = getLastRegenerableExchange();

  if (!exchange) throw new Error('暂无可重新生成的 AI 回复');



  const TH = getTavernHelper();

  const MvuApi = await ensureMvuReady();

  const old_data =

    MvuApi.getMvuData({ type: 'message', message_id: exchange.mvu_baseline_id }) ?? resolveGameplayMvuBaseline();



  try {

    await TH.deleteChatMessages([exchange.assistant_id], { refresh: 'affected' });

    const plainInput = exchange.user_input.replace(/<status>[\s\S]*?<\/status>/i, '').trim();
    await syncWorldbookBeforeGenerate(plainInput || exchange.user_input);

    let message = await requestWuwaGenerate(TH, exchange.user_input);

    message = await ensureCompleteWuwaReply(TH, message, old_data.stat_data);

    if (!message.trim()) throw new Error('AI 未返回有效回复');



    let data: Mvu.MvuData;

    try {

      data = preserveHeroinesAfterParse(await MvuApi.parseMessage(message, old_data), old_data);

    } catch (error) {

      console.error('[鸣潮伪同层] 重新生成 MVU 解析失败', error);

      data = preserveHeroinesAfterParse(old_data, old_data);

    }



    const heroine_names = collectHeroineNames(old_data.stat_data, data.stat_data);

    try {

      data = await applyHeroinesViaMvu(data, heroine_names);

    } catch (error) {

      console.warn('[鸣潮伪同层] MVU insert 女性角色失败', error);

    }



    ensureHeroinesAfterCardLogic(data, old_data, message);



    await TH.createChatMessages([{ role: 'assistant', message, data }]);

    await syncHeroinesFromFloorZero('latest');

    return message;

  } catch (error) {

    console.error('[鸣潮伪同层] regenerateLastWuwaMessage 失败', error);

    throw new Error(formatWuwaError(error));

  }

}



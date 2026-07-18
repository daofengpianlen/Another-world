import dedent from 'dedent';
import { getKnownMaleNpcNames } from './knownMaleNpcs';

function hasGalInMessage(message: string): boolean {
  const body = message.replace(/<UpdateVariable>[\s\S]*$/i, '').trim();
  return /<gal>[\s\S]*?<\/gal>/i.test(body);
}

function summarizeStatSnapshot(stat_data?: Record<string, unknown>): string {
  if (!stat_data || typeof stat_data !== 'object') return '';

  const lines: string[] = [];
  const time = stat_data['当前时间'];
  const place = stat_data['所在地点'];
  if (typeof time === 'string' && time.trim()) lines.push(`当前时间: ${time.trim()}`);
  if (typeof place === 'string' && place.trim()) lines.push(`所在地点: ${place.trim()}`);

  const heroines = stat_data['女性角色'];
  if (heroines && typeof heroines === 'object' && !Array.isArray(heroines)) {
    const names = Object.keys(heroines as Record<string, unknown>);
    if (names.length) lines.push(`已登场女性角色: ${names.join('、')}`);
  }

  if (!lines.length) return '';
  return `\n\n【当前 stat_data 快照（仅供 JSONPatch 参考）】\n${lines.join('\n')}`;
}

const MVU_FORMAT_RULES = dedent`
  输出顺序（不可打乱、不可截断）：
  1. <gal>…</gal>（必填）
  2. <options>…</options>（可选）
  3. <StatusPlaceHolderImpl/>
  4. <UpdateVariable><Analysis>英文≤80词</Analysis><JSONPatch>[合法 JSON 数组]</JSONPatch></UpdateVariable>（必填）

  MVU 硬性要求：
  - 禁止在 <StatusPlaceHolderImpl/> 处结束；其后必须输出完整 UpdateVariable
  - 剧情/对话/时间/地点/好感/穿着/物品/亲密/生理/内心/触发器 任一变化 → 必须 JSONPatch
  - path 以 / 开头对应 stat_data 根键；禁止 /stat_data/ 前缀；禁止自创根键
  - 已登场 replace/delta（好感 delta ±3~8）；首登场 add/insert 完整 HeroineEntry
  - <z> **仅限** stat_data.女性角色 中的女性；<z> 内名 与 /女性角色/{名} 必须一致；可带 <pic> 场景名
  - **{{user}} / 漂泊者 / 玩家本人发言一律 <other name="…" heart="…"> 禁止 <z>**（玩家不是主标签角色）
  - 男性 NPC（${getKnownMaleNpcNames().join('、')} 等）：**禁止** /女性角色/{男性名}；用 <other> 发言；人设靠世界书 👤♂️ 条目
  - 路人、一次性 NPC 同样只用 <other>
  - 男性 NPC 勿写 HeroineEntry（罩杯、处女、生理状态等）；仅 replace 章节/时间/地点/触发器/伏笔
  - 禁止 markdown 代码块包裹 JSON；禁止省略闭合标签
`.trim();

/** 伪同层发送：写入聊天楼层 + 传给 generate 的完整用户消息（可见且必达模型） */
export function buildWuwaMvuUserPrompt(plainInput: string, stat_data?: Record<string, unknown>): string {
  const input = plainInput.trim();
  return dedent`
    <status>
    [系统指令：伪同层游玩回复]
    玩家行动：${input}

    请根据玩家行动续写剧情，并完整输出下列结构（禁止截断）：
    ${MVU_FORMAT_RULES}
    ${summarizeStatSnapshot(stat_data)}
    </status>
  `.trim();
}

/** 检测到 gal 后缺少 UpdateVariable 时的续写指令 */
export function buildWuwaMvuContinuationPrompt(stat_data?: Record<string, unknown>): string {
  return dedent`
    <status>
    [系统指令：续写被截断的 MVU 块]
    上一条 assistant 已输出 <gal>（及可能的 <options>、<StatusPlaceHolderImpl/>），但缺少完整 <UpdateVariable>。

    请不要重复 <gal> 正文。仅补写缺失尾部：
    <StatusPlaceHolderImpl/>
    <UpdateVariable><Analysis>…</Analysis><JSONPatch>[…]</JSONPatch></UpdateVariable>

    ${MVU_FORMAT_RULES}
    ${summarizeStatSnapshot(stat_data)}
    </status>
  `.trim();
}

export function isWuwaReplyMissingUpdateVariable(message: string): boolean {
  return hasGalInMessage(message) && !/<UpdateVariable>/i.test(message);
}

export function mergeTruncatedWuwaReply(head: string, tail: string): string {
  let h = head.trimEnd();
  let t = tail.trim();
  if (!t) return h;

  if (/<StatusPlaceHolderImpl\s*\/?>/i.test(h)) {
    t = t.replace(/^\s*<StatusPlaceHolderImpl\s*\/?>\s*/i, '');
  } else if (/<UpdateVariable>/i.test(t) && !/<StatusPlaceHolderImpl\s*\/?>/i.test(t)) {
    return `${h}\n<StatusPlaceHolderImpl/>\n${t}`.trim();
  }

  return `${h}\n${t}`.trim();
}

import dedent from 'dedent';
import { getLatestGalMessage, normalizeGenerateResult } from './gameFlow';
import { parseGalFromMessage } from './galParser';
import type { Schema } from './schema';
import type { ChatMessage } from './store';

const CHAT_VAR_KEY = 'gal_private_chats';

/** 私聊单独请求：不注入角色卡全文 / 世界书 / 主聊天历史 */
const PRIVATE_CHAT_RAW_OVERRIDES: Overrides = {
  world_info_before: '',
  world_info_after: '',
  char_description: '',
  char_personality: '',
  persona_description: '',
  scenario: '',
  dialogue_examples: '',
  chat_history: { prompts: [], with_depth_entries: false },
};

const PrivateChatEntrySchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'npc', 'system']),
  text: z.string(),
});

const PrivateChatStoreSchema = z.record(z.string(), z.array(PrivateChatEntrySchema)).prefault({});

export type PrivateChatStore = z.output<typeof PrivateChatStoreSchema>;

function truncate_text(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function load_store(): PrivateChatStore {
  const raw = _.get(getVariables({ type: 'chat' }), CHAT_VAR_KEY, {});
  return PrivateChatStoreSchema.parse(raw);
}

function save_store(store: PrivateChatStore): void {
  const chat_vars = klona(getVariables({ type: 'chat' }));
  _.set(chat_vars, CHAT_VAR_KEY, store);
  replaceVariables(chat_vars, { type: 'chat' });
}

export function load_npc_thread(npc_name: string): ChatMessage[] {
  const store = load_store();
  return store[npc_name] ?? [];
}

function persist_thread(npc_name: string, thread: ChatMessage[]): void {
  const store = load_store();
  store[npc_name] = thread;
  save_store(store);
}

function new_message_id(thread: ChatMessage[]): string {
  return `${Date.now()}-${thread.length}-${Math.random().toString(36).slice(2, 7)}`;
}

export function append_thread_message(npc_name: string, role: ChatMessage['role'], text: string): ChatMessage[] {
  const thread = load_npc_thread(npc_name);
  const next: ChatMessage[] = [...thread, { id: new_message_id(thread), role, text }];
  persist_thread(npc_name, next);
  return next;
}

function ensure_opening_system(npc_name: string): ChatMessage[] {
  const thread = load_npc_thread(npc_name);
  if (thread.length) return thread;
  return append_thread_message(npc_name, 'system', `已与 ${npc_name} 开始私聊`);
}

export function open_npc_thread(npc_name: string): ChatMessage[] {
  return ensure_opening_system(npc_name);
}

function find_user_message_index(thread: ChatMessage[], message_id: string): number {
  const index = thread.findIndex(m => m.id === message_id);
  if (index === -1 || thread[index].role !== 'user') return -1;
  return index;
}

/** 保留该用户消息及之前的内容，删除其后所有回复 */
function truncate_thread_from_user_message(npc_name: string, message_id: string): ChatMessage[] | null {
  const thread = load_npc_thread(npc_name);
  const index = find_user_message_index(thread, message_id);
  if (index === -1) return null;

  const truncated = thread.slice(0, index + 1);
  persist_thread(npc_name, truncated);
  return truncated;
}

function summarize_gal_context(): string {
  const latest = getLatestGalMessage();
  if (!latest) return '（暂无主线剧情）';

  const parsed = parseGalFromMessage(latest.message);
  if (!parsed?.dialogues.length) {
    return truncate_text(latest.message.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), 320);
  }

  const recent = parsed.dialogues.slice(-3);
  return truncate_text(
    recent
      .map(d => {
        if (d.dialogue_kind === 'narrator') return `[旁白] ${d.text ?? ''}`;
        return `[${d.speaker ?? '角色'}] ${d.text ?? ''}`;
      })
      .join('\n'),
    480,
  );
}

function build_system_prompt(
  npc_name: string,
  npc: Schema['邂逅名录'][string],
  player_name: string,
  protagonist: Schema['主角'],
): string {
  return dedent`
    你正在扮演「${npc_name}」，与玩家「${player_name}」私聊。
    只输出 ${npc_name} 的口语化回复，不要 gal、UpdateVariable、选项或标签。

    【玩家】${player_name}，${protagonist.身份 || '冒险者'}，${truncate_text(protagonist.性格 || '—', 80)}

    【${npc_name}】
    身份：${truncate_text(npc.身份 || '未知', 60)}
    位置：${truncate_text(npc.位置 || '未知', 40)}
    外貌：${truncate_text(npc.外貌穿着 || '—', 120)}
    内心：${truncate_text(npc.内心想法 || '—', 120)}
    好感度：${npc.好感度}

    【主线摘要】
    ${summarize_gal_context()}
  `;
}

function format_thread_for_prompt(thread: ChatMessage[], player_name: string, npc_name: string): string {
  const dialogues = thread.filter(m => m.role === 'user' || m.role === 'npc').slice(-10);
  if (!dialogues.length) return '（尚无记录）';

  return dialogues
    .map(m => {
      const speaker = m.role === 'user' ? player_name : npc_name;
      return `${speaker}：${truncate_text(m.text, 200)}`;
    })
    .join('\n');
}

function parse_npc_replies(raw: string, npc_name: string): string[] {
  let text = normalizeGenerateResult(raw as string | GenerateToolCallResult)
    .replace(/<UpdateVariable>[\s\S]*$/i, '')
    .replace(/<gal>[\s\S]*?<\/gal>/gi, '')
    .replace(/^[\s\S]*?<\/gal>/i, '')
    .trim();

  text = text.replace(new RegExp(`^${_.escapeRegExp(npc_name)}\\s*[：:]`, 'gm'), '').trim();

  const lines = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line && !/^[<[]/.test(line));

  if (lines.length) return lines.slice(0, 4).map(line => truncate_text(line, 400));
  return [truncate_text(text, 400) || '…'];
}

type PrivateChatContext = {
  npc_name: string;
  player_name: string;
  npc: Schema['邂逅名录'][string];
  protagonist: Schema['主角'];
  on_thread_update?: (thread: ChatMessage[]) => void;
};

async function request_npc_reply(thread: ChatMessage[], ctx: PrivateChatContext): Promise<ChatMessage[]> {
  const last_user = [...thread].reverse().find(m => m.role === 'user');
  if (!last_user) return thread;

  const { npc_name, player_name, npc, protagonist, on_thread_update } = ctx;
  const system = build_system_prompt(npc_name, npc, player_name, protagonist);
  const user_prompt = dedent`
    【私聊记录】
    ${format_thread_for_prompt(thread, player_name, npc_name)}

    【玩家刚发送】
    ${truncate_text(last_user.text, 500)}

    请以 ${npc_name} 的身份简短回复（1~3 句）。
  `;

  console.info('[私聊] generateRaw 请求', {
    system_chars: system.length,
    user_chars: user_prompt.length,
  });

  const raw = await generateRaw({
    ordered_prompts: [
      { role: 'system', content: system },
      { role: 'user', content: user_prompt },
    ],
    max_chat_history: 0,
    should_silence: true,
    overrides: PRIVATE_CHAT_RAW_OVERRIDES,
    // 勿传仅含 max_tokens 的 custom_api，否则会覆盖当前 API 连接且 model 为空导致 400
  });

  const replies = parse_npc_replies(raw, npc_name);
  let current = thread;
  for (const line of replies) {
    current = [...current, { id: new_message_id(current), role: 'npc', text: line }];
    persist_thread(npc_name, current);
    on_thread_update?.(current);
  }

  return current;
}

/**
 * 独立私聊：极简 generateRaw，避免角色卡/世界书/主聊天历史撑爆上下文
 */
export async function send_private_chat(
  npc_name: string,
  user_text: string,
  player_name: string,
  npc: Schema['邂逅名录'][string],
  protagonist: Schema['主角'],
  on_thread_update?: (thread: ChatMessage[]) => void,
): Promise<ChatMessage[]> {
  const input = user_text.trim();
  if (!input) return load_npc_thread(npc_name);

  ensure_opening_system(npc_name);
  const thread = append_thread_message(npc_name, 'user', input);
  on_thread_update?.(thread);

  return request_npc_reply(thread, { npc_name, player_name, npc, protagonist, on_thread_update });
}

/** 从指定用户消息起重新生成 NPC 回复（删除该消息之后的所有内容） */
export async function regenerate_private_chat_from(
  npc_name: string,
  message_id: string,
  player_name: string,
  npc: Schema['邂逅名录'][string],
  protagonist: Schema['主角'],
  on_thread_update?: (thread: ChatMessage[]) => void,
): Promise<ChatMessage[]> {
  const truncated = truncate_thread_from_user_message(npc_name, message_id);
  if (!truncated) return load_npc_thread(npc_name);

  on_thread_update?.(truncated);
  return request_npc_reply(truncated, { npc_name, player_name, npc, protagonist, on_thread_update });
}

/** 编辑用户消息并重新生成 NPC 回复 */
export async function edit_private_chat_message(
  npc_name: string,
  message_id: string,
  new_text: string,
  player_name: string,
  npc: Schema['邂逅名录'][string],
  protagonist: Schema['主角'],
  on_thread_update?: (thread: ChatMessage[]) => void,
): Promise<ChatMessage[]> {
  const input = new_text.trim();
  if (!input) return load_npc_thread(npc_name);

  const thread = load_npc_thread(npc_name);
  const index = find_user_message_index(thread, message_id);
  if (index === -1) return thread;

  const updated: ChatMessage[] = [...thread.slice(0, index), { ...thread[index], text: input }];
  persist_thread(npc_name, updated);
  on_thread_update?.(updated);

  return request_npc_reply(updated, { npc_name, player_name, npc, protagonist, on_thread_update });
}

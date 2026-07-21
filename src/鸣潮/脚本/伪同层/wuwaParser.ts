import { getTavernHelper } from '../../shared/wuwaTavern';
import { chat$, getSillyTavernChat } from '../../shared/chatHost';

export type WuwaHtmlSegment = { type: 'html'; content: string };
export type WuwaNarrationSegment = { type: 'p'; content: string };
export type WuwaOtherSegment = { type: 'other'; name: string; heart: string; speech: string };
export type WuwaMainSegment = { type: 'main'; name: string; pic?: string; speech: string; heart: string };
export type WuwaGalSegment = { type: 'gal'; segments: WuwaInnerSegment[] };
/** 用户通过伪同层输入栏发送的消息气泡 */
export type WuwaUserSegment = { type: 'user'; content: string };

export type WuwaInnerSegment = WuwaHtmlSegment | WuwaNarrationSegment | WuwaOtherSegment | WuwaMainSegment | WuwaUserSegment;

export type WuwaOption = { html: string; text: string };

export type ParsedWuwaMessage = {
  gal: WuwaGalSegment | null;
  options: WuwaOption[];
  has_status_placeholder: boolean;
  raw_without_update: string;
};

const TAG_RE =
  /<p>([\s\S]*?)<\/p>|<(?:z|j)>([\s\S]*?)<\/(?:z|j)>|<other name="([^"]*)" heart="([^"]*)">([\s\S]*?)<\/other>/gi;

/** 解析 <z>：与参考 regex「大头像版-角色聊天框」捕获组一致 */
export function parseMainCharacterBody(body: string): Pick<WuwaMainSegment, 'name' | 'pic' | 'speech' | 'heart'> {
  const with_pic = body.match(
    /^\s*([^<]+?)\s*<pic>\s*([^<]+?)\s*<\/pic>\s*([\s\S]*?)(?:<心>\s*([\s\S]*?)(?:<\/心>\s*)?)?$/i,
  );
  if (with_pic) {
    const raw_speech = with_pic[3] ?? '';
    const speech = raw_speech.replace(/<心>[\s\S]*$/i, '').trim();
    return {
      name: with_pic[1].trim(),
      pic: with_pic[2].trim(),
      speech: speech || raw_speech.trim(),
      heart: (with_pic[4] ?? '').trim(),
    };
  }

  const name_heart = body.match(/^\s*([^<]+?)\s*<心>\s*([\s\S]*?)(?:<\/心>\s*)?$/i);
  if (name_heart) {
    return {
      name: name_heart[1].trim(),
      speech: '',
      heart: name_heart[2].trim(),
    };
  }

  const name_speech_heart = body.match(/^\s*([^<]+?)\s+([\s\S]*?)<心>\s*([\s\S]*?)(?:<\/心>\s*)?$/i);
  if (name_speech_heart) {
    return {
      name: name_speech_heart[1].trim(),
      speech: name_speech_heart[2].trim(),
      heart: name_speech_heart[3].trim(),
    };
  }

  return { name: '角色', speech: body.trim(), heart: '' };
}

export function stripUpdateVariable(message: string): string {
  return message
    .replace(/<UpdateVariable>[\s\S]*$/i, '')
    .replace(/<current_event>[\s\S]*$/i, '')
    .replace(/<progress>[\s\S]*$/i, '')
    .replace(/<konatan_chat>[\s\S]*$/i, '')
    .trim();
}

export function hasGalBlock(message: string): boolean {
  const body = stripUpdateVariable(message);
  return /<gal>[\s\S]*?<\/gal>/i.test(body);
}

export function hasWuwaGameBlock(message: string): boolean {
  const body = stripUpdateVariable(message);
  return hasGalBlock(message) || /<StatusPlaceHolderImpl\s*\/?>/i.test(body);
}

export type WuwaGalFloor = { message_id: number; message: string };

function listAssistantFloors(): WuwaGalFloor[] {
  const rows: WuwaGalFloor[] = [];

  try {
    const messages = getTavernHelper().getChatMessages('0-{{lastMessageId}}', { role: 'assistant' });
    for (const m of messages) {
      rows.push({ message_id: m.message_id, message: m.message ?? '' });
    }
    if (rows.length) return rows;
  } catch {
    /* fallback */
  }

  try {
    const messages = getChatMessages('0-{{lastMessageId}}', { role: 'assistant' });
    for (const m of messages) {
      rows.push({ message_id: m.message_id, message: m.message ?? '' });
    }
    if (rows.length) return rows;
  } catch {
    /* fallback */
  }

  try {
    const chat = getSillyTavernChat();
    if (chat) {
      chat.forEach((row, index) => {
        if (row.is_user || row.is_system) return;
        rows.push({ message_id: index, message: row.mes ?? '' });
      });
      if (rows.length) return rows;
    }
  } catch {
    /* ignore */
  }

  try {
    const chat = SillyTavern?.chat;
    if (Array.isArray(chat)) {
      chat.forEach((row, index) => {
        if (row.is_user || row.is_system) return;
        rows.push({ message_id: index, message: row.mes ?? '' });
      });
    }
  } catch {
    /* ignore */
  }

  return rows;
}

function readMessageByFloorId(message_id: number): string {
  try {
    return getTavernHelper().getChatMessages(message_id)[0]?.message ?? '';
  } catch {
    /* fallback */
  }
  try {
    return getChatMessages(message_id)[0]?.message ?? '';
  } catch {
    /* fallback */
  }
  try {
    return SillyTavern?.chat?.[message_id]?.mes ?? '';
  } catch {
    return '';
  }
}

/** 从 DOM mesid 解析最新含 gal 的 assistant 楼层（优先 getChatMessages，避免 SillyTavern.chat 滞后） */
export function resolveLatestGalFloorFromDom(): number | null {
  let latest: number | null = null;
  try {
    chat$()('#chat')
      .children(".mes[is_user='false'][is_system='false']")
      .each((_, el) => {
        const id = Number($(el).attr('mesid'));
        if (Number.isNaN(id)) return;
        const mes = readMessageByFloorId(id);
        if (hasGalBlock(mes)) latest = id;
      });
  } catch {
    /* ignore */
  }
  return latest;
}

/** 最新含 <gal> 的 assistant 楼层号（DOM mesid 优先，与 mountStreamingMessages 一致） */
export function resolveLatestGalMessageId(): number | null {
  const dom_id = resolveLatestGalFloorFromDom();
  if (dom_id !== null) return dom_id;

  const rows = listAssistantFloors();
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (hasGalBlock(rows[i].message)) return rows[i].message_id;
  }
  return null;
}

export function getLatestWuwaMessage(): WuwaGalFloor | null {
  const rows = listAssistantFloors();
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (hasGalBlock(rows[i].message)) return rows[i];
  }

  const dom_id = resolveLatestGalFloorFromDom();
  if (dom_id !== null) {
    const mes = readMessageByFloorId(dom_id);
    if (hasGalBlock(mes)) return { message_id: dom_id, message: mes };
  }

  return null;
}

/** 是否已进入可游玩阶段（仅以真实 <gal> 为准，占位符不算） */
export function chatHasWuwaGameStarted(): boolean {
  if (listAssistantFloors().some(m => hasGalBlock(m.message))) return true;
  return resolveLatestGalFloorFromDom() !== null;
}

export function parseGalInner(inner: string): WuwaInnerSegment[] {
  const segments: WuwaInnerSegment[] = [];
  let last_index = 0;
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_RE.exec(inner))) {
    if (match.index > last_index) {
      const chunk = inner.slice(last_index, match.index).trim();
      if (chunk) segments.push({ type: 'html', content: chunk });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'p', content: match[1].trim() });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'main', ...parseMainCharacterBody(match[2]) });
    } else {
      segments.push({
        type: 'other',
        name: match[3] ?? '',
        heart: match[4] ?? '',
        speech: (match[5] ?? '').trim(),
      });
    }
    last_index = match.index + match[0].length;
  }

  const tail = inner.slice(last_index).trim();
  if (tail) segments.push({ type: 'html', content: tail });
  if (!segments.length && inner.trim()) segments.push({ type: 'html', content: inner.trim() });
  return segments;
}

export function parseOptions(text: string): WuwaOption[] {
  if (!text.trim()) return [];
  return text
    .trim()
    .split(/\r?\n/)
    .filter(line => line && (line.includes('<font') || line.includes('color=')))
    .map(line => {
      const tmp = document.createElement('div');
      tmp.innerHTML = line;
      const clean = (tmp.textContent ?? '').replace(/[\u{1F600}-\u{1F64F}]/gu, '').trim();
      return { html: line, text: clean };
    })
    .filter(item => item.text);
}

export function parseWuwaMessage(message: string): ParsedWuwaMessage {
  const raw_without_update = stripUpdateVariable(message);
  const has_status_placeholder = /<StatusPlaceHolderImpl\s*\/?>/i.test(raw_without_update);

  let body = raw_without_update.replace(/<StatusPlaceHolderImpl\s*\/?>/gi, '').trim();
  const options_match = body.match(/<options>([\s\S]*?)<\/options>/i);
  const options = parseOptions(options_match?.[1] ?? '');
  body = body.replace(/<options>[\s\S]*?<\/options>/gi, '').trim();

  const gal_match = body.match(/<gal>([\s\S]*?)<\/gal>/i);
  const gal: WuwaGalSegment | null = gal_match
    ? { type: 'gal', segments: parseGalInner(gal_match[1] ?? '') }
    : null;

  return { gal, options, has_status_placeholder, raw_without_update };
}

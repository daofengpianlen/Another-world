import type { Schema } from './schema';

/** 玩家上传的主角头像（聊天级持久化，避免 AI 新楼层 MVU 覆盖丢失） */
export const HERO_AVATAR_KEY = 'gal_hero_avatar';

export function read_hero_avatar(): string {
  const raw = _.get(getVariables({ type: 'chat' }), HERO_AVATAR_KEY, '');
  return typeof raw === 'string' ? raw.trim() : '';
}

export function write_hero_avatar(avatar: string): void {
  const trimmed = avatar.trim();
  const chat = klona(getVariables({ type: 'chat' }));
  if (trimmed) {
    chat[HERO_AVATAR_KEY] = trimmed;
  } else {
    delete chat[HERO_AVATAR_KEY];
  }
  replaceVariables(chat, { type: 'chat' });
}

/** 将聊天变量中的头像合并进 stat_data（MVU 无头像时回填） */
export function merge_hero_avatar_into_stat_data(stat_data: Schema): Schema {
  const saved = read_hero_avatar();
  if (!saved) {
    if (stat_data.主角.头像?.trim()) {
      write_hero_avatar(stat_data.主角.头像);
    }
    return stat_data;
  }
  if (!stat_data.主角.头像?.trim()) {
    stat_data.主角.头像 = saved;
  }
  return stat_data;
}

export function merge_hero_avatar_into_mvu_data(data: Mvu.MvuData): Mvu.MvuData {
  const saved = read_hero_avatar();
  if (!saved) return data;
  const current = _.get(data, 'stat_data.主角.头像', '');
  if (typeof current === 'string' && current.trim()) return data;
  const next = klona(data);
  _.set(next, 'stat_data.主角.头像', saved);
  return next;
}

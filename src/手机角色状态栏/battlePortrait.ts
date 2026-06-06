import { normalizeNpcName, resolveNpcAvatar } from './config';
import { read_hero_avatar } from './heroAvatar';
import { resolveMediaUrl } from './media';
import type { Schema } from './schema';

/** 战斗演场：主角头像（MVU 主角.头像） */
export function resolveHeroBattlePortrait(hero: Schema['主角']): string {
  const raw = hero.头像?.trim() || read_hero_avatar();
  if (!raw) return '';
  return resolveMediaUrl(raw);
}

/** 战斗演场：敌人/NPC 头像（含别称映射） */
export function resolveEnemyBattlePortrait(enemy_name: string): string {
  return resolveNpcAvatar(normalizeNpcName(enemy_name));
}

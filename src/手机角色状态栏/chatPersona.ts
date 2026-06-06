/** 解析酒馆用户角色头像路径 */
function resolveUserAvatarUrl(avatar: string): string {
  if (!avatar) return '';
  if (/^(https?:|data:|blob:|\/)/i.test(avatar)) return avatar;
  return `/User Images/${avatar}`;
}

/** 从酒馆页面 DOM 读取当前用户头像 */
function readUserAvatarFromDom(): string {
  const selectors = ['#user_avatar', '.user_avatar img', '.persona_avatar img', '#persona_avatar'];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (!el.length) continue;
    const src = el.is('img') ? el.attr('src') : el.find('img').attr('src') ?? el.attr('src');
    if (src?.trim()) return src.trim();
  }
  return '';
}

/** 获取酒馆「用户设定 / Persona」显示名与头像 */
export function getUserPersonaDisplay(): { name: string; avatar: string } {
  const name = SillyTavern.name1?.trim() || '我';

  const power = SillyTavern.powerUserSettings as Record<string, unknown> | undefined;
  const from_settings =
    (typeof power?.user_avatar === 'string' && power.user_avatar) ||
    (typeof power?.avatar === 'string' && power.avatar) ||
    '';

  let avatar = from_settings ? resolveUserAvatarUrl(from_settings) : '';
  if (!avatar) avatar = readUserAvatarFromDom();

  return { name, avatar };
}

export function getAvatarInitial(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0);
}

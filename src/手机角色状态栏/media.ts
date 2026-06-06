export const MEDIA_BASE_URL = 'https://files.catbox.moe/';

/** 场景 / 背景标准尺寸 1280×720 */
export const SCENE_WIDTH = 1280;
export const SCENE_HEIGHT = 720;
export const SCENE_ASPECT = `${SCENE_WIDTH} / ${SCENE_HEIGHT}`;

/** NPC 头像 / 对话立绘标准尺寸 295×358（半身矩形） */
export const PORTRAIT_WIDTH = 295;
export const PORTRAIT_HEIGHT = 358;
export const PORTRAIT_ASPECT = `${PORTRAIT_WIDTH} / ${PORTRAIT_HEIGHT}`;

/** 剧情对话区立绘框（与气泡同高） */
export const DIALOGUE_PORTRAIT_WIDTH = 96;
export const DIALOGUE_PORTRAIT_HEIGHT = Math.round((DIALOGUE_PORTRAIT_WIDTH * PORTRAIT_HEIGHT) / PORTRAIT_WIDTH);
export const DIALOGUE_BODY_PADDING_Y = 24;
export const DIALOGUE_BODY_HEIGHT = DIALOGUE_PORTRAIT_HEIGHT + DIALOGUE_BODY_PADDING_Y;

/** 圆形头像裁切（295×358 图在圆内：不额外放大，偏上取脸肩） */
export const NPC_AVATAR_OBJECT_POSITION = 'center 22%';

/** GAL 界面设计稿尺寸（全屏时通过 zoom 等比缩放） */
export const GAL_DESIGN_WIDTH = 960;
export const GAL_TOPBAR_HEIGHT = 52;
export const GAL_BODY_HEIGHT = Math.round((GAL_DESIGN_WIDTH * 11) / 16);
export const GAL_DESIGN_HEIGHT = GAL_TOPBAR_HEIGHT + GAL_BODY_HEIGHT;

/** UI 圆形头像尺寸（设计稿 px，随 gal-shell zoom 等比缩放） */
export const CHAT_AVATAR_SIZE = 44;
export const NPC_CARD_AVATAR_SIZE = 72;
export const NPC_PROFILE_AVATAR_SIZE = 88;

export function resolveMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|data:|blob:|\/)/i.test(trimmed)) return trimmed;
  return `${MEDIA_BASE_URL}${trimmed.replace(/^\//, '')}`;
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

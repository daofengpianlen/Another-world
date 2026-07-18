import type { StoryVersion } from './types';

/** 外部 WuWaShared 未提供时，由本仓库内置的剧情版本表（可随版本更新） */
export const FALLBACK_STORY_MAP: readonly StoryVersion[] = [
  {
    version: '1.0',
    parts: ['万象新声', '嘤鸣初相召', '撞金止行阵', '奔策候残星', '庭际刀刃鸣', '欲知天将雨', '千里卷戎旌'],
  },
  { version: '1.1', parts: ['往岁乘霄醒惊蛰'] },
  { version: '1.2', parts: ['天上月华人如愿'] },
  { version: '1.3', parts: ['行至海岸尽头'] },
  {
    version: '2.0',
    parts: ['如一叶小舟穿行于茫茫海洋', '那神圣微风时常吹入', '夜与昼，均请摘下面纱', '昔我悲伤，今却歌唱'],
  },
  { version: '2.1', parts: ['飞鸟轻鸣，浪涛欢唱'] },
  { version: '2.2', parts: ['圣者，忤逆者，告死者'] },
  { version: '2.3', parts: ['焰行夏曲庆团圆'] },
  { version: '2.4', parts: ['荣耀暗面', '燃烧的心'] },
  { version: '2.5', parts: ['捕梦于神秘园中', '铁锈，剑与烈阳'] },
  { version: '2.6', parts: ['灼我以烈阳', '今夜，注定属于月亮'] },
  { version: '2.7', parts: ['已逝的必将归来', '暗潮将映的黎明'] },
  { version: '2.8', parts: ['曙光停摆于荒地之上', '星光流转于眼眸之间'] },
  { version: '3.0', parts: ['未知的既感', '冰原下的星炬', '致第二次日出', '第三幕终'] },
  { version: '3.1', parts: ['远航星', '日光落处 (上)', '日光落处 (中)', '日光落处 (下)'] },
  { version: '3.2', parts: ['影下不落的黄金', '影面颠倒的兔影'] },
  { version: '3.3', parts: ['愿系铃中', '昨夜群星'] },
];

/** 角色卡共享脚本尚未更新时，由本地补齐的章节 */
export const STORY_MAP_APPEND_PARTS: Record<string, readonly string[]> = {
  '3.3': ['在熔解的夜空下'],
};

export function patchStoryMap(storyMap: readonly StoryVersion[]): StoryVersion[] {
  return storyMap.map(ver => {
    const appendParts = STORY_MAP_APPEND_PARTS[ver.version];
    if (!appendParts?.length) return { ...ver, parts: [...ver.parts] };
    const parts = [...ver.parts];
    for (const title of appendParts) {
      if (!parts.includes(title)) parts.push(title);
    }
    return { ...ver, parts };
  });
}

export function getPatchedStoryMap(source: readonly StoryVersion[] = FALLBACK_STORY_MAP): StoryVersion[] {
  return patchStoryMap(source);
}

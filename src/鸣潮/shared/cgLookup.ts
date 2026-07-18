import cgSceneIndex from '../assets/cgSceneIndex.json';

type CgSceneIndexPayload = {
  index?: Record<string, Record<string, string>>;
};

type CgSceneIndex = Record<string, Record<string, string>>;

const INDEX: CgSceneIndex = (cgSceneIndex as CgSceneIndexPayload).index ?? (cgSceneIndex as CgSceneIndex);

/** 角色别名：AI 写「漂泊者」时依次尝试 */
const CHARACTER_ALIASES: Record<string, string[]> = {
  漂泊者: ['女漂泊者', '男漂泊者'],
  '{{user}}': ['女漂泊者', '男漂泊者'],
  user: ['女漂泊者', '男漂泊者'],
};

const CATEGORY_NAMES = new Set(['男性角色', '女性角色', 'NPC', 'npc']);

/**
 * 多形态角色：<z>短名 时对应的 CG_LIST 默认形态键。
 * <z>带形态全名 时仍走精确匹配，不经过此表。
 */
export const DEFAULT_CG_LIST_FORM: Record<string, string> = {
  卡提希娅: '卡提希娅（卡提希娅）',
  爱莉希雅: '爱莉希雅（女仆）',
  雪漓泷: '雪漓泷（日常）',
  椿: '椿（日常）',
  赞妮: '赞妮（日常）',
};

/** CG 画廊中简写为角色本名的默认形态后缀 */
export const DEFAULT_FORM_LABEL_SUFFIXES: Record<string, string[]> = {
  卡提希娅: ['（卡提希娅）'],
  爱莉希雅: ['（女仆）'],
  雪漓泷: ['（日常）'],
  椿: ['（日常）'],
  赞妮: ['（日常）'],
};

/** 千咲 <pic> 场景名中的厌恶前缀（写在 pic 里，不是 z 形态名） */
export function isChisaDisgustScene(scene: string): boolean {
  const s = scene.trim().replace(/\s+/g, '');
  return /^[（(]厌恶[）)]/.test(s);
}

export function stripChisaDisgustPrefix(scene: string): string {
  return scene.trim().replace(/\s+/g, '').replace(/^[（(]厌恶[）)]/, '');
}

/** 爱弥斯 <pic>遂兵：遂兵内容在 pic 场景名中指定，不是 z 形态名 */
export function isAimsSuibingPicScene(scene: string): boolean {
  const s = scene.trim().replace(/\s+/g, '');
  return s === '遂兵' || s === '遂兵形态';
}

export function getDefaultCgListFormKey(baseName: string): string | null {
  return DEFAULT_CG_LIST_FORM[normalizeName(baseName)] ?? null;
}

export function isDefaultFormCgListKey(char: string): boolean {
  const normalized = normalizeName(char).replace(/\(/g, '（').replace(/\)/g, '）');
  const base = normalized.replace(/（.+）$/, '');
  if (normalized === base) return false;
  const suffixes = DEFAULT_FORM_LABEL_SUFFIXES[base];
  if (!suffixes) return false;
  return suffixes.some(s => normalized === `${base}${s}`);
}

/** 旧场景名 → 标准场景名（兼容历史输出） */
const SCENE_ALIASES: Record<string, string> = {
  指交: '手交',
  指交高潮: '手交射精',
  手交高潮: '手交射精',
  后入位: '后入位做爱',
  后入位射精: '后入位做爱射精',
  女上位: '女上位做爱',
  女上射精: '女上位做爱射精',
  正常位: '正常位做爱',
  正常位射精: '正常位做爱射精',
  遂兵: '遂兵形态',
};

/** 旧 <z> 角色名：按场景推断形态子角色（返回优先尝试顺序） */
function legacyFormCharacters(character: string, scene: string): string[] {
  const char = normalizeName(character);
  const rawScene = normalizeName(scene);

  if (char === '爱莉希雅') {
    if (rawScene.startsWith('女神_') || /女神形态|战斗形态/.test(rawScene)) return ['爱莉希雅（女神）'];
    if (rawScene.startsWith('女仆_') || rawScene === '日常女仆形态') return ['爱莉希雅（女仆）'];
    if (/小精灵|休眠隐藏/.test(rawScene)) return ['爱莉希雅（小精灵）'];
    return ['爱莉希雅（女仆）'];
  }
  if (char === '椿') {
    if (rawScene === '白发日常形态' || rawScene === '日常') return ['椿（日常）'];
    if (rawScene === '病娇红发形态') return ['椿（病娇）'];
    return ['椿（日常）'];
  }
  if (char === '赞妮') {
    if (rawScene === '战斗形态') return ['赞妮（战斗）'];
    return ['赞妮（日常）'];
  }
  if (char === '爱弥斯') {
    return ['爱弥斯'];
  }
  if (char === '卡提希娅') {
    if (rawScene.startsWith('芙露德莉斯')) return ['卡提希娅（芙露德莉斯）'];
    if (rawScene.startsWith('卡提希娅')) return ['卡提希娅（卡提希娅）', '卡提希娅'];
    // 普通场景（如日常）：仅默认形态，不展开芙露德莉斯
    return ['卡提希娅', '卡提希娅（卡提希娅）'];
  }
  if (char === '雪漓泷') {
    if (rawScene.includes('龙女形态')) return ['雪漓泷（龙女形态）'];
    if (rawScene.startsWith('雪漓泷')) return ['雪漓泷（日常）'];
    return ['雪漓泷（日常）'];
  }
  if (char === '千咲') {
    if (isChisaDisgustScene(rawScene)) return ['千咲', '千咲（厌恶）'];
    return ['千咲'];
  }
  return [];
}

export function legacySceneName(character: string, scene: string): string {
  const rawScene = normalizeName(scene);
  const char = normalizeName(character);

  if (char === '爱莉希雅') {
    if (rawScene.startsWith('女神_')) return canonicalSceneName(rawScene.slice('女神_'.length));
    if (rawScene.startsWith('女仆_')) return canonicalSceneName(rawScene.slice('女仆_'.length));
    if (/女神形态|战斗形态|日常女仆形态|小精灵|休眠隐藏/.test(rawScene)) return '日常';
  }
  if (char === '卡提希娅' && rawScene.startsWith('卡提希娅')) {
    return canonicalSceneName(rawScene.slice('卡提希娅'.length));
  }
  if (char === '卡提希娅' && rawScene.startsWith('芙露德莉斯')) {
    return canonicalSceneName(rawScene.slice('芙露德莉斯'.length));
  }
  if (char === '雪漓泷' && rawScene.startsWith('雪漓泷(龙女形态)')) {
    const rest = rawScene.slice('雪漓泷(龙女形态)'.length);
    return rest ? canonicalSceneName(rest) : '日常';
  }
  if (char === '雪漓泷' && rawScene.startsWith('雪漓泷')) {
    const rest = rawScene.slice('雪漓泷'.length);
    return rest ? canonicalSceneName(rest) : '日常';
  }
  if (char === '千咲' && isChisaDisgustScene(rawScene)) {
    return canonicalSceneName(stripChisaDisgustPrefix(rawScene));
  }
  if (char === '千咲' && rawScene.startsWith('(厌恶)')) {
    return canonicalSceneName(rawScene.slice('(厌恶)'.length));
  }
  if (rawScene === '白发日常形态' || rawScene === '日常形态' || rawScene === '日常女仆形态') return '日常';
  if (rawScene === '病娇红发形态' || rawScene === '战斗形态') return '日常';

  return canonicalSceneName(rawScene);
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, '');
}

function rankCharacterFuzzy(trimmed: string, key: string): number | null {
  const k = normalizeName(key);
  if (k === trimmed) return 0;
  if (k.startsWith(trimmed)) return 1;
  if (trimmed.length >= 2 && k.endsWith(trimmed)) return 2;
  // 短名（如「空」）禁止子串误匹配「夏空」；至少 3 字才允许 includes
  if (trimmed.length >= 3 && k.includes(trimmed)) return 3;
  if (trimmed.length >= 3 && k.length >= 2 && trimmed.includes(k)) return 4;
  return null;
}

function expandCharacters(character: string): string[] {
  const trimmed = normalizeName(character);
  if (!trimmed) return Object.keys(INDEX);
  const alias = CHARACTER_ALIASES[trimmed];
  if (alias) return alias;
  if (INDEX[trimmed]) return [trimmed];

  const ranked = Object.keys(INDEX)
    .map(key => ({ key, rank: rankCharacterFuzzy(trimmed, key) }))
    .filter((item): item is { key: string; rank: number } => item.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.key.length - b.key.length);

  if (!ranked.length) return [trimmed];

  const bestRank = ranked[0].rank;
  const atBest = ranked.filter(item => item.rank === bestRank);
  if (atBest.length === 1) return [atBest[0].key];

  // 多个同等级候选 → 宁可不匹配，避免「空」→「夏空」
  if (bestRank >= 3) return [trimmed];

  atBest.sort((a, b) => Math.abs(a.key.length - trimmed.length) - Math.abs(b.key.length - trimmed.length));
  return [atBest[0].key];
}

function matchScene(scenes: Record<string, string>, scene: string): string | null {
  const key = normalizeName(scene);
  if (!key) return null;
  if (scenes[key]) return scenes[key];

  const entries = Object.entries(scenes);
  const exactIgnoreCase = entries.find(([k]) => normalizeName(k).toLowerCase() === key.toLowerCase());
  if (exactIgnoreCase) return exactIgnoreCase[1];

  const startsWith = entries.filter(([k]) => normalizeName(k).startsWith(key));
  if (startsWith.length === 1) return startsWith[0][1];
  if (startsWith.length > 1) {
    const preferred = startsWith.find(([k]) => k.includes('状态')) ?? startsWith[0];
    return preferred[1];
  }

  const includes = entries.filter(([k]) => normalizeName(k).includes(key) || key.includes(normalizeName(k)));
  if (includes.length === 1) return includes[1];
  if (includes.length > 1) {
    const preferred = includes.find(([k]) => k.includes('状态')) ?? includes[0];
    return preferred[1];
  }

  return null;
}

function canonicalSceneName(scene: string): string {
  const key = normalizeName(scene);
  return SCENE_ALIASES[key] ?? key;
}

/** 与 lookupCgScene 一致：GAL 角色名 → 优先尝试的 CG_LIST 角色键（含多形态） */
export function getCgLookupCharOrder(character: string, scene: string): string[] {
  const legacyForms = legacyFormCharacters(character, scene);
  const expanded = expandCharacters(character).filter(c => !legacyForms.includes(c));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of [...legacyForms, ...expanded]) {
    if (seen.has(c)) continue;
    seen.add(c);
    result.push(c);
  }
  return result;
}

/** 按 <z> 文件夹名 + <pic> 文件名 查找本地 CG 相对路径 */
export function lookupCgScene(character: string, scene: string): string | null {
  const sceneKey = legacySceneName(character, scene);
  if (!sceneKey) return null;

  const rawScene = normalizeName(scene);
  const char = normalizeName(character);

  // 千咲厌恶线：pic 与磁盘文件名一致（如 (厌恶)足交）
  if (char === '千咲' && isChisaDisgustScene(rawScene)) {
    const flat = INDEX['千咲'];
    if (flat) {
      for (const key of [rawScene, rawScene.replace(/（/g, '(').replace(/）/g, ')'), rawScene.replace(/\(/g, '（').replace(/\)/g, '）')]) {
        if (flat[key]) return flat[key];
      }
    }
  }

  const legacyForms = legacyFormCharacters(character, scene);
  const charsToTry = [
    ...legacyForms,
    ...expandCharacters(character).filter(c => !legacyForms.includes(c)),
  ];
  const seen = new Set<string>();

  for (const char of charsToTry) {
    if (seen.has(char)) continue;
    seen.add(char);
    const scenes = INDEX[char];
    if (!scenes) continue;
    const rel = matchScene(scenes, sceneKey);
    if (rel) return rel;
  }

  if (!character.trim()) {
    for (const scenes of Object.values(INDEX)) {
      const rel = matchScene(scenes, sceneKey);
      if (rel) return rel;
    }
  }

  return null;
}

export function isLegacyPicRef(ref: string): boolean {
  const raw = ref.trim();
  return /^https?:\/\//i.test(raw) || /\.(png|jpe?g|gif|webp|avif|mp4|webm|mov|ogg)$/i.test(raw);
}

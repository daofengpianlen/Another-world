import mediaLocalMap from '../assets/mediaLocalMap.json';
import cgSceneIndex from '../assets/cgSceneIndex.json';
import {
  getCgLookupCharOrder,
  getDefaultCgListFormKey,
  isChisaDisgustScene,
  isDefaultFormCgListKey,
  isLegacyPicRef,
  legacySceneName,
  lookupCgScene,
  stripChisaDisgustPrefix,
} from './cgLookup';
import { resolveWuwaAssetPath, resolveWuwaMediaUrl } from './wuwaMedia';

type CgSceneIndex = Record<string, Record<string, string>>;
type CgList = Record<string, Record<string, string>>;
type UnlockTarget = { char: string; scene: string };

const INDEX: CgSceneIndex =
  (cgSceneIndex as { index?: CgSceneIndex }).index ?? (cgSceneIndex as CgSceneIndex);

const LOCAL_FILES: Record<string, string> = (mediaLocalMap as { files?: Record<string, string> }).files ?? {};
const LOCAL_URLS: Record<string, string> = (mediaLocalMap as { urls?: Record<string, string> }).urls ?? {};

/** 索引场景名 → CG_LIST 中可能使用的键名 */
const SCENE_CG_LIST_ALIASES: Record<string, string[]> = {
  日常: ['日常', '普通插图', '日常状态', '日常形态'],
  普通插图: ['普通插图', '日常'],
  指交: ['手交'],
  指交高潮: ['手交射精'],
  手交高潮: ['手交射精'],
  后入位: ['后入位做爱'],
  后入位射精: ['后入位做爱射精'],
  女上位: ['女上位做爱'],
  女上射精: ['女上位做爱射精'],
  正常位: ['正常位做爱'],
  正常位射精: ['正常位做爱射精'],
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, '');
}

function catboxFileName(url: string): string | null {
  const trimmed = url.trim();
  const remote = trimmed.match(/files\.catbox\.moe\/([^/?#]+)/i);
  if (remote) return remote[1] ?? null;
  if (/^[a-z0-9]+\.(png|jpe?g|gif|webp|avif|mp4|webm|ogg|mov)$/i.test(trimmed)) return trimmed;
  return null;
}

function urlToRelPath(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.startsWith('cg/')) return trimmed;
  if (LOCAL_URLS[trimmed]) return LOCAL_URLS[trimmed];
  const file = catboxFileName(trimmed);
  if (file && LOCAL_FILES[file]) return LOCAL_FILES[file];
  return null;
}

function findIndexEntryByRel(rel: string): { char: string; scene: string } | null {
  for (const [char, scenes] of Object.entries(INDEX)) {
    for (const [scene, path] of Object.entries(scenes)) {
      if (path === rel) return { char, scene };
    }
  }
  return null;
}

function mapSceneToCgListKey(scenes: Record<string, string>, scene: string): string | null {
  const normalized = normalizeName(scene);
  const tryKeys = new Set<string>([normalized]);
  const aliases = SCENE_CG_LIST_ALIASES[normalized];
  if (aliases) aliases.forEach(k => tryKeys.add(k));
  if (normalized === '日常') tryKeys.add('普通插图');

  for (const key of tryKeys) {
    if (key in scenes) return key;
  }
  return null;
}

function sceneVariants(sceneRef: string, character: string): string[] {
  const normalized = normalizeName(sceneRef);
  const char = normalizeName(character);
  const set = new Set<string>([normalized]);

  if (char === '千咲' && isChisaDisgustScene(normalized)) {
    const stripped = stripChisaDisgustPrefix(normalized);
    if (stripped) set.add(stripped);
    return [...set];
  }

  const legacy = legacySceneName(character, sceneRef);
  if (legacy !== normalized) set.add(legacy);
  const aliases = SCENE_CG_LIST_ALIASES[normalized];
  if (aliases) aliases.forEach(s => set.add(s));
  if (set.has('日常')) set.add('普通插图');
  return [...set];
}

/** CG 收集卡片标题中的分隔符 */
export const CG_LABEL_SEPARATOR = ' ';

let relUnlockMap: Map<string, UnlockTarget[]> | null = null;
let resourceSceneCache: Map<string, string> | null = null;

function resourceSceneCacheKey(char: string, cgListScene: string): string {
  return `${char}\0${cgListScene}`;
}

function buildRelUnlockMap(cgList: CgList): Map<string, UnlockTarget[]> {
  const map = new Map<string, UnlockTarget[]>();
  const add = (rel: string, target: UnlockTarget) => {
    const arr = map.get(rel) ?? [];
    if (!arr.some(t => t.char === target.char && t.scene === target.scene)) arr.push(target);
    map.set(rel, arr);
  };

  for (const [listChar, scenes] of Object.entries(cgList)) {
    if (listChar === '男性角色') {
      for (const [maleName, url] of Object.entries(scenes)) {
        const rel = urlToRelPath(String(url));
        if (rel) add(rel, { char: '男性角色', scene: maleName });
      }
      continue;
    }
    for (const [sceneKey, url] of Object.entries(scenes)) {
      const rel = urlToRelPath(String(url));
      if (rel) add(rel, { char: listChar, scene: sceneKey });
    }
  }

  for (const [indexChar, indexScenes] of Object.entries(INDEX)) {
    for (const [indexScene, rel] of Object.entries(indexScenes)) {
      const viaCandidates = resolveViaCharCandidates(indexChar, indexScene, cgList);
      if (viaCandidates) {
        add(rel, viaCandidates);
        continue;
      }
      const listScenes = cgList[indexChar];
      if (listScenes) {
        const listKey = mapSceneToCgListKey(listScenes, indexScene);
        if (listKey) add(rel, { char: indexChar, scene: listKey });
      }
    }
  }

  return map;
}

function initCgUnlockMaps(cgList: CgList): void {
  relUnlockMap = buildRelUnlockMap(cgList);
  resourceSceneCache = new Map();

  for (const [char, indexScenes] of Object.entries(INDEX)) {
    const listScenes = cgList[char];
    if (listScenes) {
      for (const [resourceScene] of Object.entries(indexScenes)) {
        const listKey = mapSceneToCgListKey(listScenes, resourceScene);
        if (listKey) resourceSceneCache.set(resourceSceneCacheKey(char, listKey), resourceScene);
      }
    }
  }

  for (const [listChar, scenes] of Object.entries(cgList)) {
    if (listChar === '男性角色') continue;
    for (const [listSceneKey] of Object.entries(scenes)) {
      const rel = urlToRelPath(String(scenes[listSceneKey]));
      if (!rel) continue;
      const baseName = rel.split('/').pop()?.replace(/\.[^.]+$/, '') ?? listSceneKey;
      resourceSceneCache.set(resourceSceneCacheKey(listChar, listSceneKey), baseName === listSceneKey ? listSceneKey : baseName);
    }
  }

  for (const [char, indexScenes] of Object.entries(INDEX)) {
    const maleScenes = cgList['男性角色'];
    if (!maleScenes || !(char in maleScenes)) continue;
    const preferred =
      '日常' in indexScenes ? '日常' : ('默认' in indexScenes ? '默认' : Object.keys(indexScenes)[0] ?? '日常');
    resourceSceneCache.set(resourceSceneCacheKey('男性角色', char), preferred);
  }
}

function pickRelTarget(
  targets: UnlockTarget[] | undefined,
  character: string,
  sceneRef: string,
  cgList: CgList,
): UnlockTarget | null {
  const exact = resolveExactCgListTarget(character, sceneRef, cgList);
  if (exact) return exact;

  const fromIndex = resolveUnlockTargetFromIndexLookup(character, sceneRef, cgList);
  if (fromIndex) return fromIndex;

  if (!targets?.length) return null;
  if (targets.length === 1) return targets[0];
  for (const listChar of getCgLookupCharOrder(character, sceneRef)) {
    const hit = targets.find(t => t.char === listChar);
    if (hit) return hit;
  }
  return targets[0] ?? null;
}

/** lookupCgScene 命中后，映射到 CG_LIST 存储键（与 assets/cg 文件夹+文件名一致） */
function resolveUnlockTargetFromIndexLookup(
  character: string,
  sceneRef: string,
  cgList: CgList,
): UnlockTarget | null {
  const rel = lookupCgScene(character, sceneRef);
  if (!rel) return null;

  const galChar = normalizeCgListCharKey(character);
  const picScene = normalizeName(sceneRef);

  const tryListKey = (listChar: string, listScene: string): UnlockTarget | null => {
    const scenes = cgList[listChar];
    if (!scenes) return null;
    const key = mapSceneToCgListKey(scenes, listScene);
    if (key) return { char: listChar, scene: key };
    return null;
  };

  if (galChar === '爱弥斯') {
    for (const variant of sceneVariants(sceneRef, character)) {
      const hit = tryListKey('爱弥斯', variant) ?? tryListKey('爱弥斯（日常）', variant);
      if (hit) return hit;
    }
    if (picScene === '遂兵' || picScene === '遂兵形态') {
      return (
        tryListKey('爱弥斯', '遂兵形态')
        ?? tryListKey('爱弥斯', '遂兵')
        ?? tryListKey('爱弥斯（遂兵）', '日常')
      );
    }
  }

  if (galChar === '千咲') {
    if (isChisaDisgustScene(picScene)) {
      for (const key of [
        picScene,
        picScene.replace(/（/g, '(').replace(/）/g, ')'),
        picScene.replace(/\(/g, '（').replace(/\)/g, '）'),
      ]) {
        const hit = tryListKey('千咲', key);
        if (hit) return hit;
      }
      const stripped = stripChisaDisgustPrefix(picScene);
      const hit = tryListKey('千咲（厌恶）', stripped);
      if (hit) return hit;
    }
    for (const variant of sceneVariants(sceneRef, character)) {
      const hit = tryListKey('千咲', variant);
      if (hit) return hit;
    }
  }

  const entry = findIndexEntryByRel(rel);
  if (entry) {
    const hit = tryListKey(entry.char, entry.scene);
    if (hit) return hit;
    if (entry.char === '千咲（厌恶）') {
      const prefixed = `(厌恶)${entry.scene}`;
      const flat = tryListKey('千咲', prefixed);
      if (flat) return flat;
    }
    const defaultForm = getDefaultCgListFormKey(galChar);
    if (defaultForm) {
      const formHit = tryListKey(defaultForm, entry.scene);
      if (formHit) return formHit;
    }
  }

  return null;
}

function resolveMaleCgListTarget(indexChar: string, cgList: CgList): UnlockTarget | null {
  const maleScenes = cgList['男性角色'];
  if (!maleScenes || !(indexChar in maleScenes)) return null;
  return { char: '男性角色', scene: indexChar };
}

/** 统一全角括号，便于与 CG_LIST 键对齐 */
function normalizeCgListCharKey(name: string): string {
  return normalizeName(name).replace(/\(/g, '（').replace(/\)/g, '）');
}

/**
 * 按 GAL <z> 标签中的角色名精确解析解锁目标（不做形态优先级推断）。
 * - <z>卡提希娅<pic>日常 → 卡提希娅（卡提希娅）/日常
 * - <z>卡提希娅（芙露德莉斯）<pic>日常 → 卡提希娅（芙露德莉斯）/日常
 */
function resolveExactCgListTarget(character: string, sceneRef: string, cgList: CgList): UnlockTarget | null {
  const char = normalizeCgListCharKey(character);
  const rawScene = normalizeName(sceneRef);
  if (!char) return null;
  const variants = sceneVariants(sceneRef, character);

  const tryScenes = (listChar: string): UnlockTarget | null => {
    const scenes = cgList[listChar];
    if (!scenes) return null;
    for (const variant of variants) {
      const listScene = mapSceneToCgListKey(scenes, variant);
      if (listScene) return { char: listChar, scene: listScene };
    }
    return null;
  };

  // 爱弥斯：单文件夹，<z>爱弥斯 + <pic>文件名
  if (char === '爱弥斯') {
    const hit = tryScenes('爱弥斯') ?? tryScenes('爱弥斯（日常）');
    if (hit) return hit;
    return null;
  }

  // 千咲厌恶线：pic 与磁盘文件名一致（文件夹仍为「千咲」）
  if (char === '千咲' && isChisaDisgustScene(rawScene)) {
    const flat = tryScenes('千咲');
    if (flat) return flat;
    const disgust = tryScenes('千咲（厌恶）');
    if (disgust) return disgust;
    return null;
  }

  const direct = tryScenes(char);
  if (direct) return direct;

  // 无形态后缀的短名 → 该角色的默认形态子键
  if (!char.includes('（')) {
    const defaultForm = getDefaultCgListFormKey(char);
    if (defaultForm) {
      const hit = tryScenes(defaultForm);
      if (hit) return hit;
    }
    const fallbackKeys = [`${char}（${char}）`, `${char}（日常）`];
    for (const key of fallbackKeys) {
      const hit = tryScenes(key);
      if (hit) return hit;
    }
  }

  return null;
}

function resolveViaCharCandidates(character: string, sceneRef: string, cgList: CgList): UnlockTarget | null {
  const variants = sceneVariants(sceneRef, character);
  for (const listChar of getCgLookupCharOrder(character, sceneRef)) {
    const scenes = cgList[listChar];
    if (!scenes) continue;
    for (const variant of variants) {
      const listScene = mapSceneToCgListKey(scenes, variant);
      if (listScene) return { char: listChar, scene: listScene };
    }
  }
  const normalizedChar = normalizeName(character);
  if (normalizedChar) {
    const maleTarget = resolveMaleCgListTarget(normalizedChar, cgList);
    if (maleTarget) return maleTarget;
  }
  return null;
}

function resolveLegacyUrlTarget(sceneRef: string, cgList: CgList): UnlockTarget | null {
  for (const [charName, scenes] of Object.entries(cgList)) {
    for (const [sceneType, url] of Object.entries(scenes)) {
      if (String(url).includes(sceneRef)) return { char: charName, scene: sceneType };
    }
  }
  return null;
}

export function ensureCgResourceSceneCache(cgList: CgList): void {
  if (!resourceSceneCache) initCgUnlockMaps(cgList);
}

export function refreshCgUnlockMaps(cgList: CgList): void {
  initCgUnlockMaps(cgList);
}

/** CG 画廊 / 全屏预览：优先用 cgSceneIndex 相对路径，避免 catbox 映射错位 */
export function resolveWuwaCgDisplayUrl(character: string, sceneType: string, cgList?: CgList): string {
  const scene = sceneType.trim();
  if (!scene) return '';

  const rel =
    lookupCgScene(character, scene) ?? lookupCgScene(character, legacySceneName(character, scene));
  if (rel) {
    const fromIndex = resolveWuwaAssetPath(rel);
    if (fromIndex) return fromIndex;
  }

  const list = cgList ?? window.CG_LIST;
  if (!list) return '';

  const exact = resolveExactCgListTarget(character, sceneType, list);
  if (exact) {
    const raw = list[exact.char]?.[exact.scene];
    if (raw) return resolveWuwaMediaUrl(String(raw));
  }

  const target = resolveViaCharCandidates(character, sceneType, list);
  if (target) {
    const raw = list[target.char]?.[target.scene];
    if (raw) return resolveWuwaMediaUrl(String(raw));
  }

  const direct = list[character]?.[sceneType];
  return direct ? resolveWuwaMediaUrl(String(direct)) : '';
}

/** 将 CG_LIST 场景键转为资源索引中的标准场景名（如 普通插图 → 日常） */
export function resolveResourceSceneName(char: string, cgListSceneKey: string, cgList?: CgList): string {
  if (cgList) ensureCgResourceSceneCache(cgList);
  const cached = resourceSceneCache?.get(resourceSceneCacheKey(char, cgListSceneKey));
  if (cached) return cached;
  if (cgListSceneKey === '普通插图') return '日常';
  return cgListSceneKey;
}

/** CG 收集卡片标题：角色名 + 资源场景名 */
export function formatCgGalleryLabel(char: string, cgListSceneKey: string, cgList?: CgList): string {
  if (char === '男性角色') {
    const scene = resolveResourceSceneName('男性角色', cgListSceneKey, cgList);
    return `${cgListSceneKey}${CG_LABEL_SEPARATOR}${scene === cgListSceneKey ? '日常' : scene}`;
  }
  const base = char.replace(/（.+）$/, '');
  const scene = resolveResourceSceneName(char, cgListSceneKey, cgList);
  if (char === '爱弥斯' && (cgListSceneKey === '遂兵形态' || cgListSceneKey === '遂兵')) {
    return `爱弥斯${CG_LABEL_SEPARATOR}遂兵形态`;
  }
  if (char === '爱弥斯' || char === '爱弥斯（日常）') {
    return `爱弥斯${CG_LABEL_SEPARATOR}${scene}`;
  }
  if (char === '千咲（厌恶）') {
    return `千咲${CG_LABEL_SEPARATOR}(厌恶)${scene}`;
  }
  if (char === '千咲' && isChisaDisgustScene(cgListSceneKey)) {
    return `千咲${CG_LABEL_SEPARATOR}${cgListSceneKey}`;
  }
  if (char !== base && !char.includes('男性')) {
    if (isDefaultFormCgListKey(char)) {
      return `${base}${CG_LABEL_SEPARATOR}${scene}`;
    }
    return `${char}${CG_LABEL_SEPARATOR}${scene}`;
  }
  return `${char}${CG_LABEL_SEPARATOR}${scene}`;
}

/** 将 GAL 中的角色名 + 场景名解析为 CG_LIST 存储键（统一入口，覆盖男性/多形态/旧键名） */
export function resolveCgListUnlockTarget(
  character: string,
  sceneRef: string,
  cgList: CgList,
): UnlockTarget | null {
  const scene = sceneRef.trim();
  if (!scene) return null;

  if (!relUnlockMap) initCgUnlockMaps(cgList);

  const fromIndex = resolveUnlockTargetFromIndexLookup(character, sceneRef, cgList);
  if (fromIndex) return fromIndex;

  const exact = resolveExactCgListTarget(character, sceneRef, cgList);
  if (exact) return exact;

  if (isLegacyPicRef(scene)) {
    const rel = urlToRelPath(scene);
    if (rel) {
      const byRel = pickRelTarget(relUnlockMap!.get(rel), character, sceneRef, cgList);
      if (byRel) return byRel;
    }
    return resolveLegacyUrlTarget(scene, cgList);
  }

  const rel = lookupCgScene(character, scene);
  if (rel) {
    const byRel = pickRelTarget(relUnlockMap!.get(rel), character, sceneRef, cgList);
    if (byRel) return byRel;

    const entry = findIndexEntryByRel(rel);
    if (entry) {
      const entryExact = resolveExactCgListTarget(character, sceneRef, cgList);
      if (entryExact) return entryExact;
      if (cgList[entry.char]) {
        const listScene = mapSceneToCgListKey(cgList[entry.char]!, entry.scene);
        if (listScene) return { char: entry.char, scene: listScene };
      }
      const maleTarget = resolveMaleCgListTarget(entry.char, cgList);
      if (maleTarget) return maleTarget;
    }
  }

  const viaCandidates = resolveViaCharCandidates(character, sceneRef, cgList);
  if (viaCandidates) return viaCandidates;

  const file = catboxFileName(scene);
  if (file) {
    const relFromFile = LOCAL_FILES[file];
    if (relFromFile) {
      const byRel = pickRelTarget(relUnlockMap!.get(relFromFile), character, sceneRef, cgList);
      if (byRel) return byRel;
    }
  }

  return null;
}

/** 从含 <gal> / <z> 的原文中解析待解锁的 CG */
export function parseGalContentForCgUnlock(content: string): Array<{ character: string; scene: string }> {
  const results: Array<{ character: string; scene: string }> = [];
  if (!content.includes('<pic>')) return results;

  const zPicRegex = /<z>\s*([^<]*?)\s*<pic>\s*([\s\S]*?)\s*<\/pic>/gi;
  let match: RegExpExecArray | null;
  while ((match = zPicRegex.exec(content)) !== null) {
    const character = match[1]?.trim() ?? '';
    const scene = match[2]?.trim() ?? '';
    if (character && scene) results.push({ character, scene });
  }

  return results;
}

export function tryUnlockCgByRoleAndScene(character: string, sceneRef: string, cgList?: CgList): boolean {
  const list = cgList ?? window.CG_LIST;
  const unlockCG = window.unlockCG;
  if (!list || typeof unlockCG !== 'function') return false;

  const target = resolveCgListUnlockTarget(character, sceneRef, list);
  if (!target) {
    console.warn(`[CG系统] 未能解析解锁目标: ${character} / ${sceneRef}`);
    return false;
  }

  unlockCG(target.char, target.scene);
  console.info(`[CG系统] 解锁: ${formatCgGalleryLabel(target.char, target.scene, list)}`);
  return true;
}

declare global {
  interface Window {
    CG_LIST?: CgList;
    unlockCG?: (characterName: string, sceneType: string, maxCount?: number) => void;
    unlockCgByRoleAndScene?: (character: string, sceneRef: string) => boolean;
    unlockCgFromGalContent?: (content: string) => void;
    formatCgGalleryLabel?: (sourceChar: string, cgListSceneKey: string) => string;
    resolveWuwaCgDisplayUrl?: (character: string, sceneType: string) => string;
    refreshCgUnlockMaps?: () => void;
  }
}

export function registerCgUnlockBridge(): void {
  if (window.CG_LIST) initCgUnlockMaps(window.CG_LIST);

  window.formatCgGalleryLabel = (sourceChar, cgListSceneKey) =>
    formatCgGalleryLabel(sourceChar, cgListSceneKey, window.CG_LIST);

  window.resolveWuwaCgDisplayUrl = (character, sceneType) =>
    resolveWuwaCgDisplayUrl(character, sceneType, window.CG_LIST);

  window.refreshCgUnlockMaps = () => {
    if (window.CG_LIST) refreshCgUnlockMaps(window.CG_LIST);
  };

  window.unlockCgByRoleAndScene = (character, sceneRef) =>
    tryUnlockCgByRoleAndScene(character, sceneRef, window.CG_LIST);

  window.unlockCgFromGalContent = content => {
    for (const { character, scene } of parseGalContentForCgUnlock(content)) {
      tryUnlockCgByRoleAndScene(character, scene, window.CG_LIST);
    }
  };
}

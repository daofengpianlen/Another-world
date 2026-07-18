/**
 * 从 cgSceneIndex.json 完全重建 legacyPhone.js 中的 CG_LIST 块。
 * 同名带括号的角色（如千咲+千咲（蜜桃冰））合并为同一条目。
 * 运行: node src/鸣潮/工具/rebuildCgListFromIndex.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const LEGACY = path.resolve(__dirname, '../脚本/手机/legacyPhone.js');
const INDEX_PATH = path.join(ASSETS, 'cgSceneIndex.json');

const { index } = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

// ── 千咲厌恶索引扁平化映射 ──
const DISGUST_INDEX = index['千咲（厌恶）'] ?? {};

const SKIP_CHARS = new Set(['卡提希娅（卡提希娅）']); // 别名，已在 base 中

/** 提取基础角色名：去掉括号及后缀，如 "千咲（蜜桃冰）" → { base: "千咲", suffix: "（蜜桃冰）" } */
function parseBaseName(fullName) {
  const m = fullName.match(/^(.+?)([（(].+[）)])$/);
  if (!m) return { base: fullName, suffix: null };
  // 排除特殊键：千咲（厌恶）不走合并
  if (fullName === '千咲（厌恶）') return { base: fullName, suffix: null };
  return { base: m[1], suffix: m[2] };
}

/** 构建合并映射：baseName → { variants: [{ suffix, scenes }] } */
function buildMergeMap() {
  const map = {};
  for (const [charName, scenes] of Object.entries(index)) {
    const { base, suffix } = parseBaseName(charName);
    if (!suffix) continue; // 非变体，跳过

    if (!map[base]) map[base] = { variants: [] };
    map[base].variants.push({ suffix, scenes });
  }
  return map;
}

/** 获取角色的合并后场景（含变体的带后缀场景名） */
function getMergedScenes(charName) {
  const baseScenes = index[charName] ? { ...index[charName] } : {};
  const mergeMap = buildMergeMap();
  const group = mergeMap[charName];

  if (group) {
    for (const { suffix, scenes } of group.variants) {
      for (const [scene, rel] of Object.entries(scenes)) {
        const key = `${scene}${suffix}`;
        if (!baseScenes[key]) {
          baseScenes[key] = rel;
        }
      }
    }
  }

  // 千咲：把厌恶子索引也加进去（全角括号键名）
  if (charName === '千咲') {
    for (const [scene, rel] of Object.entries(DISGUST_INDEX)) {
      const key = `（厌恶）${scene}`;
      if (!baseScenes[key]) {
        baseScenes[key] = rel;
      }
    }
  }

  return baseScenes;
}

function sceneLines(scenes, indent = '    ') {
  return Object.entries(scenes)
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([scene, url]) => `${indent}"${scene}": "${url}",`)
    .join('\n');
}

// ── 解析 CG_LIST 块 ──
let src = fs.readFileSync(LEGACY, 'utf8');
const cgStart = src.indexOf('const CG_LIST = {');
const cgEnd = src.indexOf('\n};', cgStart);
if (cgStart === -1 || cgEnd === -1) throw new Error('CG_LIST not found');

// ── 收集 Index 中所有带后缀的变体名 ──
const mergeMap = buildMergeMap();
const variantNames = new Set();

for (const charName of Object.keys(index)) {
  const { base, suffix } = parseBaseName(charName);
  if (suffix && mergeMap[base]) {
    variantNames.add(charName);
  }
}

// ── 虚拟 base：仅有变体、无 base 文件夹的角色（如 爱莉希雅） ──
const virtualBases = new Set();
for (const base of Object.keys(mergeMap)) {
  if (!index[base]) {
    virtualBases.add(base);
  }
}

// ── 重建 CG_LIST ──
const seen = new Set();
const newBlock = ['const CG_LIST = {'];

// 保留原来有的角色顺序（如果还在 index 中且非变体）
const existingChars = new Set();
const cgBlock = src.slice(cgStart, cgEnd + 3);
for (const line of cgBlock.split('\n')) {
  const cm = line.match(/^"([^"]+)":\s*\{/);
  if (cm) existingChars.add(cm[1]);
}

for (const charName of existingChars) {
  if (seen.has(charName)) continue;
  if (SKIP_CHARS.has(charName)) continue;
  if (variantNames.has(charName)) continue; // 变体已合并到 base

  const scenes = getMergedScenes(charName);
  if (!scenes || Object.keys(scenes).length === 0) continue;

  seen.add(charName);
  newBlock.push(`"${charName}": {`);
  newBlock.push(sceneLines(scenes));
  newBlock.push('  },');
}

// 新增 index 中有但 CG_LIST 中没有的角色（含男性角色）
for (const charName of Object.keys(index).sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
  if (seen.has(charName)) continue;
  if (SKIP_CHARS.has(charName)) continue;
  if (variantNames.has(charName)) continue;
  if (charName === '千咲（厌恶）') continue;

  const scenes = getMergedScenes(charName);
  if (!scenes || Object.keys(scenes).length === 0) continue;

  seen.add(charName);
  newBlock.push(`"${charName}": {`);
  newBlock.push(sceneLines(scenes));
  newBlock.push('  },');
}

// 虚拟 base：仅有变体、无 base 文件夹的角色（如 爱莉希雅，仅有女仆/女神/小精灵变体）
for (const baseName of [...virtualBases].sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
  if (seen.has(baseName)) continue;
  const scenes = getMergedScenes(baseName);
  if (!scenes || Object.keys(scenes).length === 0) continue;

  seen.add(baseName);
  newBlock.push(`"${baseName}": {`);
  newBlock.push(sceneLines(scenes));
  newBlock.push('  },');
}

newBlock.push('};');

const newCgBlock = newBlock.join('\n');
src = src.slice(0, cgStart) + newCgBlock + src.slice(cgEnd + 3);

fs.writeFileSync(LEGACY, src, 'utf8');

console.info(`[rebuild-cg-list] 角色数: ${seen.size}`);
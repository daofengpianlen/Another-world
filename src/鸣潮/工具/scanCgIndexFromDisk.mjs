/**
 * 从 assets/cg 实际文件重建 cgSceneIndex.json（权威来源：磁盘文件名 + 目录名）。
 * 运行: node src/鸣潮/工具/scanCgIndexFromDisk.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const CG_ROOT = path.join(ASSETS, 'cg');
const INDEX_PATH = path.join(ASSETS, 'cgSceneIndex.json');

const SCENE_ALIASES = {
  女上射精: '女上位做爱射精',
  抱起做爱射精: '抱起来做爱射精',
  后入做爱: '后入位做爱',
  后入做爱射精: '后入位做爱射精',
  后入位: '后入位做爱',
  后入位射精: '后入位做爱射精',
  女上位: '女上位做爱',
  正常位: '正常位做爱',
  正常位射精: '正常位做爱射精',
  被摸胸: '摸胸',
  指交: '手交',
  指交高潮: '手交射精',
  手交高潮: '手交射精',
  普通插图: '日常',
  日常状态: '日常',
  日常形态: '日常',
  普通状态: '日常',
  遂兵: '遂兵形态',
};

/** 扫描结果额外写入的 index 键（与文件夹名不同，供 lookup 兼容） */
const INDEX_KEY_ALIASES = {
  卡提希娅: '卡提希娅（卡提希娅）',
};

const MEDIA_EXT = /\.(mp4|png|webp|jpe?g|gif|avif|webm|mov)$/i;

function rel(...parts) {
  return path.posix.join('cg', ...parts);
}

function basenameNoExt(file) {
  return path.basename(file, path.extname(file));
}

function normalizeSceneName(name) {
  return SCENE_ALIASES[name] ?? name;
}

function listMediaFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => MEDIA_EXT.test(f));
}

function addScene(scenes, scene, fileRel) {
  if (!scenes[scene]) {
    scenes[scene] = fileRel;
    return;
  }
  if (scenes[scene] === fileRel) return;
  if (scene === '日常') return;
}

function addDailyAlias(scenes) {
  if (scenes['日常']) return;
  for (const [key, fileRel] of Object.entries(scenes)) {
    if (/^日常$|日常状态|日常形态|普通插图|普通状态/.test(key) || /\/日常\.(mp4|png|webp|jpg)/i.test(fileRel)) {
      scenes['日常'] = fileRel;
      return;
    }
  }
}

function scanCharacterFolder(folderName) {
  const dir = path.join(CG_ROOT, folderName);
  const scenes = {};
  const disgustScenes = {};

  for (const file of listMediaFiles(dir)) {
    const rawBase = basenameNoExt(file);
    const fileRel = rel(folderName, file);

    const disgustMatch = rawBase.match(/^[（(]厌恶[）)](.+)$/);
    if (folderName === '千咲' && disgustMatch) {
      addScene(disgustScenes, normalizeSceneName(disgustMatch[1]), fileRel);
      addScene(scenes, rawBase, fileRel);
      const half = rawBase.replace(/（/g, '(').replace(/）/g, ')');
      const full = rawBase.replace(/\(/g, '（').replace(/\)/g, '）');
      if (half !== rawBase) addScene(scenes, half, fileRel);
      if (full !== rawBase) addScene(scenes, full, fileRel);
      continue;
    }

    addScene(scenes, normalizeSceneName(rawBase), fileRel);
  }

  addDailyAlias(scenes);
  addDailyAlias(disgustScenes);

  return { scenes, disgustScenes };
}

function cloneScenes(scenes) {
  return { ...scenes };
}

function main() {
  if (!fs.existsSync(CG_ROOT)) {
    throw new Error(`CG 目录不存在: ${CG_ROOT}`);
  }

  const index = {};

  // 扫描所有角色文件夹（包括男性角色、同名带括号变体等）
  for (const entry of fs.readdirSync(CG_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const { scenes, disgustScenes } = scanCharacterFolder(entry.name);
    if (Object.keys(scenes).length > 0) {
      index[entry.name] = scenes;
    }

    if (Object.keys(disgustScenes).length > 0) {
      index['千咲（厌恶）'] = disgustScenes;
    }

    const aliasKey = INDEX_KEY_ALIASES[entry.name];
    if (aliasKey && Object.keys(scenes).length > 0) {
      index[aliasKey] = cloneScenes(scenes);
    }
  }

  const payload = {
    version: 1,
    generated_at: new Date().toISOString(),
    characters: Object.keys(index).length,
    index,
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.info(`[scan-cg] 已写入 ${INDEX_PATH}（${payload.characters} 个角色）`);
}

main();
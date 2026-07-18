/**
 * 将 cgSceneIndex 中所有条目合并进 CG_LIST（自动发现缺失角色，不再硬编码）。
 * 运行: node src/鸣潮/工具/mergeCgListFromIndex.mjs && node src/鸣潮/工具/syncAllCgListFromIndex.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const LEGACY = path.resolve(__dirname, '../脚本/手机/legacyPhone.js');
const MAP_PATH = path.join(ASSETS, 'mediaLocalMap.json');

const { index } = JSON.parse(fs.readFileSync(path.join(ASSETS, 'cgSceneIndex.json'), 'utf8'));

// ── 黑名单：不应加入 CG_LIST 的角色 ──
const SKIP_CHARS = new Set([
  '阿布',
]);

// ── 男性角色（已在 CG_LIST 的"男性角色"条目下合并） ──
const MALE_CHARS = new Set([
  '仇远', '伤痕', '克里斯托弗', '凌阳', '卡卡罗', '布兰特',
  '忌炎', '渊武', '男漂泊者', '相里要', '秋水', '莫特斐', '陆·赫斯',
  '男性角色',
]);

// ── 多形态角色：基础名 → CG_LIST 中的默认形态键 ──
// 当索引有"卡提希娅"但 CG_LIST 只有"卡提希娅（卡提希娅）"时，将基础形态的场景合并到默认形态中
const BASE_TO_DEFAULT_FORM = {
  卡提希娅: '卡提希娅（卡提希娅）',
  雪漓泷: '雪漓泷（日常）',
  赞妮: '赞妮（日常）',
  // 注意：椿 不在这里，因为 index 中的"椿"是合并两个子形态的冗余键
};

// ── 千咲（厌恶）子索引 → 千咲 扁平 pic 键 ──
function disgustListScene(indexScene) {
  return `(厌恶)${indexScene}`;
}

function parseCgList(src) {
  const start = src.indexOf('const CG_LIST = {');
  const end = src.indexOf('\n};', start);
  if (start === -1 || end === -1) throw new Error('CG_LIST not found');
  const block = src.slice(start, end + 3);
  const chars = {};
  let cur = null;
  for (const line of block.split('\n')) {
    const cm = line.match(/^"([^"]+)":\s*\{/);
    if (cm) {
      cur = cm[1];
      chars[cur] = {};
      continue;
    }
    const sm = line.match(/^\s*"([^"]+)":\s*"([^"]*)"/);
    if (sm && cur) chars[cur][sm[1]] = sm[2];
  }
  return { start, end, block, chars };
}

function sceneLines(scenes, indent = '    ') {
  return Object.entries(scenes)
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([scene, url]) => `${indent}"${scene}": "${url}",`)
    .join('\n');
}

function hasVariantInCgList(baseName, cgListChars) {
  const prefix = `${baseName}（`;
  return Object.keys(cgListChars).some(k => k.startsWith(prefix));
}

/**
 * 将 index 中的所有角色合并进 CG_LIST
 * @returns {{ changed: number, newChars: string[] }}
 */
function mergeAllIndexIntoCgList(chars) {
  let changed = 0;
  const newChars = [];

  for (const [indexChar, indexScenes] of Object.entries(index)) {
    // 黑名单
    if (SKIP_CHARS.has(indexChar)) continue;
    // 男性角色 → CG_LIST 中由"男性角色"条目管理
    if (MALE_CHARS.has(indexChar)) continue;

    // 已在 CG_LIST 中 → 只更新 URL（保持 cg/ 相对路径）
    if (chars[indexChar]) {
      const cur = chars[indexChar];
      for (const [scene, rel] of Object.entries(indexScenes)) {
        if (cur[scene] !== rel) {
          cur[scene] = rel;
          changed += 1;
        }
      }
      continue;
    }

    // 千咲（厌恶）子索引 → 扁平化到 千咲 条目
    if (indexChar === '千咲（厌恶）' && chars['千咲']) {
      for (const [scene, rel] of Object.entries(indexScenes)) {
        const flatKey = disgustListScene(scene);
        if (chars['千咲'][flatKey] !== rel) {
          chars['千咲'][flatKey] = rel;
          changed += 1;
        }
      }
      continue;
    }

    // 基础形态（如"卡提希娅"）→ 若 CG_LIST 有子形态，合并到默认形态
    if (indexChar in BASE_TO_DEFAULT_FORM) {
      const defaultForm = BASE_TO_DEFAULT_FORM[indexChar];
      if (chars[defaultForm]) {
        for (const [scene, rel] of Object.entries(indexScenes)) {
          if (!(scene in chars[defaultForm])) {
            chars[defaultForm][scene] = rel;
            changed += 1;
          }
        }
      }
      // 不创建独立的基础名条目
      continue;
    }

    // 若基础名有子形态在 CG_LIST 中，不重复创建基础条目
    // 例如 index 有"椿"但 CG_LIST 已有"椿（病娇）"和"椿（日常）"
    if (hasVariantInCgList(indexChar, chars)) {
      continue;
    }

    // 新角色 → 直接加入
    chars[indexChar] = { ...indexScenes };
    newChars.push(indexChar);
  }

  return { changed, newChars };
}

function rebuildBlock(chars, oldBlock, newChars) {
  const lines = oldBlock.split('\n');
  const out = [];
  let i = 0;

  // 先重写已有条目（更新 URL + 原有特殊字符块的替换）
  while (i < lines.length) {
    const cm = lines[i].match(/^"([^"]+)":\s*\{/);
    if (!cm) {
      out.push(lines[i]);
      i += 1;
      continue;
    }
    const charName = cm[1];

    // 千咲厌恶：特殊扁平化（去除被重复映射的 (厌恶)正常位 等）
    if (charName === '千咲' && chars['千咲']) {
      delete chars['千咲']['(厌恶)正常位'];
      delete chars['千咲']['(厌恶)正常位射精'];
    }

    if (chars[charName]) {
      out.push(`"${charName}": {`);
      out.push(sceneLines(chars[charName]));
      out.push('  },');
    } else {
      out.push(lines[i]);
      i += 1;
      while (i < lines.length && !/^"[^"]+":\s*\{/.test(lines[i])) {
        out.push(lines[i]);
        i += 1;
      }
      continue;
    }
    i += 1;
    while (i < lines.length && !/^"[^"]+":\s*\{/.test(lines[i]) && !/^\};/.test(lines[i])) i += 1;
  }

  // 在"男性角色"之后、"女漂泊者"之前插入新角色（维持字母排序）
  if (newChars.length > 0) {
    const sorted = [...newChars].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    // 找到"男性角色"块的末尾作为插入点
    let insertIdx = 0;
    for (let j = 0; j < out.length; j++) {
      if (out[j].startsWith('"男性角色":')) {
        // 跳过整个男性角色块
        let k = j;
        while (k < out.length && !(out[k].trimEnd().endsWith('},') && k > j)) k += 1;
        // 男性角色后是新插入位置
        insertIdx = k + 1;
        break;
      }
    }
    // 备选：插在 block 开头
    if (insertIdx <= 0) insertIdx = 1;

    const blocks = sorted.map(char => [`"${char}": {`, sceneLines(chars[char]), '  },'].join('\n'));
    out.splice(insertIdx, 0, ...blocks);
  }

  return out.join('\n');
}

function fixMediaLocalMapDisgust() {
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const fixes = {
    'vm1jda.mp4': 'cg/千咲/（厌恶）口交.mp4',
    'zesius.png': 'cg/千咲/（厌恶）口交射精.png',
    'jv9skl.mp4': 'cg/千咲/（厌恶）足交.mp4',
    'lxu3fl.png': 'cg/千咲/（厌恶）足交射精.png',
    '5n3vl6.mp4': 'cg/千咲/（厌恶）手交.mp4',
    'cnprzm.png': 'cg/千咲/（厌恶）手交射精.png',
    '3jndfq.mp4': 'cg/千咲/（厌恶）正常位.mp4',
    '7y2a30.png': 'cg/千咲/（厌恶）正常位射精.png',
  };
  let n = 0;
  for (const [file, rel] of Object.entries(fixes)) {
    if (map.files?.[file] !== rel) {
      map.files[file] = rel;
      n += 1;
    }
    const url = `https://files.catbox.moe/${file}`;
    if (map.urls?.[url] !== rel) {
      map.urls[url] = rel;
      n += 1;
    }
  }
  if (n > 0) fs.writeFileSync(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  return n;
}

// ── 主流程 ──
let src = fs.readFileSync(LEGACY, 'utf8');
const { start, end, block, chars } = parseCgList(src);
const { changed, newChars } = mergeAllIndexIntoCgList(chars);

if (newChars.length > 0) {
  console.info(`[merge-cg-index] 新增角色 (${newChars.length}): ${newChars.join(', ')}`);
}

const newBlock = rebuildBlock(chars, block, newChars);
src = src.slice(0, start) + newBlock + src.slice(end + 3);
fs.writeFileSync(LEGACY, src, 'utf8');
const mapFixes = fixMediaLocalMapDisgust();
console.info(`[merge-cg-index] CG_LIST 更新 ${changed} 条; mediaLocalMap 修正 ${mapFixes} 条`);
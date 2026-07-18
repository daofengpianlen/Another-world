/**
 * 从 cgSceneIndex + mediaLocalMap 同步 legacyPhone.js 中多形态角色的 CG_LIST 条目。
 * 运行: node src/鸣潮/工具/syncLegacyCgList.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const LEGACY = path.resolve(__dirname, '../脚本/手机/legacyPhone.js');

const { index } = JSON.parse(fs.readFileSync(path.join(ASSETS, 'cgSceneIndex.json'), 'utf8'));
const map = JSON.parse(fs.readFileSync(path.join(ASSETS, 'mediaLocalMap.json'), 'utf8'));

const relToUrl = new Map(Object.entries(map.urls ?? {}));
for (const [catbox, rel] of Object.entries(map.files ?? {})) {
  if (!relToUrl.has(rel)) relToUrl.set(rel, `https://files.catbox.moe/${catbox}`);
}
const basenameToUrl = new Map();
for (const [rel, url] of relToUrl.entries()) {
  basenameToUrl.set(path.posix.basename(rel), url);
}

function resolveUrl(rel) {
  return relToUrl.get(rel) ?? null;
}
const REMOVED = ['爱莉希雅', '椿', '赞妮', '爱弥斯', '卡提希娅', '雪漓泷'];

function sceneObject(charName) {
  const scenes = index[charName];
  if (!scenes) return null;
  const lines = [];
  for (const [scene, rel] of Object.entries(scenes)) {
    if (scene === '日常' && Object.entries(scenes).some(([k, v]) => k !== '日常' && v === rel)) continue;
    const url = resolveUrl(rel);
    const stored = url ?? rel;
    if (!url) {
      console.warn(`[warn] 无 catbox URL，使用资源路径: ${charName}/${scene} → ${rel}`);
    }
    lines.push(`    "${scene}": "${stored}"`);
  }
  return `"${charName}": {\n${lines.join(',\n')}\n  }`;
}

let src = fs.readFileSync(LEGACY, 'utf8');
const start = src.indexOf('const CG_LIST = {');
const end = src.indexOf('\n};', start);
if (start === -1 || end === -1) throw new Error('CG_LIST not found');

const cgBlock = src.slice(start, end + 3);
let updated = cgBlock;

for (const name of REMOVED) {
  const re = new RegExp(`"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":\\s*\\{[\\s\\S]*?\\n  \\},?\\n`, 'm');
  if (re.test(updated)) {
    updated = updated.replace(re, '');
    console.log(`[remove] ${name}`);
  }
}

for (const charName of Object.keys(index)) {
  if (!charName.includes('（')) continue;
  const re = new RegExp(`"${charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":\\s*\\{[\\s\\S]*?\\n  \\},?\\n`, 'm');
  if (re.test(updated)) {
    updated = updated.replace(re, '');
    console.log(`[remove] ${charName}`);
  }
}

const insertBefore = '"秧秧": {';
const newEntries = [];
for (const charName of Object.keys(index).sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
  if (!charName.includes('（')) continue;
  const block = sceneObject(charName);
  if (block) newEntries.push(block);
}

const insertion = `${newEntries.join(',\n')},\n`;
if (!updated.includes(insertBefore)) throw new Error('insert anchor not found');
updated = updated.replace(insertBefore, `${insertion}${insertBefore}`);

src = src.slice(0, start) + updated + src.slice(end + 3);
fs.writeFileSync(LEGACY, src, 'utf8');
console.log(`[done] 写入 ${newEntries.length} 个多形态 CG_LIST 条目`);

/**
 * 审计 CG_LIST / mediaLocalMap / cgSceneIndex 一致性
 * 运行: node src/鸣潮/工具/auditCgMappings.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const LEGACY = path.join(ROOT, '脚本/手机/legacyPhone.js');

const map = JSON.parse(fs.readFileSync(path.join(ASSETS, 'mediaLocalMap.json'), 'utf8'));
const { index } = JSON.parse(fs.readFileSync(path.join(ASSETS, 'cgSceneIndex.json'), 'utf8'));
const legacy = fs.readFileSync(LEGACY, 'utf8');

function parseCgList(src) {
  const start = src.indexOf('const CG_LIST = {');
  const end = src.indexOf('\n};', start);
  const block = src.slice(start, end);
  const chars = {};
  let cur = null;
  for (const line of block.split('\n')) {
    const cm = line.match(/^"([^"]+)":\s*\{/);
    if (cm) {
      cur = cm[1];
      chars[cur] = {};
      continue;
    }
    const sm = line.match(/^\s*"([^"]+)":\s*"([^"]+)"/);
    if (sm && cur) chars[cur][sm[1]] = sm[2];
  }
  return chars;
}

const chars = parseCgList(legacy);

// 1. 同一 URL 被多个不同角色使用
const urlToEntries = new Map();
for (const [ch, scenes] of Object.entries(chars)) {
  for (const [scene, url] of Object.entries(scenes)) {
    if (!urlToEntries.has(url)) urlToEntries.set(url, []);
    urlToEntries.get(url).push(`${ch}/${scene}`);
  }
}
const collisions = [];
for (const [url, entries] of urlToEntries) {
  const bases = new Set(entries.map(e => e.split('/')[0].replace(/（.+）$/, '')));
  if (entries.length > 1 && bases.size > 1) collisions.push({ url, entries });
}

console.log('=== CG_LIST: 同一 URL 跨角色复用 ===');
for (const c of collisions) {
  console.log(`  ${c.url}`);
  for (const e of c.entries) console.log(`    - ${e}`);
}
console.log(`共 ${collisions.length} 组\n`);

// 2. catbox URL 在 mediaLocalMap 指向的文件夹 vs cgSceneIndex
const wrong = [];
for (const [ch, scenes] of Object.entries(chars)) {
  for (const [scene, url] of Object.entries(scenes)) {
    if (!url.startsWith('http')) continue;
    const file = url.match(/files\.catbox\.moe\/([^/?#]+)/i)?.[1];
    const rel = map.urls?.[url] ?? (file ? map.files?.[file] : null);
    const indexRel = index[ch]?.[scene];
    if (!rel || !indexRel || rel === indexRel) continue;
    const relChar = rel.split('/')[1];
    const idxChar = indexRel.split('/')[1];
    if (relChar !== idxChar) wrong.push({ ch, scene, url, rel, indexRel });
  }
}

console.log('=== CG_LIST catbox 映射与索引路径角色文件夹不一致 ===');
for (const w of wrong) {
  console.log(`  ${w.ch}/${w.scene}`);
  console.log(`    map:   ${w.rel}`);
  console.log(`    index: ${w.indexRel}`);
}
console.log(`共 ${wrong.length} 条\n`);

// 3. cgSceneIndex 路径在磁盘不存在
const missing = [];
for (const [ch, scenes] of Object.entries(index)) {
  for (const [scene, rel] of Object.entries(scenes)) {
    const fp = path.join(ASSETS, rel);
    if (!fs.existsSync(fp)) missing.push({ ch, scene, rel });
  }
}
console.log('=== cgSceneIndex 磁盘缺失 ===');
for (const m of missing.slice(0, 50)) console.log(`  ${m.ch}/${m.scene} → ${m.rel}`);
if (missing.length > 50) console.log(`  ... 另有 ${missing.length - 50} 条`);
console.log(`共 ${missing.length} 条\n`);

// 4. 仍用 catbox 且 basename 可能撞车的单形态角色
const basenameHits = new Map();
for (const [ch, scenes] of Object.entries(chars)) {
  for (const [scene, url] of Object.entries(scenes)) {
    if (!url.startsWith('http')) continue;
    const file = url.match(/files\.catbox\.moe\/([^/?#]+)/i)?.[1];
    if (!file) continue;
    const rel = map.files?.[file];
    if (!rel) continue;
    const base = path.posix.basename(rel);
    if (!basenameHits.has(base)) basenameHits.set(base, []);
    basenameHits.get(base).push({ ch, scene, file, rel });
  }
}
const basenameCollisions = [...basenameHits.entries()].filter(([, arr]) => {
  const folders = new Set(arr.map(a => a.rel.split('/')[1]));
  return folders.size > 1;
});
console.log('=== 同 catbox 文件名映射到不同角色文件夹（mediaLocalMap）===');
for (const [base, arr] of basenameCollisions.slice(0, 20)) {
  console.log(`  ${base}:`);
  for (const a of arr) console.log(`    ${a.file} → ${a.rel} (${a.ch}/${a.scene})`);
}
console.log(`共 ${basenameCollisions.length} 组\n`);

// 5. 单形态角色仍全用 catbox 且无 cg/ 路径的统计
let httpOnly = 0;
let cgPath = 0;
for (const scenes of Object.values(chars)) {
  for (const url of Object.values(scenes)) {
    if (url.startsWith('cg/')) cgPath++;
    else if (url.startsWith('http')) httpOnly++;
  }
}
console.log(`CG_LIST 条目: catbox/http=${httpOnly}, cg/路径=${cgPath}`);

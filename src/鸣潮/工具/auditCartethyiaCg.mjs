/**
 * 审计卡提希娅 CG_LIST / cgSceneIndex / 解锁路径
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const LEGACY = path.resolve(__dirname, '../脚本/手机/legacyPhone.js');

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
    const sm = line.match(/^\s*"([^"]+)":\s*"([^"]*)"/);
    if (sm && cur) chars[cur][sm[1]] = sm[2];
  }
  return chars;
}

const chars = parseCgList(legacy);
const names = ['卡提希娅', '卡提希娅（卡提希娅）', '卡提希娅（芙露德莉斯）'];

console.log('=== 卡提希娅 CG 审计 ===\n');

for (const n of names) {
  const idx = index[n] ?? {};
  const list = chars[n];
  console.log(`【${n}】`);
  if (!list) {
    console.log('  CG_LIST: 缺失\n');
    continue;
  }
  const idxScenes = Object.keys(idx).sort();
  const listScenes = Object.keys(list).sort();
  const missingInList = idxScenes.filter(s => !(s in list));
  const extraInList = listScenes.filter(s => !(s in idx));
  const pathMismatch = [];
  const catbox = [];
  for (const s of idxScenes) {
    if (!list[s]) continue;
    if (list[s].startsWith('http')) catbox.push(s);
    else if (list[s] !== idx[s]) pathMismatch.push({ s, list: list[s], idx: idx[s] });
  }
  console.log(`  index: ${idxScenes.length} 场景 | CG_LIST: ${listScenes.length} 场景`);
  if (missingInList.length) console.log(`  CG_LIST 缺: ${missingInList.join(', ')}`);
  if (extraInList.length) console.log(`  CG_LIST 多: ${extraInList.join(', ')}`);
  for (const m of pathMismatch) console.log(`  路径不一致 ${m.s}: list=${m.list} | index=${m.idx}`);
  if (catbox.length) console.log(`  仍 catbox: ${catbox.join(', ')}`);
  if (!missingInList.length && !pathMismatch.length && !catbox.length) console.log('  ✓ 与 index 一致');
  console.log('');
}

// 芙露德莉斯缺破处？
const fl = index['卡提希娅（芙露德莉斯）'] ?? {};
const kt = index['卡提希娅（卡提希娅）'] ?? {};
const onlyKt = Object.keys(kt).filter(s => !(s in fl));
const onlyFl = Object.keys(fl).filter(s => !(s in kt));
console.log('【形态差异】仅主形态有:', onlyKt.join(', ') || '无');
console.log('【形态差异】仅芙露德莉斯有:', onlyFl.join(', ') || '无');

// GAL 解锁模拟（纯 CG_LIST 键）
const cases = [
  ['卡提希娅', '日常'],
  ['卡提希娅', '破处'],
  ['卡提希娅（卡提希娅）', '日常'],
  ['卡提希娅（卡提希娅）', '亲吻'],
  ['卡提希娅（芙露德莉斯）', '日常'],
  ['卡提希娅（芙露德莉斯）', '亲吻'],
];
console.log('\n=== GAL 解锁键模拟（DEFAULT_FORM 规则）===');
const DEFAULT = '卡提希娅（卡提希娅）';
for (const [z, pic] of cases) {
  let targetChar = z;
  if (z === '卡提希娅' && !z.includes('（')) targetChar = DEFAULT;
  const scenes = chars[targetChar];
  const url = scenes?.[pic];
  const ok = Boolean(url && url.startsWith('cg/'));
  console.log(`  ${ok ? 'OK' : 'FAIL'} <z>${z}<pic>${pic}</pic> → ${targetChar}/${pic} → ${url ?? '无'}`);
}

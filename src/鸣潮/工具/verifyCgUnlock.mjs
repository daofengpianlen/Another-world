/**
 * 模拟 GAL <z>+<pic> 解锁解析（需先 pnpm build 或 tsx）
 * 运行: node --import tsx src/鸣潮/工具/verifyCgUnlock.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGACY = path.resolve(__dirname, '../脚本/手机/legacyPhone.js');

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

const cgList = parseCgList(fs.readFileSync(LEGACY, 'utf8'));

const { resolveCgListUnlockTarget, refreshCgUnlockMaps } = await import('../shared/cgUnlockBridge.ts');
refreshCgUnlockMaps(cgList);

const cases = [
  ['爱弥斯', '日常'],
  ['爱弥斯', '手交'],
  ['爱弥斯', '遂兵'],
  ['爱弥斯', '遂兵形态'],
  ['千咲', '足交'],
  ['千咲', '(厌恶)足交'],
  ['千咲', '（厌恶）手交'],
  ['千咲', '(厌恶)正常位做爱'],
  ['卡提希娅', '日常'],
  ['卡提希娅（芙露德莉斯）', '亲吻'],
  ['卡提希娅', '破处'],
  ['秧秧', '手交'],
];

let fail = 0;
for (const [character, scene] of cases) {
  const target = resolveCgListUnlockTarget(character, scene, cgList);
  const url = target ? cgList[target.char]?.[target.scene] : null;
  const ok = target && url;
  if (!ok) fail += 1;
  console.log(`${ok ? 'OK' : 'FAIL'} <z>${character}<pic>${scene}</pic> → ${target ? `${target.char}/${target.scene}` : 'null'} → ${url ?? '-'}`);
}
process.exit(fail > 0 ? 1 : 0);

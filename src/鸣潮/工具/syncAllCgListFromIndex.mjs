/**
 * 将 legacyPhone.js 中 CG_LIST 全部场景 URL 同步为 cgSceneIndex 相对路径（或已有 catbox）。
 * 避免 mediaLocalMap 错映射导致错图。
 * 运行: node src/鸣潮/工具/syncAllCgListFromIndex.mjs
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

function resolveStoredUrl(_charName, _scene, rel) {
  if (!rel) return null;
  // 优先 cg/ 相对路径，避免 catbox → mediaLocalMap 错映射
  return rel;
}

function parseCgListBlock(block) {
  const lines = block.split('\n');
  const out = [];
  let cur = null;
  let changed = 0;

  for (const line of lines) {
    const cm = line.match(/^("(?:[^"\\]|\\.)*"):\s*\{/);
    if (cm) {
      cur = cm[1].slice(1, -1);
      out.push(line);
      continue;
    }
    const sm = line.match(/^(\s*)("(?:[^"\\]|\\.)*"):\s*("(?:[^"\\]|\\.)*")(,?)$/);
    if (sm && cur) {
      const scene = sm[2].slice(1, -1);
      const oldUrl = sm[3].slice(1, -1);
      const indexScenes = index[cur];
      let stored = oldUrl;
      if (indexScenes && scene in indexScenes) {
        const rel = indexScenes[scene];
        const next = resolveStoredUrl(cur, scene, rel);
        if (next && next !== oldUrl) {
          stored = next;
          changed += 1;
        }
      }
      out.push(`${sm[1]}${sm[2]}: "${stored}"${sm[4]}`);
      continue;
    }
    out.push(line);
  }
  return { text: out.join('\n'), changed };
}

let src = fs.readFileSync(LEGACY, 'utf8');
const start = src.indexOf('const CG_LIST = {');
const end = src.indexOf('\n};', start);
if (start === -1 || end === -1) throw new Error('CG_LIST not found');

const block = src.slice(start, end + 3);
const { text: updated, changed } = parseCgListBlock(block);
src = src.slice(0, start) + updated + src.slice(end + 3);
fs.writeFileSync(LEGACY, src, 'utf8');
console.info(`[sync-all-cg] 已更新 ${changed} 条 CG_LIST URL`);

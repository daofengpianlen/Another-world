/**
 * 清理 mediaLocalMap.json，只保留 src/鸣潮/assets/ 下实际存在的文件映射。
 * 运行: node src/鸣潮/工具/pruneMediaLocalMap.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const MAP_PATH = path.join(ASSETS, 'mediaLocalMap.json');
const CG_ROOT = path.join(ASSETS, 'cg');

const AVATARS_ROOT = path.join(ASSETS, 'avatars');
const WALLPAPERS_ROOT = path.join(ASSETS, 'wallpapers');
const EXPRESSIONS_ROOT = path.join(ASSETS, 'expressions');
const STICKERS_ROOT = path.join(ASSETS, 'stickers');
const UI_ROOT = path.join(ASSETS, 'ui');

function exists(...parts) {
  return fs.existsSync(path.join(ASSETS, ...parts));
}

const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

function filterSection(entries) {
  if (!entries) return {};
  const result = {};
  for (const [key, rel] of Object.entries(entries)) {
    if (typeof rel !== 'string') continue;
    // 跳过非本地路径
    if (rel.startsWith('http')) continue;
    const segments = rel.replace(/\\/g, '/').split('/');
    if (exists(...segments)) {
      result[key] = rel;
    }
  }
  return result;
}

const cleanFiles = filterSection(map.files);
const cleanUrls = filterSection(map.urls);

const removedFiles = Object.keys(map.files ?? {}).length - Object.keys(cleanFiles).length;
const removedUrls = Object.keys(map.urls ?? {}).length - Object.keys(cleanUrls).length;

map.files = cleanFiles;
map.urls = cleanUrls;
map.stats.mapped_files = Object.keys(cleanFiles).length;
map.generated_at = new Date().toISOString();

fs.writeFileSync(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
console.info(`[prune-media-map] 移除 ${removedFiles} 条 files 映射 + ${removedUrls} 条 urls 映射`);
console.info(`  剩余: ${Object.keys(cleanFiles).length} files + ${Object.keys(cleanUrls).length} urls`);
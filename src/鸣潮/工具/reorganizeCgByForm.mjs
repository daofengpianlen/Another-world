/**
 * 按角色形态拆分 cg 目录，去掉文件名前缀，并重建 cgSceneIndex / mediaLocalMap。
 * 运行: node src/鸣潮/工具/reorganizeCgByForm.mjs
 * 加 --dry-run 仅预览不改动。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../assets');
const CG_ROOT = path.join(ASSETS, 'cg');
const INDEX_PATH = path.join(ASSETS, 'cgSceneIndex.json');
const MAP_PATH = path.join(ASSETS, 'mediaLocalMap.json');
const DRY_RUN = process.argv.includes('--dry-run');

/** oldRelPath → newRelPath */
const pathRewrites = new Map();

const SCENE_ALIASES = {
  女上射精: '女上位做爱射精',
  抱起做爱射精: '抱起来做爱射精',
  后入做爱: '后入位做爱',
  后入做爱射精: '后入位做爱射精',
  女上位: '女上位做爱',
  正常位: '正常位做爱',
  正常位射精: '正常位做爱射精',
  被摸胸: '摸胸',
};

const REMOVED_CHARS = new Set([
  '爱莉希雅',
  '椿',
  '赞妮',
  '爱弥斯',
  '卡提希娅',
  '雪漓泷',
  '千咲',
]);

function rel(...parts) {
  return path.posix.join('cg', ...parts);
}

function extname(file) {
  return path.extname(file);
}

function basenameNoExt(file) {
  return path.basename(file, extname(file));
}

function normalizeSceneName(name) {
  return SCENE_ALIASES[name] ?? name;
}

function recordMove(fromAbs, toAbs) {
  const fromRel = path.relative(ASSETS, fromAbs).replace(/\\/g, '/');
  const toRel = path.relative(ASSETS, toAbs).replace(/\\/g, '/');
  pathRewrites.set(fromRel, toRel);
}

function ensureDir(dir) {
  if (!DRY_RUN) fs.mkdirSync(dir, { recursive: true });
}

function transfer(src, dest, { copy = false } = {}) {
  if (!fs.existsSync(src)) {
    console.warn(`[skip] 不存在: ${path.relative(CG_ROOT, src)}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  const label = copy ? 'copy' : 'move';
  if (DRY_RUN) {
    console.log(`[dry-run ${label}] ${path.relative(CG_ROOT, src)} -> ${path.relative(CG_ROOT, dest)}`);
    recordMove(src, dest);
    return true;
  }
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  if (copy) fs.copyFileSync(src, dest);
  else fs.renameSync(src, dest);
  recordMove(src, dest);
  console.log(`[${label}] ${path.relative(CG_ROOT, src)} -> ${path.relative(CG_ROOT, dest)}`);
  return true;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
}

function splitAishiya() {
  const src = path.join(CG_ROOT, '爱莉希雅');
  transfer(path.join(src, '女神形态_战斗形态.mp4'), path.join(CG_ROOT, '爱莉希雅（女神）', '日常.mp4'));
  transfer(path.join(src, '日常女仆形态.mp4'), path.join(CG_ROOT, '爱莉希雅（女仆）', '日常.mp4'));
  transfer(path.join(src, '小精灵形态_休眠隐藏形态.mp4'), path.join(CG_ROOT, '爱莉希雅（小精灵）', '日常.mp4'));
  transfer(path.join(src, '亲吻.mp4'), path.join(CG_ROOT, '爱莉希雅（女神）', '亲吻.mp4'));
  transfer(path.join(src, '亲吻.mp4'), path.join(CG_ROOT, '爱莉希雅（女仆）', '亲吻.mp4'), { copy: true });
  transfer(path.join(src, '暴露小穴.mp4'), path.join(CG_ROOT, '爱莉希雅（女神）', '暴露小穴.mp4'));
  transfer(path.join(src, '暴露小穴.mp4'), path.join(CG_ROOT, '爱莉希雅（女仆）', '暴露小穴.mp4'), { copy: true });

  for (const file of listFiles(src)) {
    if (file.startsWith('女神_')) {
      const destName = file.slice('女神_'.length);
      transfer(path.join(src, file), path.join(CG_ROOT, '爱莉希雅（女神）', destName));
    } else if (file.startsWith('女仆_')) {
      const destName = file.slice('女仆_'.length);
      transfer(path.join(src, file), path.join(CG_ROOT, '爱莉希雅（女仆）', destName));
    }
  }
  cleanupDir(src);
}

function splitChun() {
  const src = path.join(CG_ROOT, '椿');
  transfer(path.join(src, '白发日常形态.mp4'), path.join(CG_ROOT, '椿（日常）', '日常.mp4'));
  transfer(path.join(src, '病娇红发形态.mp4'), path.join(CG_ROOT, '椿（病娇）', '日常.mp4'));
  for (const file of listFiles(src)) {
    transfer(path.join(src, file), path.join(CG_ROOT, '椿（病娇）', file));
  }
  cleanupDir(src);
}

function splitZanni() {
  const src = path.join(CG_ROOT, '赞妮');
  transfer(path.join(src, '日常形态.mp4'), path.join(CG_ROOT, '赞妮（日常）', '日常.mp4'));
  transfer(path.join(src, '战斗形态.mp4'), path.join(CG_ROOT, '赞妮（战斗）', '日常.mp4'));
  for (const file of listFiles(src)) {
    transfer(path.join(src, file), path.join(CG_ROOT, '赞妮（日常）', file));
  }
  cleanupDir(src);
}

function splitAimisi() {
  const src = path.join(CG_ROOT, '爱弥斯');
  transfer(path.join(src, '日常.mp4'), path.join(CG_ROOT, '爱弥斯（日常）', '日常.mp4'));
  transfer(path.join(src, '遂兵形态.mp4'), path.join(CG_ROOT, '爱弥斯（遂兵）', '日常.mp4'));
  for (const file of listFiles(src)) {
    transfer(path.join(src, file), path.join(CG_ROOT, '爱弥斯（日常）', file));
  }
  cleanupDir(src);
}

function splitKatixiya() {
  const src = path.join(CG_ROOT, '卡提希娅');
  const dailyKat = new Set(['卡提希娅形态态.mp4', '卡提希娅普通状态.mp4']);
  const dailyFl = new Set(['芙露德莉斯形态.mp4', '芙露德莉斯战斗状态.mp4']);

  for (const file of listFiles(src)) {
    if (file.startsWith('芙露德莉斯')) {
      const rest = file.slice('芙露德莉斯'.length);
      const destName = dailyFl.has(file) ? '日常.mp4' : normalizeSceneName(basenameNoExt(rest)) + extname(file);
      transfer(path.join(src, file), path.join(CG_ROOT, '卡提希娅（芙露德莉斯）', destName));
    } else if (file.startsWith('卡提希娅')) {
      const rest = file.slice('卡提希娅'.length);
      const destName = dailyKat.has(file) ? '日常.mp4' : normalizeSceneName(basenameNoExt(rest)) + extname(file);
      transfer(path.join(src, file), path.join(CG_ROOT, '卡提希娅（卡提希娅）', destName));
    }
  }
  cleanupDir(src);
}

function splitXuelilong() {
  const src = path.join(CG_ROOT, '雪漓泷');
  for (const file of listFiles(src)) {
    if (file.startsWith('雪漓泷(龙女形态)')) {
      const rest = file.slice('雪漓泷(龙女形态)'.length);
      const destName = rest === '.mp4' || file === '雪漓泷(龙女形态).mp4' ? '日常.mp4' : normalizeSceneName(basenameNoExt(rest)) + extname(file);
      transfer(path.join(src, file), path.join(CG_ROOT, '雪漓泷（龙女形态）', destName));
    } else if (file.startsWith('雪漓泷')) {
      const rest = file.slice('雪漓泷'.length);
      const destName =
        file === '雪漓泷日常状态.mp4' ? '日常.mp4' : normalizeSceneName(basenameNoExt(rest)) + extname(file);
      transfer(path.join(src, file), path.join(CG_ROOT, '雪漓泷（日常）', destName));
    }
  }
  cleanupDir(src);
}

function splitChisaki() {
  const src = path.join(CG_ROOT, '千咲');
  for (const file of listFiles(src)) {
    if (file.startsWith('(厌恶)')) {
      const destName = file.slice('(厌恶)'.length);
      transfer(path.join(src, file), path.join(CG_ROOT, '千咲（厌恶）', destName));
    }
  }
  cleanupDir(src, { allowLeftover: true });
}

function cleanupDir(dir, { allowLeftover = false } = {}) {
  if (!fs.existsSync(dir)) return;
  const left = fs.readdirSync(dir);
  if (left.length === 0) {
    if (!DRY_RUN) fs.rmdirSync(dir);
    console.log(`[rmdir] ${path.basename(dir)}`);
  } else if (!allowLeftover) {
    console.warn(`[warn] ${path.basename(dir)} 剩余: ${left.join(', ')}`);
  }
}

function addDailyAlias(scenes) {
  if (scenes['日常']) return;
  for (const [key, rel] of Object.entries(scenes)) {
    if (/^日常$|日常状态|日常形态|普通插图|普通状态/.test(key) || /\/日常\.(mp4|png|webp|jpg)/i.test(rel)) {
      scenes['日常'] = rel;
      return;
    }
  }
}

function rebuildIndexFromDisk(existingIndex) {
  const index = { ...existingIndex };
  for (const name of REMOVED_CHARS) delete index[name];

  for (const entry of fs.readdirSync(CG_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const charName = entry.name;
    const charPath = path.join(CG_ROOT, charName);
    const scenes = {};

    for (const file of listFiles(charPath)) {
      const scene = normalizeSceneName(basenameNoExt(file));
      scenes[scene] = rel(charName, file);
    }
    addDailyAlias(scenes);
    if (Object.keys(scenes).length > 0) index[charName] = scenes;
  }
  return index;
}

function updateMediaLocalMap() {
  if (!fs.existsSync(MAP_PATH) || pathRewrites.size === 0) return;
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  let changed = 0;

  for (const [catbox, oldRel] of Object.entries(map.files ?? {})) {
    const next = pathRewrites.get(oldRel);
    if (next) {
      map.files[catbox] = next;
      changed += 1;
    }
  }
  for (const [url, oldRel] of Object.entries(map.urls ?? {})) {
    const next = pathRewrites.get(oldRel);
    if (next) map.urls[url] = next;
  }

  if (!DRY_RUN) {
    map.generated_at = new Date().toISOString();
    fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2), 'utf8');
  }
  console.log(`[map] 更新 ${changed} 条路径映射`);
}

function main() {
  console.info(DRY_RUN ? '[dry-run] 预览 CG 形态拆分…' : '[run] 执行 CG 形态拆分…');

  splitAishiya();
  splitChun();
  splitZanni();
  splitAimisi();
  splitKatixiya();
  splitXuelilong();
  splitChisaki();

  const payload = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const index = rebuildIndexFromDisk(payload.index ?? payload);

  if (!DRY_RUN) {
    fs.writeFileSync(
      INDEX_PATH,
      JSON.stringify(
        {
          version: payload.version ?? 1,
          generated_at: new Date().toISOString(),
          characters: Object.keys(index).length,
          index,
        },
        null,
        2,
      ),
      'utf8',
    );
    updateMediaLocalMap();
  }

  console.log(`[done] ${Object.keys(index).length} 个角色`);
  for (const key of [
    '爱莉希雅（女神）',
    '爱莉希雅（女仆）',
    '爱莉希雅（小精灵）',
    '椿（日常）',
    '椿（病娇）',
    '卡提希娅（卡提希娅）',
    '雪漓泷（日常）',
    '千咲（厌恶）',
  ]) {
    if (index[key]) console.log(`  ${key}: ${Object.keys(index[key]).join('、')}`);
  }
}

main();

/* eslint-disable */
// @ts-nocheck
/**
 * 下载鸣潮项目全部外网媒体到 src/鸣潮/assets/
 * 运行: pnpm download:wuwa-assets
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT = import.meta.dirname;
const ASSETS_ROOT = path.join(ROOT, 'src/鸣潮/assets');
const MAP_FILE = path.join(ASSETS_ROOT, 'mediaLocalMap.json');
const CONCURRENCY = 3;

function getProxyUrl(): string {
  const raw = process.env.WUWA_PROXY ?? process.env.GAL_PROXY ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? 'http://127.0.0.1:7897';
  if (raw === 'none' || raw === 'off') return '';
  if (/^\d+$/.test(raw)) return `http://127.0.0.1:${raw}`;
  return raw.replace(/^https:\/\//, 'http://');
}

async function downloadViaCurl(url: string, destPath: string, proxy: string): Promise<void> {
  const args = ['-L', '--fail', '-m', '180', '-o', destPath];
  if (proxy) args.push('-x', proxy);
  args.push(url);
  await execFileAsync('curl.exe', args, { windowsHide: true });
}

function extname(file: string): string {
  const m = file.match(/(\.[a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

function safeSegment(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

function catboxFileName(url: string): string | null {
  const m = url.match(/files\.catbox\.moe\/([^/?#]+)/i);
  return m ? m[1] : null;
}

function parseConstObject(source: string, constName: string): Record<string, unknown> {
  const marker = `const ${constName}`;
  const start = source.indexOf(marker);
  if (start === -1) return {};

  let i = source.indexOf('=', start + marker.length);
  if (i === -1) return {};
  i += 1;
  while (i < source.length && source[i] !== '{') i += 1;
  if (source[i] !== '{') return {};

  let depth = 0;
  let inString: "'" | '"' | '`' | false = false;
  let escape = false;
  const begin = i;

  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === inString) inString = false;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(begin, i + 1);
        // eslint-disable-next-line no-new-func
        return new Function(`return (${literal});`)();
      }
    }
  }
  return {};
}

function addTask(
  tasks: { url: string; relPath: string; catboxFile: string }[],
  urlByPath: Map<string, Set<string>>,
  url: string,
  relPath: string,
) {
  if (!url || !/^https?:\/\//i.test(url)) return;
  const catbox = catboxFileName(url) ?? path.basename(new URL(url).pathname);
  tasks.push({ url, relPath: relPath.replace(/\\/g, '/'), catboxFile: catbox });
  if (!urlByPath.has(url)) urlByPath.set(url, new Set());
  urlByPath.get(url)!.add(relPath.replace(/\\/g, '/'));
}

const CATEGORY_NAMES = new Set(['男性角色', '女性角色', 'NPC', 'npc']);

function isCgCategory(name: string): boolean {
  return /角色$|^NPC$/i.test(name) || CATEGORY_NAMES.has(name);
}

function cgRelPathFromParts(prefix: string[], key: string, url: string): string {
  const file = catboxFileName(url) ?? 'media';
  const parts = [...prefix, key];
  const char = safeSegment(parts.length >= 2 ? parts[parts.length - 2] : parts[0]);
  const scene = safeSegment(parts[parts.length - 1]);
  return path.posix.join('cg', char, `${scene}${extname(file)}`);
}

function addSceneEntry(index: Record<string, Record<string, string>>, character: string, scene: string, relPath: string) {
  const char = safeSegment(character);
  const sceneKey = safeSegment(scene);
  if (!index[char]) index[char] = {};
  index[char][sceneKey] = relPath;
  if (sceneKey.includes('日常') && !index[char]['日常']) {
    index[char]['日常'] = relPath;
  }
  if (sceneKey === '默认' && !index[char][char]) {
    index[char][char] = relPath;
  }
}

function buildCgSceneIndex(cgList: Record<string, unknown>): Record<string, Record<string, string>> {
  const index: Record<string, Record<string, string>> = {};

  function walk(node: unknown, prefix: string[]) {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        const relPath = cgRelPathFromParts(prefix, key, value);
        if (prefix.length === 0) {
          addSceneEntry(index, key, '默认', relPath);
        } else if (prefix.length === 1 && isCgCategory(prefix[0])) {
          addSceneEntry(index, key, '默认', relPath);
        } else if (prefix.length >= 1) {
          addSceneEntry(index, prefix[prefix.length - 1], key, relPath);
        }
      } else if (value && typeof value === 'object') {
        walk(value, [...prefix, key]);
      }
    }
  }

  walk(cgList, []);
  return index;
}

function writeCgSceneIndex(cgList: Record<string, unknown>) {
  const index = buildCgSceneIndex(cgList);
  const out = path.join(ASSETS_ROOT, 'cgSceneIndex.json');
  fs.mkdirSync(ASSETS_ROOT, { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        version: 1,
        generated_at: new Date().toISOString(),
        characters: Object.keys(index).length,
        index,
      },
      null,
      2,
    ),
  );
  console.info(`[wuwa-download] cgSceneIndex 已写入 ${Object.keys(index).length} 个角色`);
}

function walkCgObject(
  node: unknown,
  prefix: string[],
  tasks: { url: string; relPath: string; catboxFile: string }[],
  urlByPath: Map<string, Set<string>>,
) {
  if (!node || typeof node !== 'object') return;
  if (typeof node === 'string' && /^https?:\/\//i.test(node)) {
    const file = catboxFileName(node) ?? 'media';
    const char = safeSegment(prefix[0] ?? 'misc');
    const scene = safeSegment(prefix.slice(1).join('_') || path.basename(file, extname(file)));
    addTask(tasks, urlByPath, node, path.posix.join('cg', char, `${scene}${extname(file)}`));
    return;
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      const file = catboxFileName(value) ?? 'media';
      const parts = [...prefix, key];
      const char = safeSegment(parts.length >= 2 ? parts[parts.length - 2] : parts[0]);
      const scene = safeSegment(parts[parts.length - 1]);
      addTask(tasks, urlByPath, value, path.posix.join('cg', char, `${scene}${extname(file)}`));
    } else if (value && typeof value === 'object') {
      walkCgObject(value, [...prefix, key], tasks, urlByPath);
    }
  }
}

function buildTasks() {
  const tasks: { url: string; relPath: string; catboxFile: string }[] = [];
  const urlByPath = new Map<string, Set<string>>();

  const legacyPath = path.join(ROOT, 'src/鸣潮/脚本/手机/legacyPhone.js');
  const legacy = fs.readFileSync(legacyPath, 'utf8');

  const cgList = parseConstObject(legacy, 'CG_LIST');
  walkCgObject(cgList, [], tasks, urlByPath);

  const fxEmojis = parseConstObject(legacy, 'FX_EMOJIS');
  for (const [key, url] of Object.entries(fxEmojis)) {
    if (typeof url !== 'string') continue;
    addTask(tasks, urlByPath, url, path.posix.join('stickers/abu', `${safeSegment(key)}${extname(url)}`));
  }

  const avatars = parseConstObject(legacy, 'CHARACTER_AVATAR_CONFIG');
  for (const [name, url] of Object.entries(avatars)) {
    if (typeof url !== 'string') continue;
    addTask(tasks, urlByPath, url, path.posix.join('avatars', `${safeSegment(name)}${extname(url)}`));
  }

  const wallpapers = parseConstObject(legacy, 'wallpaperCategories');
  for (const [category, list] of Object.entries(wallpapers)) {
    if (!Array.isArray(list)) continue;
    for (const url of list) {
      if (typeof url !== 'string') continue;
      const file = catboxFileName(url) ?? 'wallpaper';
      addTask(tasks, urlByPath, url, path.posix.join('wallpapers', safeSegment(category), file));
    }
  }

  const uiFiles: Record<string, string> = {
    'ui/xiao-ai-icon.png': 'https://files.catbox.moe/8rsrml.png',
    'ui/wave.png': 'https://files.catbox.moe/904ogs.png',
    'ui/duck-header.png': 'https://files.catbox.moe/527lb0.png',
    'ui/duck-a.png': 'https://files.catbox.moe/5adyal.png',
    'ui/duck-b.png': 'https://files.catbox.moe/g99n99.png',
    'ui/apps/messages.png': 'https://files.catbox.moe/noc1rr.png',
    'ui/apps/cg-gallery.png': 'https://files.catbox.moe/0ipbt5.png',
    'ui/apps/forum.png': 'https://files.catbox.moe/r76vz3.png',
    'ui/apps/friends.png': 'https://files.catbox.moe/hwr5mr.png',
    'ui/apps/wallpaper.png': 'https://files.catbox.moe/kvmale.png',
    'ui/apps/settings.png': 'https://files.catbox.moe/ywcw9t.png',
    'opening/logo.png': 'https://s41.ax1x.com/2026/02/25/pZxkG80.png',
    'opening/rover-male.png': 'https://s41.ax1x.com/2026/02/25/pZxkYvT.png',
    'opening/rover-female.png': 'https://s41.ax1x.com/2026/02/25/pZxkJ2V.png',
  };
  for (const [rel, url] of Object.entries(uiFiles)) {
    addTask(tasks, urlByPath, url, rel);
  }

  const urlSet = new Set(tasks.map(t => t.url));
  const extraRe = /https:\/\/(?:files\.catbox\.moe\/[^"'`\s$]+|s41\.ax1x\.com\/[^"'`\s$]+)/gi;
  for (const match of legacy.matchAll(extraRe)) {
    const url = match[0];
    if (url.includes('${') || url.includes('$')) continue;
    if (urlSet.has(url)) continue;
    const file = catboxFileName(url) ?? path.basename(new URL(url).pathname);
    addTask(tasks, urlByPath, url, path.posix.join('misc', file));
    urlSet.add(url);
  }

  const uniqueByUrl = [...urlByPath.entries()].map(([url, paths]) => ({
    url,
    relPaths: [...paths],
  }));

  return { tasks, uniqueByUrl };
}

function buildMaps(tasks: { url: string; relPath: string; catboxFile: string }[]) {
  const files: Record<string, string> = {};
  const urls: Record<string, string> = {};
  for (const task of tasks) {
    const dest = path.join(ASSETS_ROOT, ...task.relPath.split('/'));
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      files[task.catboxFile] = task.relPath;
      urls[task.url] = task.relPath;
    }
  }
  return { files, urls };
}

async function downloadOne(url: string, destPath: string, retries = 3): Promise<'ok' | 'skip' | 'fail'> {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) return 'skip';
  const proxy = getProxyUrl();

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const tmpPath = `${destPath}.part`;
    try {
      if (proxy) {
        await downloadViaCurl(url, tmpPath, proxy);
      } else {
        const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(180_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0) throw new Error('空文件');
        fs.writeFileSync(tmpPath, buffer);
      }
      if (!fs.existsSync(tmpPath) || fs.statSync(tmpPath).size === 0) throw new Error('空文件');
      fs.renameSync(tmpPath, destPath);
      return 'ok';
    } catch (error) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }
      console.warn(`[wuwa-download] 失败 ${url}: ${error instanceof Error ? error.message : error}`);
    }
  }
  return 'fail';
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, concurrency: number) {
  let index = 0;
  async function loop() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => loop()));
}

async function main() {
  const indexOnly = process.argv.includes('--index-only');
  const legacyPath = path.join(ROOT, 'src/鸣潮/脚本/手机/legacyPhone.js');
  const legacy = fs.readFileSync(legacyPath, 'utf8');
  const cgList = parseConstObject(legacy, 'CG_LIST');
  writeCgSceneIndex(cgList);
  if (indexOnly) return;

  const proxy = getProxyUrl();
  console.info('[wuwa-download] 解析鸣潮媒体清单…');
  console.info(`[wuwa-download] 代理: ${proxy || '无（直连）'}`);
  const { tasks, uniqueByUrl } = buildTasks();
  console.info(`[wuwa-download] 共 ${uniqueByUrl.length} 个唯一 URL`);

  let ok = 0;
  let skip = 0;
  let fail = 0;
  let done = 0;

  await runPool(
    uniqueByUrl,
    async item => {
      const primary = item.relPaths[0];
      const dest = path.join(ASSETS_ROOT, ...primary.split('/'));
      const result = await downloadOne(item.url, dest);
      if (result === 'ok') ok += 1;
      else if (result === 'skip') skip += 1;
      else fail += 1;

      if (result !== 'fail' && fs.existsSync(dest)) {
        for (const rel of item.relPaths.slice(1)) {
          const aliasDest = path.join(ASSETS_ROOT, ...rel.split('/'));
          fs.mkdirSync(path.dirname(aliasDest), { recursive: true });
          if (!fs.existsSync(aliasDest)) fs.copyFileSync(dest, aliasDest);
        }
      }

      done += 1;
      if (done % 25 === 0 || done === uniqueByUrl.length) {
        console.info(`[wuwa-download] 进度 ${done}/${uniqueByUrl.length} (新增 ${ok}，跳过 ${skip}，失败 ${fail})`);
      }
    },
    CONCURRENCY,
  );

  const { files, urls } = buildMaps(tasks);
  fs.mkdirSync(ASSETS_ROOT, { recursive: true });
  fs.writeFileSync(
    MAP_FILE,
    JSON.stringify(
      {
        version: 1,
        generated_at: new Date().toISOString(),
        stats: { ok, skip, fail, total_urls: uniqueByUrl.length, mapped_files: Object.keys(files).length },
        files,
        urls,
      },
      null,
      2,
    ),
  );

  const distAssets = path.join(ROOT, 'dist/鸣潮/assets');
  if (fs.existsSync(ASSETS_ROOT)) {
    fs.mkdirSync(path.dirname(distAssets), { recursive: true });
    fs.cpSync(ASSETS_ROOT, distAssets, { recursive: true, force: true });
    console.info(`[wuwa-download] 已同步到 ${distAssets}`);
  }

  console.info('[wuwa-download] 完成', { ok, skip, fail, mapped: Object.keys(files).length });
  if (fail > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error('[wuwa-download] 异常', error);
  process.exitCode = 1;
});

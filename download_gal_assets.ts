/* eslint-disable */
// @ts-nocheck
/**
 * 从 catbox 下载全部 GAL 资源到 src/手机角色状态栏/assets/
 * 运行: pnpm download:assets
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT = import.meta.dirname;
const ASSETS_ROOT = path.join(ROOT, 'src/手机角色状态栏/assets');
const MAP_FILE = path.join(ASSETS_ROOT, 'mediaLocalMap.json');
const MEDIA_BASE_URL = 'https://files.catbox.moe/';
const CONCURRENCY = 2;

/** 代理地址：环境变量 GAL_PROXY / HTTPS_PROXY / HTTP_PROXY，默认 127.0.0.1:7897；设 GAL_PROXY=none 禁用 */
function getProxyUrl(): string {
  const raw = process.env.GAL_PROXY ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? 'http://127.0.0.1:7897';
  if (raw === 'none' || raw === 'off') return '';
  if (/^\d+$/.test(raw)) return `http://127.0.0.1:${raw}`;
  return raw.replace(/^https:\/\//, 'http://');
}

async function downloadViaCurl(url: string, destPath: string, proxy: string): Promise<void> {
  const args = ['-L', '--fail', '-m', '120', '-o', destPath];
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

function resolveMediaUrl(file: string): string {
  return `${MEDIA_BASE_URL}${file.replace(/^\//, '')}`;
}

/** 从 TS 源文件中提取 `export const name = { ... }` 的对象字面量并求值 */
function parseExportObject(source: string, exportName: string): Record<string, unknown> {
  const marker = `export const ${exportName}`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`未找到 export const ${exportName}`);

  let i = source.indexOf('=', start + marker.length);
  if (i === -1) throw new Error(`${exportName} 缺少 =`);

  i += 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === ':') {
      i += 1;
      while (i < source.length && source[i] !== '{' && source[i] !== '=') i += 1;
      continue;
    }
    break;
  }

  if (source[i] !== '{') throw new Error(`${exportName} 不是对象字面量`);

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

  throw new Error(`${exportName} 对象字面量未闭合`);
}

function loadAssetConfig() {
  const configSource = fs.readFileSync(path.join(ROOT, 'src/手机角色状态栏/config.ts'), 'utf8');
  const mapSource = fs.readFileSync(path.join(ROOT, 'src/手机角色状态栏/mapAreaScenes.ts'), 'utf8');

  return {
    CG_LIST: parseExportObject(configSource, 'CG_LIST') as Record<string, Record<string, string>>,
    EXPRESSION_LIST: parseExportObject(configSource, 'EXPRESSION_LIST') as Record<string, Record<string, string>>,
    NPC_AVATAR_URLS: parseExportObject(configSource, 'NPC_AVATAR_URLS') as Record<string, string>,
    MAP_AREA_FILES: parseExportObject(mapSource, 'MAP_AREA_FILES') as Record<string, string>,
  };
}

function buildTasks(config: ReturnType<typeof loadAssetConfig>) {
  const tasks: { url: string; relPath: string; catboxFile: string }[] = [];
  const pathsByUrl = new Map<string, Set<string>>();

  function addTask(catboxFile: string, relPath: string) {
    const url = resolveMediaUrl(catboxFile);
    tasks.push({ url, relPath, catboxFile });
    if (!pathsByUrl.has(url)) pathsByUrl.set(url, new Set());
    pathsByUrl.get(url)!.add(relPath);
  }

  for (const [character, scenes] of Object.entries(config.CG_LIST)) {
    for (const [scene, file] of Object.entries(scenes)) {
      if (!file) continue;
      addTask(file, path.posix.join('cg', safeSegment(character), `${safeSegment(scene)}${extname(file)}`));
    }
  }

  for (const [character, expressions] of Object.entries(config.EXPRESSION_LIST)) {
    for (const [expression, file] of Object.entries(expressions)) {
      if (!file) continue;
      addTask(
        file,
        path.posix.join('expressions', safeSegment(character), `${safeSegment(expression)}${extname(file)}`),
      );
    }
  }

  for (const [character, file] of Object.entries(config.NPC_AVATAR_URLS)) {
    if (!file) continue;
    addTask(file, path.posix.join('avatars', `${safeSegment(character)}${extname(file)}`));
  }

  for (const [label, file] of Object.entries(config.MAP_AREA_FILES)) {
    if (!file) continue;
    addTask(file, path.posix.join('map', `${safeSegment(label)}${extname(file)}`));
  }

  const uniqueByUrl = [...pathsByUrl.entries()].map(([url, paths]) => ({
    url,
    relPaths: [...paths],
  }));

  return { tasks, uniqueByUrl };
}

function buildFileMap(tasks: { catboxFile: string; relPath: string }[]): Record<string, string> {
  const fileMap: Record<string, string> = {};
  for (const task of tasks) {
    const dest = path.join(ASSETS_ROOT, ...task.relPath.split('/'));
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      fileMap[task.catboxFile] = task.relPath;
    }
  }
  return fileMap;
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
        const response = await fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(120_000),
        });
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
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        console.warn(`[download] 重试 ${attempt}/${retries} ${url}: ${message}`);
        await new Promise(r => setTimeout(r, 1500 * attempt));
        continue;
      }
      console.warn(`[download] 失败 ${url}: ${message}`);
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
  const proxy = getProxyUrl();
  console.info('[download] 加载配置…');
  console.info(`[download] 代理: ${proxy || '无（直连）'}`);
  const config = loadAssetConfig();
  const { tasks, uniqueByUrl } = buildTasks(config);

  console.info(`[download] 共 ${uniqueByUrl.length} 个唯一 URL，${tasks.length} 个本地路径`);

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
      if (done % 20 === 0 || done === uniqueByUrl.length) {
        console.info(`[download] 进度 ${done}/${uniqueByUrl.length} (新增 ${ok}，跳过 ${skip}，失败 ${fail})`);
      }
    },
    CONCURRENCY,
  );

  const fileMap = buildFileMap(tasks);

  fs.mkdirSync(ASSETS_ROOT, { recursive: true });
  fs.writeFileSync(
    MAP_FILE,
    JSON.stringify(
      {
        version: 1,
        generated_at: new Date().toISOString(),
        stats: { ok, skip, fail, total_urls: uniqueByUrl.length, paths: tasks.length },
        files: fileMap,
      },
      null,
      2,
    ),
  );

  const distAssets = path.join(ROOT, 'dist/手机角色状态栏/assets');
  if (fs.existsSync(ASSETS_ROOT)) {
    fs.mkdirSync(path.dirname(distAssets), { recursive: true });
    fs.cpSync(ASSETS_ROOT, distAssets, { recursive: true, force: true });
    console.info(`[download] 已同步到 ${distAssets}`);
  }

  console.info('[download] 完成', { ok, skip, fail });
  if (fail > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error('[download] 异常', error);
  process.exitCode = 1;
});

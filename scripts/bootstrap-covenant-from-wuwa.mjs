/**
 * 从 src/鸣潮 克隆为 src/契约协议（不含鸣潮贴图/音视频，并重命名 wuwa 标识）
 * 用法: node scripts/bootstrap-covenant-from-wuwa.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src/鸣潮');
const DEST = path.join(ROOT, 'src/契约协议');

const SKIP_DIRS = new Set(['node_modules', '.git', '参考脚本']);
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp',
  '.mp4', '.webm', '.mov', '.ogg', '.mp3', '.wav',
]);

const FILE_RENAMES = [
  ['WuwaShell.vue', 'CovenantShell.vue'],
  ['wuwaShellFullscreen.ts', 'covenantShellFullscreen.ts'],
  ['wuwaShellContext.ts', 'covenantShellContext.ts'],
  ['wuwaParser.ts', 'covenantParser.ts'],
  ['wuwaFullscreenHandoff.ts', 'covenantFullscreenHandoff.ts'],
  ['wuwaConsoleTools.ts', 'covenantConsoleTools.ts'],
  ['wuwaMedia.ts', 'covenantMedia.ts'],
  ['wuwaTavern.ts', 'covenantTavern.ts'],
  ['wuwaBridge.ts', 'covenantBridge.ts'],
  ['packageWuwaDeploy.mjs', 'packageCovenantDeploy.mjs'],
  ['脚本-鸣潮伪同层.json', '脚本-契约协议伪同层.json'],
  ['脚本-鸣潮共享.json', '脚本-契约协议共享.json'],
  ['脚本-鸣潮变量结构.json', '脚本-契约协议变量结构.json'],
  ['脚本-鸣潮手机.json', '脚本-契约协议手机.json'],
  ['脚本-鸣潮开场.json', '脚本-契约协议开场.json'],
  ['鸣潮线上.json', '契约协议线上.json'],
];

/** 顺序敏感：长串优先 */
const TEXT_REPLACEMENTS = [
  ['__WUWA_', '__COVENANT_'],
  ['WuWaShared', 'CovenantShared'],
  ['WuwaShell', 'CovenantShell'],
  ['wuwaShell', 'covenantShell'],
  ['wuwa-pseudo-layer', 'covenant-pseudo-layer'],
  ['wuwa-hub-stream-style', 'covenant-hub-stream-style'],
  ['wuwa-opening', 'covenant-opening'],
  ['wuwaResolveMedia', 'covenantResolveMedia'],
  ['resolveWuwaMediaUrl', 'resolveCovenantMediaUrl'],
  ['resolveWuwaAssetPath', 'resolveCovenantAssetPath'],
  ['resolveWuwaAssetsBase', 'resolveCovenantAssetsBase'],
  ['publishWuwaAssetsBase', 'publishCovenantAssetsBase'],
  ['isWuwaVideoUrl', 'isCovenantVideoUrl'],
  ['registerWuwaRemountHub', 'registerCovenantRemountHub'],
  ['exposeWuwaConsoleTools', 'exposeCovenantConsoleTools'],
  ['ensureWuWaSharedRegistered', 'ensureCovenantSharedRegistered'],
  ['chatHasWuwaGameStarted', 'chatHasCovenantGameStarted'],
  ['shouldAttachWuwaShell', 'shouldAttachCovenantShell'],
  ['WUWA_DEFAULT_CDN_ASSETS_BASE', 'COVENANT_DEFAULT_CDN_ASSETS_BASE'],
  ['WUWA_MEDIA_BASE_URL', 'COVENANT_MEDIA_BASE_URL'],
  ['WUWA_PROJECT_SEGMENT', 'COVENANT_PROJECT_SEGMENT'],
  ['WUWA_PROXY', 'COVENANT_PROXY'],
  ['packageWuwa', 'packageCovenant'],
  ['download_wuwa', 'download_covenant'],
  ['download:wuwa', 'download:covenant'],
  ['build:wuwa', 'build:covenant'],
  ['sync:wuwa', 'sync:covenant'],
  ['reorganize:wuwa', 'reorganize:covenant'],
  ['wuwa_assets', 'covenant_assets'],
  ['wuwa-cdn', 'covenant-cdn'],
  ['WuWa', 'Covenant'],
  ['WUWA', 'COVENANT'],
  ['Wuwa', 'Covenant'],
  ['wuwa', 'covenant'],
  ['鸣潮', '契约协议'],
];

const EMPTY_MEDIA_MAP = {
  version: 1,
  generated_at: new Date().toISOString(),
  stats: { ok: 0, skip: 0, fail: 0, total_urls: 0, mapped_files: 0 },
  files: {},
  urls: {},
};

const EMPTY_CG_INDEX = {
  version: 1,
  generated_at: new Date().toISOString(),
  characters: 0,
  index: {},
};

function shouldCopyFile(relPath, name) {
  const ext = path.extname(name).toLowerCase();
  if (BINARY_EXT.has(ext)) return false;
  if (relPath.startsWith('assets/cg/')) return false;
  if (relPath.startsWith('assets/avatars/')) return false;
  if (relPath.startsWith('assets/expressions/')) return false;
  if (relPath.startsWith('assets/opening/')) return false;
  if (relPath.startsWith('assets/wallpapers/')) return false;
  if (relPath.startsWith('assets/stickers/')) return false;
  if (relPath.startsWith('assets/ui/') && BINARY_EXT.has(ext)) return false;
  if (name === 'mediaLocalMap.json' || name === 'cgSceneIndex.json') return 'json-template';
  if (relPath === '卡/鸣潮线上.json') return false;
  return true;
}

function transformText(content) {
  let out = content;
  for (const [from, to] of TEXT_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

function walkCopy(srcDir, destDir, rel = '') {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (SKIP_DIRS.has(name)) continue;
    const srcPath = path.join(srcDir, name);
    const relPath = rel ? `${rel}/${name}` : name;
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      walkCopy(srcPath, path.join(destDir, name), relPath);
      continue;
    }
    const mode = shouldCopyFile(relPath, name);
    if (mode === false) continue;
    let destPath = path.join(destDir, name);
    if (mode === 'json-template') {
      const json = name === 'mediaLocalMap.json' ? EMPTY_MEDIA_MAP : EMPTY_CG_INDEX;
      fs.writeFileSync(destPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
      continue;
    }
    const raw = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(destPath, transformText(raw), 'utf8');
  }
}

function renameFiles(dir) {
  for (const [from, to] of FILE_RENAMES) {
    const oldPath = path.join(dir, from);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, path.join(dir, path.dirname(from), to));
    }
  }
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory()) renameFiles(path.join(dir, name.name));
  }
}

function renameFilesRecursive(root) {
  const renameInDir = dir => {
    for (const [from, to] of FILE_RENAMES) {
      const oldPath = path.join(dir, from);
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, path.join(dir, to));
      }
    }
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) renameInDir(path.join(dir, ent.name));
    }
  };
  renameInDir(root);
}

function patchCovenantMedia() {
  const file = path.join(DEST, 'shared/covenantMedia.ts');
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(
    /export const COVENANT_MEDIA_BASE_URL = 'https:\/\/files\.catbox\.moe\/';/,
    "export const COVENANT_MEDIA_BASE_URL = '';",
  );
  text = text.replace(
    /export const COVENANT_DEFAULT_CDN_ASSETS_BASE =[\s\S]*?;/,
    "export const COVENANT_DEFAULT_CDN_ASSETS_BASE = '';",
  );
  text = text.replace(
    "if (/^https?:\\/\\//i.test(trimmed)) return trimmed;",
    `if (/^https?:\\/\\//i.test(trimmed)) {
    if (/files\\.catbox\\.moe|ax1x\\.com/i.test(trimmed)) return '';
    return trimmed;
  }`,
  );
  text = text.replace(
    `return \`\${COVENANT_MEDIA_BASE_URL}\${trimmed.replace(/^\\/+/, '')}\`;`,
    'return trimmed.startsWith(\'ui/\') || trimmed.startsWith(\'cg/\') ? (toLocalUrl(trimmed) ?? \'\') : \'\';',
  );
  fs.writeFileSync(file, text, 'utf8');
}

function patchConstants() {
  const file = path.join(DEST, '脚本/伪同层/constants.ts');
  if (!fs.existsSync(file)) return;
  const text = `export const HUB_FLOOR_ID = 0;

/** 契约协议 UI 资源：请放入 src/契约协议/assets/ui/ 并在 mediaLocalMap.json 中映射 */
export const XIAO_AI_ICON_URL = 'ui/xiao-ai-icon.png';
export const WAVE_URL = 'ui/wave.png';
export const DUCK_HEADER_URL = 'ui/duck-header.png';
export const DUCK_A_URL = 'ui/duck-a.png';
export const DUCK_B_URL = 'ui/duck-b.png';
`;
  fs.writeFileSync(file, text, 'utf8');
}

function writeAssetsReadme() {
  const readme = `# 契约协议本地资源目录

本项目**不使用鸣潮贴图**。请自行准备资源并放入对应目录，或在 \`mediaLocalMap.json\` 中映射。

## 目录结构

\`\`\`
assets/
  cg/{角色名}/{场景名}.mp4|.png
  avatars/{角色名}.png
  expressions/{角色名}/{表情}.png
  wallpapers/
  stickers/
  ui/                    # 鸭标签、小爱图标、浪潮装饰
  ui/apps/               # 手机桌面图标
  opening/               # 开场界面
  mediaLocalMap.json
  cgSceneIndex.json
\`\`\`

构建时复制到 \`dist/契约协议/assets/\`。
`;
  fs.writeFileSync(path.join(DEST, 'assets/README.md'), readme, 'utf8');
  fs.mkdirSync(path.join(DEST, 'assets/ui/apps'), { recursive: true });
  fs.mkdirSync(path.join(DEST, 'assets/opening'), { recursive: true });
}

function writeImportJson() {
  const dir = path.join(DEST, '导入到酒馆中');
  const ids = {
    '脚本-契约协议共享.json': 'e1f2a3b4-c5d6-7890-abcd-111122223333',
    '脚本-契约协议变量结构.json': 'e2f3a4b5-c6d7-8901-bcde-222233334444',
    '脚本-契约协议伪同层.json': 'e3f4a5b6-c7d8-9012-cdef-333344445555',
    '脚本-契约协议手机.json': 'e4f5a6b7-c8d9-0123-def0-444455556666',
    '脚本-契约协议开场.json': 'e5f6a7b8-c9d0-1234-ef01-555566667777',
  };
  for (const [file, id] of Object.entries(ids)) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    data.id = id;
    data.content = data.content.replace(/127\.0\.0\.1:5500\/dist\/契约协议/g, '127.0.0.1:5500/dist/契约协议');
    fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('未找到 src/鸣潮');
    process.exit(1);
  }
  if (fs.existsSync(DEST)) {
    console.error('目标已存在: src/契约协议 — 请先删除或备份后再运行');
    process.exit(1);
  }
  console.info('克隆 鸣潮 → 契约协议（跳过贴图/音视频）…');
  walkCopy(SRC, DEST);
  renameFilesRecursive(DEST);
  patchCovenantMedia();
  patchConstants();
  writeAssetsReadme();
  writeImportJson();
  console.info('完成: src/契约协议');
}

main();

#!/usr/bin/env node
/**
 * 打包鸣潮前端/脚本为可独立部署目录（供 GitHub + jsDelivr 托管）
 *
 * 用法:
 *   node src/鸣潮/工具/packageWuwaDeploy.mjs
 *   node src/鸣潮/工具/packageWuwaDeploy.mjs --cdn-base=https://cdn.jsdelivr.net/gh/user/repo@main
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const distSrc = path.join(root, 'dist/鸣潮');
const importSrc = path.join(root, 'src/鸣潮/导入到酒馆中');
const outDir = path.join(root, 'release/wuwa-cdn');

const args = process.argv.slice(2);
const cdnArg = args.find(a => a.startsWith('--cdn-base='));
const skipBuild = args.includes('--skip-build');
const withAssets = args.includes('--with-assets');
const noClean = args.includes('--no-clean');
// 仓库名是 `-`，必须用 @main 分支语法，不能写 /-/main（jsDelivr 会 404）
const CDN_BASE = (cdnArg?.split('=')[1] ?? 'https://cdn.jsdelivr.net/gh/daofengpianlen/-@main').replace(/\/$/, '');

const SCRIPT_ENTRIES = [
  { json: '脚本-鸣潮共享.json', dist: '脚本/共享/index.js' },
  { json: '脚本-鸣潮变量结构.json', dist: '脚本/变量结构/index.js' },
  { json: '脚本-鸣潮开场.json', dist: '脚本/开场/index.js' },
  { json: '脚本-鸣潮伪同层.json', dist: '脚本/伪同层/index.js' },
  { json: '脚本-鸣潮手机.json', dist: '脚本/手机/index.js' },
];

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

/** 删除 dest 后完整复制 src，保证与 dist 一致（避免 --no-clean 残留旧文件） */
function mirrorDir(src, dest) {
  if (!fs.existsSync(src)) {
    rmrf(dest);
    return;
  }
  if (process.platform === 'win32') {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const r = spawnSync('robocopy', [src, dest, '/MIR', '/R:3', '/W:2', '/NFL', '/NDL', '/NJH', '/NJS'], {
      stdio: 'inherit',
      shell: true,
    });
    // robocopy: 0-7 为成功（含复制/删除差异）
    if (r.status !== null && r.status > 7) {
      console.error(`[wuwa-deploy] robocopy 失败: ${src} -> ${dest}, code=${r.status}`);
      process.exit(r.status ?? 1);
    }
    return;
  }
  rmrf(dest);
  copyDir(src, dest);
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) n += countFiles(p);
    else n += 1;
  }
  return n;
}

function scriptImportUrl(distRel) {
  return `${CDN_BASE}/dist/鸣潮/${distRel.split('/').map(encodeURIComponent).join('/')}`;
}

function writeGitLfsAttributes(outDir) {
  const patterns = [
    'dist/鸣潮/assets/**/*.mp4',
    'dist/鸣潮/assets/**/*.webm',
    'dist/鸣潮/assets/**/*.mov',
    'dist/鸣潮/assets/**/*.png',
    'dist/鸣潮/assets/**/*.jpg',
    'dist/鸣潮/assets/**/*.jpeg',
    'dist/鸣潮/assets/**/*.gif',
    'dist/鸣潮/assets/**/*.webp',
    'dist/鸣潮/assets/**/*.avif',
  ];
  const body = `${patterns.map(p => `${p} filter=lfs diff=lfs merge=lfs -text`).join('\n')}\n`;
  fs.writeFileSync(path.join(outDir, '.gitattributes'), body, 'utf8');
}

function main() {
  if (!skipBuild) {
    console.info('[wuwa-deploy] 构建 production…');
    const build = spawnSync('pnpm', ['build'], { cwd: root, stdio: 'inherit', shell: true });
    if (build.status !== 0) process.exit(build.status ?? 1);
  } else {
    console.info('[wuwa-deploy] 跳过构建，使用现有 dist/鸣潮');
  }

  if (!fs.existsSync(distSrc)) {
    console.error('[wuwa-deploy] 未找到 dist/鸣潮，请先 pnpm build');
    process.exit(1);
  }

  if (!noClean) {
    rmrf(outDir);
    fs.mkdirSync(outDir, { recursive: true });
  } else if (!fs.existsSync(outDir)) {
    console.error('[wuwa-deploy] --no-clean 但 release 目录不存在');
    process.exit(1);
  }

  const distOut = path.join(outDir, 'dist/鸣潮');

  // 脚本：始终与 dist 镜像一致
  console.info('[wuwa-deploy] 镜像 脚本/ …');
  mirrorDir(path.join(distSrc, '脚本'), path.join(distOut, '脚本'));

  const assetsOut = path.join(distOut, 'assets');
  if (withAssets) {
    console.info('[wuwa-deploy] 镜像 assets/（含 cg，供 Git LFS）…');
    mirrorDir(path.join(distSrc, 'assets'), assetsOut);
    writeGitLfsAttributes(outDir);
  } else {
    fs.mkdirSync(assetsOut, { recursive: true });
    for (const name of ['cgSceneIndex.json', 'mediaLocalMap.json', 'README.md']) {
      const src = path.join(distSrc, 'assets', name);
      if (fs.existsSync(src)) copyFile(src, path.join(assetsOut, name));
    }
  }

  const srcScriptN = countFiles(path.join(distSrc, '脚本'));
  const outScriptN = countFiles(path.join(distOut, '脚本'));
  const srcAssetN = countFiles(path.join(distSrc, 'assets'));
  const outAssetN = countFiles(path.join(distOut, 'assets'));
  if (srcScriptN !== outScriptN) {
    console.error(`[wuwa-deploy] 脚本文件数不一致: dist=${srcScriptN} release=${outScriptN}`);
    process.exit(1);
  }
  if (withAssets && srcAssetN !== outAssetN) {
    console.error(`[wuwa-deploy] assets 文件数不一致: dist=${srcAssetN} release=${outAssetN}`);
    process.exit(1);
  }
  console.info(`[wuwa-deploy] 校验通过: 脚本 ${outScriptN} 个, assets ${outAssetN} 个`);

  // 酒馆导入用 JSON（CDN import URL）
  const importOut = path.join(outDir, '导入到酒馆中');
  fs.mkdirSync(importOut, { recursive: true });
  for (const { json, dist } of SCRIPT_ENTRIES) {
    const srcJson = path.join(importSrc, json);
    if (!fs.existsSync(srcJson)) continue;
    const data = JSON.parse(fs.readFileSync(srcJson, 'utf8'));
    data.content = `import '${scriptImportUrl(dist)}'`;
    data.info = `${data.info ?? ''} [CDN: ${CDN_BASE}]`.trim();
    fs.writeFileSync(path.join(importOut, json), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  const readme = `# 鸣潮 · 伪同层前端（CDN 部署）

本仓库为 **SillyTavern + 酒馆助手** 用的鸣潮 GAL 伪同层脚本，托管于 jsDelivr，**无需本地 \`pnpm serve:dist\`**。

## CDN 根地址

\`\`\`
${CDN_BASE}
\`\`\`

## 导入酒馆

在角色卡 → 脚本 → 导入以下 JSON（见 \`导入到酒馆中/\`）：

| 脚本 | 说明 |
|------|------|
| 鸣潮共享 | STORY_MAP / 剧情逻辑 |
| 鸣潮变量结构 | MVU schema |
| 鸣潮开场 | 第 0 楼开场面板 |
| **鸣潮伪同层** | GAL 主界面 + 小爱手机 |

也可直接在脚本内容里写：

\`\`\`javascript
import '${scriptImportUrl('脚本/伪同层/index.js')}'
\`\`\`

## CG / 本地资源

- 本仓库 **CG/多媒体** 使用 **Git LFS**（约 2GB）；脚本从 jsDelivr 加载时，资源自动走 \`media.githubusercontent.com\`。
- 未上传 LFS 资源时，CG 会回退到 **catbox**（见 \`mediaLocalMap.json\`）。

### Git LFS 上传

\`\`\`bash
# 在模板项目内（保留 release/wuwa-cdn 已有 .git；会镜像 dist，删除 release 中多余旧文件）
node src/鸣潮/工具/packageWuwaDeploy.mjs --with-assets --no-clean
cd release/wuwa-cdn
git lfs install
git add -A
git commit -m "add CG assets via Git LFS"
git -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 push
\`\`\`

## 开发

源码在 [tavern_helper_template](https://github.com/) 项目的 \`src/鸣潮/\`。修改后在本仓库根目录执行：

\`\`\`bash
# 在模板项目内
node src/鸣潮/工具/packageWuwaDeploy.mjs --cdn-base=${CDN_BASE}
\`\`\`

然后提交 \`release/wuwa-cdn\` 目录内容到本仓库 \`main\` 分支。

## 伪同层显示

- iframe 固定挂在 **第 0 楼**；有 \`<gal>\` 后内容读最新 gal 楼。
- 控制台：\`__WUWA_DEBUG_HUB__()\`、\`__WUWA_REMOUNT_HUB__()\`
`;

  fs.writeFileSync(path.join(outDir, 'README.md'), readme, 'utf8');

  fs.writeFileSync(
    path.join(outDir, '.gitignore'),
    `# 可选：本地打包缓存\n.DS_Store\nThumbs.db\n`,
    'utf8',
  );

  console.info(`[wuwa-deploy] 已输出 → ${outDir}`);
  console.info(`[wuwa-deploy] CDN 示例: ${scriptImportUrl('脚本/伪同层/index.js')}`);
}

main();

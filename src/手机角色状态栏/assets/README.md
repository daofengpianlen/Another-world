# GAL 本地资源目录

由 `pnpm download:assets` 从 catbox 自动下载生成（按角色/场景分文件夹，无需手动搬运）。

## 一键下载

在项目根目录执行：

```bash
pnpm download:assets
```

脚本会从 `config.ts`、`mapAreaScenes.ts` 读取全部短文件名，下载到本目录，并更新 `mediaLocalMap.json`（**仅包含实际下载成功的文件**）。已存在的文件会跳过，可反复运行补全失败项。

若网络无法访问 `files.catbox.moe`，需开启代理。脚本默认走 `http://127.0.0.1:7897`（Clash 等常见端口），也可自行设置：

```powershell
$env:GAL_PROXY="http://127.0.0.1:7897"   # 或 GAL_PROXY=7897
pnpm download:assets
```

设 `GAL_PROXY=none` 可改为直连（不翻墙时通常不可用）。

## 目录结构

```
assets/
  cg/{角色名}/{场景名}.mp4|.png
  expressions/{角色名}/{表情名}.png
  avatars/{角色名}.png
  map/{地点名}.png
  mediaLocalMap.json
```

构建时会复制到 `dist/手机角色状态栏/assets/`。映射非空时，`resolveMediaUrl` 优先读本地，可不再启用「资源预加载」脚本。

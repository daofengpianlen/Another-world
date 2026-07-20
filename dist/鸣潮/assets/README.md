# 鸣潮本地资源目录

由 `pnpm download:wuwa-assets` 从 catbox / ax1x 自动下载，按分类存放。

## 一键下载

```bash
pnpm download:wuwa-assets
```

默认代理 `http://127.0.0.1:7897`，也可：

```powershell
$env:WUWA_PROXY="7897"
pnpm download:wuwa-assets
```

设 `WUWA_PROXY=none` 为直连。

## 目录结构

```
assets/
  "cg/{角色名}/{场景名}.mp4|.png|.webp
  多形态角色: cg/{角色名（形态）}/{场景名}.mp4  例: cg/爱莉希雅（女神）/手交.mp4"
  avatars/{角色名}.png
  wallpapers/{分类}/{文件名}.avif
  stickers/abu/{表情名}.png
  ui/                    # 鸭标签、小爱图标、浪潮装饰
  ui/apps/               # 手机桌面图标（messages / gallery / forum / friends / wallpaper / settings + tide-status / tide-story / worldbook）
  opening/               # 开场界面
  mediaLocalMap.json
```

构建时复制到 `dist/鸣潮/assets/`。有映射时 `resolveWuwaMediaUrl` 优先读本地。

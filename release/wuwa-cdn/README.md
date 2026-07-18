# 鸣潮 · 伪同层前端（CDN 部署）

本仓库为 **SillyTavern + 酒馆助手** 用的鸣潮 GAL 伪同层脚本，托管于 jsDelivr，**无需本地 `pnpm serve:dist`**。

## CDN 根地址

```
https://cdn.jsdelivr.net/gh/daofengpianlen/-@main
```

## 导入酒馆

在角色卡 → 脚本 → 导入以下 JSON（见 `导入到酒馆中/`）：

| 脚本 | 说明 |
|------|------|
| 鸣潮共享 | STORY_MAP / 剧情逻辑 |
| 鸣潮变量结构 | MVU schema |
| 鸣潮开场 | 第 0 楼开场面板 |
| **鸣潮伪同层** | GAL 主界面 + 小爱手机 |

也可直接在脚本内容里写：

```javascript
import 'https://cdn.jsdelivr.net/gh/daofengpianlen/-@main/dist/鸣潮/%E8%84%9A%E6%9C%AC/%E4%BC%AA%E5%90%8C%E5%B1%82/index.js'
```

## CG / 本地资源

- 本仓库 **CG/多媒体** 使用 **Git LFS**（约 2GB）；脚本从 jsDelivr 加载时，资源自动走 `media.githubusercontent.com`。
- 未上传 LFS 资源时，CG 会回退到 **catbox**（见 `mediaLocalMap.json`）。

### Git LFS 上传

```bash
# 在模板项目内（保留 release/wuwa-cdn 已有 .git；会镜像 dist，删除 release 中多余旧文件）
node src/鸣潮/工具/packageWuwaDeploy.mjs --with-assets --no-clean
cd release/wuwa-cdn
git lfs install
git add -A
git commit -m "add CG assets via Git LFS"
git -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 push
```

## 开发

源码在 [tavern_helper_template](https://github.com/) 项目的 `src/鸣潮/`。修改后在本仓库根目录执行：

```bash
# 在模板项目内
node src/鸣潮/工具/packageWuwaDeploy.mjs --cdn-base=https://cdn.jsdelivr.net/gh/daofengpianlen/-@main
```

然后提交 `release/wuwa-cdn` 目录内容到本仓库 `main` 分支。

## 伪同层显示

- iframe 固定挂在 **第 0 楼**；有 `<gal>` 后内容读最新 gal 楼。
- 控制台：`__WUWA_DEBUG_HUB__()`、`__WUWA_REMOUNT_HUB__()`

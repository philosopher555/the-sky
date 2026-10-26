# SKY//LINE - 雨夜空战

可部署到 GitHub Pages 的三维雨夜飞行射击游戏。使用 Three.js 绘制霓虹城市峡谷，单人模式包含 AI 对手；支持金币、涂装商城、比赛结算、触屏操纵，以及基于 PeerJS 的 1v1 房间对战。

## 本地运行

```sh
npm ci
npm run dev
```

## GitHub Pages 部署

1. 将仓库推送到 GitHub，在仓库的 **Settings → Pages → Build and deployment** 中将来源设为 **GitHub Actions**。
2. 推送到 `main` 分支后，`.github/workflows/pages.yml` 会自动构建并发布 `dist/`。
3. 1v1 房间通过 PeerJS 公共信令服务连接，双方需要同时在线。该服务不由本项目托管，也不保证可用性。

公共聊天室需要一个 Supabase 项目。在仓库 **Settings → Secrets and variables → Actions → Variables** 添加：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

工作流会在构建时读取这两个变量。未配置时，单人游戏和 1v1 仍可使用，公共聊天室会提示尚未配置。公开频道适合原型体验；正式运营前应添加服务端限流和内容治理。

## 构建与打包

```sh
npm run build
npm run preview
npm run package:zip
```

打包命令生成 `skyline-deploy.zip`，其中包含可直接发布的 `dist/`。如需在压缩包中启用公共聊天室，请在构建前提供上述 `VITE_SUPABASE_*` 环境变量。

## 操作

- 鼠标移动转向，鼠标左键开火；`W` / `S` 控制油门，`Shift` 加速，`E` 使用道具，`Esc` 暂停。
- 手机使用左侧虚拟摇杆转向，右侧按钮开火、加速和使用道具。
- 菜单支持方向键选择和 `Enter` 确认。比赛时命中可获得霓虹币，并在机库兑换涂装。

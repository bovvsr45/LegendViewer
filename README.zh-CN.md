# LegendViewer

一款面向个人用户和小型团队的轻量级桌面 VNC 查看器。

基于 **Tauri 2、Rust、React 18、Vite、TypeScript 和 Tailwind CSS** 构建。

**语言：** [한국어](README.md) | [English](README.en.md) | [简体中文](README.zh-CN.md)

---

## 功能特性

- **连接管理：** 添加和编辑 VNC 连接。
- **文件夹导航：** 通过侧边栏树形结构整理连接。
- **网格视图：** 以响应式卡片布局浏览连接目标。
- **VNC 查看器：** 使用 noVNC 渲染实时 RFB 会话。
- **悬停控制栏：** 鼠标悬停在查看器上时显示控制栏。

## 技术栈

| 领域 | 技术 |
| --- | --- |
| 桌面框架 | Tauri 2 |
| 前端 | React 18、Vite、TypeScript |
| 样式 | Tailwind CSS |
| VNC 画面渲染 | `@novnc/novnc` |
| WebSocket 与 TCP 桥接 | Rust、`tokio`、`tokio-tungstenite` |
| 缩略图 RFB 处理 | 自定义 Rust 实现（`rfb.rs`） |
| VNC 身份验证 | `des`、`cipher` |
| 图像处理 | `image` |
| 密码加密 | `aes-gcm` |
| 状态管理 | `zustand` |
| 动画 | `framer-motion` |

## 开发环境

### Windows

所需工具：

- Rust stable toolchain（MSVC）
- Microsoft Visual Studio 2022 Build Tools
- Microsoft Edge WebView2 Runtime
- Node.js LTS 和 npm

使用 PowerShell 安装：

```powershell
winget install --id Rustlang.Rustup -e
rustup default stable-x86_64-pc-windows-msvc

winget install --id Microsoft.VisualStudio.2022.BuildTools -e
winget install --id Microsoft.EdgeWebView2Runtime -e
winget install --id OpenJS.NodeJS.LTS -e
```

### macOS

所需工具：

- Xcode Command Line Tools
- Rust stable toolchain
- Node.js LTS 和 npm

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

## 运行与构建

在项目根目录执行：

```bash
npm install
npm run tauri:dev
```

构建应用程序：

```bash
npm run tauri:build
```

构建 macOS Universal 通用版本：

```bash
npm run tauri:build -- --target universal-apple-darwin
```

以上命令假设 `package.json` 中定义了 `tauri:dev` 和 `tauri:build` 脚本。请以项目实际配置的脚本名称为准。

## GitHub Actions 发布

可以将版本标签推送配置为发布工作流的触发条件。

```bash
git tag v0.1.0
git push origin v0.1.0
```

实际构建和发布行为取决于仓库中的 GitHub Actions 工作流配置。

## 项目结构

```text
LegendViewer/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── novnc.d.ts
│   ├── types/
│   ├── lib/
│   ├── store/
│   │   └── useAppStore.ts
│   ├── hooks/
│   ├── components/
│   └── pages/
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json
    ├── icons/
    └── src/
```

## 界面组成

| 区域 | 说明 |
| --- | --- |
| 顶栏 | 添加连接、进入编辑模式、打开设置 |
| 侧边栏 | 浏览文件夹树 |
| 主网格 | 显示响应式连接卡片 |
| 查看器 | 显示无边框 VNC 画面和悬停控制栏 |

---

**其他语言：** [한국어](README.md) | [English](README.en.md)

# LegendViewer

<div align="right">

| Language |
| :--- |
| **한국어** / [English](#user-content-english) / [中文](#user-content-chinese) |

</div>

LegendViewer는 Tauri 2 (Rust) + React 18 + Vite + TypeScript + TailwindCSS로 제작된 가볍고 빠른 개인/소규모 팀용 VNC 뷰어다.

---

## 1. 개발 환경 (Windows)

```powershell
winget install --id Rustlang.Rustup -e
rustup default stable-x86_64-pc-windows-msvc

winget install --id Microsoft.VisualStudio.2022.BuildTools -e
winget install --id Microsoft.EdgeWebView2Runtime -e
winget install --id OpenJS.NodeJS.LTS -e

```

## 2. 프로젝트 실행

```powershell
cd LegendViwer

npm install
npm run tauri:dev

```

설치 파일 빌드:

```powershell
npm run tauri:build

```

### 2-1. macOS 빌드

**(a) 로컬 빌드 (Mac)**

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf [https://sh.rustup.rs](https://sh.rustup.rs) | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin

npm install
npm run tauri:dev
npm run tauri build -- --target universal-apple-darwin

```

**(b) GitHub Actions**

```powershell
git tag v0.1.0
git push origin v0.1.0

```

---

## 3. 폴더 구조

```
LegendViwer/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tailwind.config.js
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ index.css
│  ├─ novnc.d.ts
│  ├─ types/index.ts
│  ├─ lib/
│  ├─ store/useAppStore.ts
│  ├─ hooks/
│  ├─ components/
│  └─ pages/
└─ src-tauri/
   ├─ Cargo.toml
   ├─ tauri.conf.json
   ├─ capabilities/default.json
   ├─ icons/
   └─ src/

```

---

## 4. 아키텍처

| 용도 | 기술 선택 |
| --- | --- |
| 실시간 RFB 렌더링 | `@novnc/novnc` |
| WS <-> TCP 브리지 | `tokio` + `tokio-tungstenite` |
| 썸네일 RFB | 커스텀 구현 (`rfb.rs`) |
| VNC Auth DES | `des` + `cipher` |
| 이미지 축소/인코딩 | `image` |
| 비밀번호 암호화 | `aes-gcm` |
| 상태 관리 | `zustand` |
| 애니메이션 | `framer-motion` |

---

## 5. 주요 UI 동작

* **상단 바**: 커넥션 추가, 수정 모드, 설정
* **사이드바**: 폴더 트리
* **그리드**: 반응형 카드 그리드
* **뷰어**: 보더리스 VNC 화면 및 호버 컨트롤 바

---

# LegendViewer (English)

| Language |
| --- |
| [한국어](https://www.google.com/search?q=%23user-content-legendviewer) / **English** / [中文](https://www.google.com/search?q=%23user-content-chinese) |

LegendViewer is a lightweight and fast personal/small-team VNC viewer built with Tauri 2 (Rust), React 18, Vite, TypeScript, and TailwindCSS.

---

## 1. Development Environment (Windows)

```powershell
winget install --id Rustlang.Rustup -e
rustup default stable-x86_64-pc-windows-msvc

winget install --id Microsoft.VisualStudio.2022.BuildTools -e
winget install --id Microsoft.EdgeWebView2Runtime -e
winget install --id OpenJS.NodeJS.LTS -e

```

## 2. Running the Project

```powershell
cd LegendViwer

npm install
npm run tauri:dev

```

Building the installer:

```powershell
npm run tauri:build

```

### 2-1. macOS Build

**(a) Local Build (Mac)**

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf [https://sh.rustup.rs](https://sh.rustup.rs) | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin

npm install
npm run tauri:dev
npm run tauri build -- --target universal-apple-darwin

```

**(b) GitHub Actions**

```powershell
git tag v0.1.0
git push origin v0.1.0

```

---

## 3. Directory Structure

```
LegendViwer/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tailwind.config.js
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ index.css
│  ├─ novnc.d.ts
│  ├─ types/index.ts
│  ├─ lib/
│  ├─ store/useAppStore.ts
│  ├─ hooks/
│  ├─ components/
│  └─ pages/
└─ src-tauri/
   ├─ Cargo.toml
   ├─ tauri.conf.json
   ├─ capabilities/default.json
   ├─ icons/
   └─ src/

```

---

## 4. Architecture

| Purpose | Choice |
| --- | --- |
| Live RFB Rendering | `@novnc/novnc` |
| WS <-> TCP Bridge | `tokio` + `tokio-tungstenite` |
| Thumbnail RFB | Custom implementation (`rfb.rs`) |
| VNC Auth DES | `des` + `cipher` |
| Image Resize/Encode | `image` |
| Password Encryption | `aes-gcm` |
| State Management | `zustand` |
| Animations | `framer-motion` |

---

## 5. Main UI Operations

* **Top Bar**: Add connection, edit mode, settings
* **Sidebar**: Folder tree
* **Grid**: Responsive card grid
* **Viewer**: Borderless VNC screen + hover control bar

---

# LegendViewer (中文)

| Language |
| --- |
| [한국어](https://www.google.com/search?q=%23user-content-legendviewer) / [English](https://www.google.com/search?q=%23user-content-english) / **中文** |

LegendViewer 是一个轻量级且高效的个人/小型团队 VNC 查看器，基于 Tauri 2 (Rust) + React 18 + Vite + TypeScript + TailwindCSS 构建。

---

## 1. 开发环境 (Windows)

```powershell
winget install --id Rustlang.Rustup -e
rustup default stable-x86_64-pc-windows-msvc

winget install --id Microsoft.VisualStudio.2022.BuildTools -e
winget install --id Microsoft.EdgeWebView2Runtime -e
winget install --id OpenJS.NodeJS.LTS -e

```

## 2. 运行项目

```powershell
cd LegendViwer

npm install
npm run tauri:dev

```

打包安装程序:

```powershell
npm run tauri:build

```

### 2-1. macOS 构建

**(a) 本地构建 (Mac)**

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf [https://sh.rustup.rs](https://sh.rustup.rs) | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin

npm install
npm run tauri:dev
npm run tauri build -- --target universal-apple-darwin

```

**(b) GitHub Actions**

```powershell
git tag v0.1.0
git push origin v0.1.0

```

---

## 3. 目录结构

```
LegendViwer/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tailwind.config.js
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ index.css
│  ├─ novnc.d.ts
│  ├─ types/index.ts
│  ├─ lib/
│  ├─ store/useAppStore.ts
│  ├─ hooks/
│  ├─ components/
│  └─ pages/
└─ src-tauri/
   ├─ Cargo.toml
   ├─ tauri.conf.json
   ├─ capabilities/default.json
   ├─ icons/
   └─ src/

```

---

## 4. 架构

| 用途 | 技术选择 |
| --- | --- |
| 实时 RFB 渲染 | `@novnc/novnc` |
| WS <-> TCP 网桥 | `tokio` + `tokio-tungstenite` |
| 缩略图 RFB | 自定义实现 (`rfb.rs`) |
| VNC Auth DES | `des` + `cipher` |
| 图像缩放/编码 | `image` |
| 密码加密 | `aes-gcm` |
| 状态管理 | `zustand` |
| 动画 | `framer-motion` |

---

## 5. 主要 UI 操作

* **顶栏**: 添加连接、编辑模式、设置
* **侧边栏**: 文件夹树
* **网格**: 响应式卡片网格
* **查看器**: 无边框 VNC 屏幕 + 悬停控制栏

```
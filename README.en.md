# LegendViewer

A lightweight desktop VNC viewer for personal use and small teams.

Built with **Tauri 2, Rust, React 18, Vite, TypeScript, and Tailwind CSS**.

**Language:** [한국어](README.md) | [English](README.en.md) | [简体中文](README.zh-CN.md)

---

## Features

- **Connection management:** Add and edit VNC connections.
- **Folder navigation:** Organize connection entries in a sidebar tree.
- **Grid view:** Browse connection targets in a responsive card layout.
- **VNC viewer:** Render live RFB sessions using noVNC.
- **Hover controls:** Show the viewer control bar when the pointer is over the viewer.

## Tech Stack

| Area | Technology |
| --- | --- |
| Desktop framework | Tauri 2 |
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS |
| VNC rendering | `@novnc/novnc` |
| WebSocket and TCP bridge | Rust, `tokio`, `tokio-tungstenite` |
| Thumbnail RFB handling | Custom Rust implementation (`rfb.rs`) |
| VNC authentication | `des`, `cipher` |
| Image processing | `image` |
| Password encryption | `aes-gcm` |
| State management | `zustand` |
| Animation | `framer-motion` |

## Development Requirements

### Windows

Required tools:

- Rust stable toolchain (MSVC)
- Microsoft Visual Studio 2022 Build Tools
- Microsoft Edge WebView2 Runtime
- Node.js LTS and npm

Install with PowerShell:

```powershell
winget install --id Rustlang.Rustup -e
rustup default stable-x86_64-pc-windows-msvc

winget install --id Microsoft.VisualStudio.2022.BuildTools -e
winget install --id Microsoft.EdgeWebView2Runtime -e
winget install --id OpenJS.NodeJS.LTS -e
```

### macOS

Required tools:

- Xcode Command Line Tools
- Rust stable toolchain
- Node.js LTS and npm

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

## Run and Build

Run these commands from the project root:

```bash
npm install
npm run tauri:dev
```

Build the application:

```bash
npm run tauri:build
```

Build a macOS Universal application:

```bash
npm run tauri:build -- --target universal-apple-darwin
```

These commands assume that `tauri:dev` and `tauri:build` scripts are defined in `package.json`. Use the script names configured in the project.

## GitHub Actions Release

A release workflow can be configured to run when a version tag is pushed.

```bash
git tag v0.1.0
git push origin v0.1.0
```

The actual build and release behavior depends on the GitHub Actions workflows configured in the repository.

## Project Structure

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

## UI Overview

| Area | Description |
| --- | --- |
| Top bar | Add connections, enter edit mode, and open settings |
| Sidebar | Browse the folder tree |
| Main grid | Display responsive connection cards |
| Viewer | Display a borderless VNC screen with a hover control bar |

---

**Other languages:** [한국어](README.md) | [简体中文](README.zh-CN.md)

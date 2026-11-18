# LegendViewer

가볍고 빠른 개인 및 소규모 팀용 데스크톱 VNC 뷰어입니다.

**Tauri 2, Rust, React 18, Vite, TypeScript, Tailwind CSS**를 기반으로 제작되었습니다.

**언어 선택:** [한국어](README.md) | [English](README.en.md) | [简体中文](README.zh-CN.md)

---

## 주요 기능

- **연결 관리:** VNC 연결 추가 및 수정
- **폴더 탐색:** 사이드바의 폴더 트리로 연결 항목 정리
- **그리드 보기:** 반응형 카드 레이아웃으로 연결 대상 표시
- **VNC 뷰어:** noVNC 기반 실시간 RFB 화면 렌더링
- **호버 컨트롤:** 뷰어 화면에 마우스를 올리면 제어 바 표시

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 데스크톱 프레임워크 | Tauri 2 |
| 프런트엔드 | React 18, Vite, TypeScript |
| 스타일링 | Tailwind CSS |
| VNC 화면 렌더링 | `@novnc/novnc` |
| WebSocket과 TCP 브리지 | Rust, `tokio`, `tokio-tungstenite` |
| 썸네일 RFB 처리 | Rust 커스텀 구현 (`rfb.rs`) |
| VNC 인증 | `des`, `cipher` |
| 이미지 처리 | `image` |
| 비밀번호 암호화 | `aes-gcm` |
| 상태 관리 | `zustand` |
| 애니메이션 | `framer-motion` |

## 개발 환경

### Windows

필요한 도구:

- Rust stable toolchain (MSVC)
- Microsoft Visual Studio 2022 Build Tools
- Microsoft Edge WebView2 Runtime
- Node.js LTS 및 npm

PowerShell에서 설치:

```powershell
winget install --id Rustlang.Rustup -e
rustup default stable-x86_64-pc-windows-msvc

winget install --id Microsoft.VisualStudio.2022.BuildTools -e
winget install --id Microsoft.EdgeWebView2Runtime -e
winget install --id OpenJS.NodeJS.LTS -e
```

### macOS

필요한 도구:

- Xcode Command Line Tools
- Rust stable toolchain
- Node.js LTS 및 npm

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

## 실행 및 빌드

프로젝트 루트 디렉터리에서 실행합니다.

```bash
npm install
npm run tauri:dev
```

배포용 앱 빌드:

```bash
npm run tauri:build
```

macOS Universal 빌드:

```bash
npm run tauri:build -- --target universal-apple-darwin
```

위 명령은 `package.json`에 `tauri:dev` 및 `tauri:build` 스크립트가 정의되어 있다는 전제입니다. 실제 스크립트 이름은 프로젝트 설정과 일치해야 합니다.

## GitHub Actions 릴리스

버전 태그를 푸시하는 방식으로 릴리스 워크플로를 실행하도록 구성할 수 있습니다.

```bash
git tag v0.1.0
git push origin v0.1.0
```

실제 빌드 및 릴리스 동작은 저장소의 GitHub Actions 워크플로 설정에 따라 달라집니다.

## 프로젝트 구조

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

## UI 구성

| 영역 | 역할 |
| --- | --- |
| 상단 바 | 연결 추가, 수정 모드, 설정 진입 |
| 사이드바 | 폴더 트리 탐색 |
| 메인 그리드 | 반응형 연결 카드 표시 |
| 뷰어 | 테두리 없는 VNC 화면 및 호버 컨트롤 바 표시 |

---

**다른 언어:** [English](README.en.md) | [简体中文](README.zh-CN.md)

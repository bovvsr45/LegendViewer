# LegendViewer

가볍고 빠른 개인/소규모 팀용 VNC 뷰어. Tauri 2 (Rust) + React 18 + Vite + TypeScript + TailwindCSS.

릴리스 바이너리는 약 8~12 MB, 유휴 시 메모리 점유는 60 MB 내외를 목표로 한다 (Electron 대비 약 1/5).

---

## 1. 개발 환경 준비 (Windows)

한 번만 설치하면 되는 항목:

```powershell
# 1) Rust 툴체인 (MSVC ABI)
winget install --id Rustlang.Rustup -e
rustup default stable-x86_64-pc-windows-msvc

# 2) C++ 빌드 도구 (MSVC linker) - Visual Studio Build Tools
winget install --id Microsoft.VisualStudio.2022.BuildTools -e

# 3) WebView2 런타임 (Win11 기본 탑재, Win10은 필요할 수 있음)
winget install --id Microsoft.EdgeWebView2Runtime -e

# 4) Node.js LTS
winget install --id OpenJS.NodeJS.LTS -e
```

Visual Studio Build Tools 설치 시 **"C++를 사용한 데스크톱 개발"** 워크로드를 반드시 체크한다.

## 2. 프로젝트 실행

```powershell
cd C:\Users\beake\OneDrive\Desktop\LegendViwer

npm install          # 프론트엔드 의존성
npm run tauri:dev    # 개발 모드 (첫 실행은 Rust 컴파일로 3~5분 소요)
```

설치 파일 빌드:

```powershell
npm run tauri:build
# 결과물:
#   src-tauri\target\release\bundle\nsis\LegendViewer_0.1.0_x64-setup.exe
#   src-tauri\target\release\bundle\msi\LegendViewer_0.1.0_x64_en-US.msi
```

## 2-1. macOS 빌드

**Windows에서 macOS 앱을 크로스 컴파일할 수는 없다.** macOS SDK와 `codesign`이 필요해서 Apple 하드웨어
(또는 macOS 러너)에서 빌드해야 한다. 두 가지 방법이 준비돼 있다.

**(a) Mac이 있는 경우** — 그 Mac에서 저장소를 받고:

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin

npm install
npm run tauri:dev                                   # 개발
npm run tauri build -- --target universal-apple-darwin   # Intel+Apple Silicon 겸용
# 결과물: src-tauri/target/universal-apple-darwin/release/bundle/dmg/LegendViewer_0.1.0_universal.dmg
```

서명 없이 만든 `.dmg`는 처음 열 때 Gatekeeper가 막는다. *우클릭 → 열기* 로 실행하거나,
배포하려면 Apple Developer 계정으로 서명·공증(notarize)해야 한다.

**(b) Mac이 없는 경우 — GitHub Actions** (`.github/workflows/release.yml` 포함돼 있음)

```powershell
git tag v0.1.0
git push origin v0.1.0
```

태그를 올리면 macOS(universal `.dmg`/`.app`) · Windows(`.exe`/`.msi`) · Linux(`.deb`/`.AppImage`)가
한 번에 빌드되어 **Draft Release**로 올라온다. `workflow_dispatch`로 수동 실행도 된다.
GitHub 무료 플랜의 퍼블릭 저장소면 macOS 러너도 무료다.

> `tauri.conf.json`의 `bundle.targets`는 `"all"`이라 각 OS에서 그 OS에 맞는 번들만 자동으로 만든다.
> macOS 아이콘(`icons/icon.icns`)도 이미 생성해 뒀다.

---

## 3. 폴더 구조

```
LegendViwer/
├─ index.html
├─ package.json                 # 프론트 의존성 / tauri CLI
├─ vite.config.ts               # @ -> ./src 별칭, 포트 1420 고정
├─ tailwind.config.js           # 디자인 토큰(HSL CSS 변수) 정의
│
├─ src/                         # ---------- 프론트엔드 ----------
│  ├─ main.tsx
│  ├─ App.tsx                   # Home <-> Viewer 전환, Viewer는 lazy 로드
│  ├─ index.css                 # 라이트/다크 테마 CSS 변수
│  ├─ novnc.d.ts                # noVNC 타입 선언
│  ├─ types/index.ts            # 백엔드와 공유되는 데이터 모델
│  ├─ lib/
│  │  ├─ api.ts                 # invoke() 래퍼 (백엔드 호출 단일 창구)
│  │  └─ utils.ts               # cn() 클래스 병합
│  ├─ store/useAppStore.ts      # zustand 전역 상태
│  ├─ hooks/
│  │  ├─ useThumbnails.ts       # 주기적 미리보기 캡처 스케줄러(동시 2개 제한)
│  │  └─ useTheme.ts            # dark 클래스 토글 (system 추종)
│  ├─ components/
│  │  ├─ ui/                    # shadcn 스타일 프리미티브 (button/input/dialog/select/label)
│  │  ├─ Header.tsx             # 상단 바: + / 연필 / 톱니바퀴
│  │  ├─ FolderTree.tsx         # 좌측 사이드바 폴더 트리 (재귀, 추가/삭제)
│  │  ├─ ConnectionGrid.tsx     # 카드 그리드 + 빈 상태
│  │  ├─ ConnectionCard.tsx     # 썸네일 카드, Edit 모드의 X 버튼
│  │  ├─ ConnectionDialog.tsx   # 커넥션 추가/수정 모달
│  │  ├─ SettingsDialog.tsx     # 설정 모달
│  │  └─ ConfirmDialog.tsx      # "정말 삭제하시겠습니까?" 공통 다이얼로그
│  └─ pages/
│     ├─ Home.tsx               # 메인 화면 조립
│     └─ Viewer.tsx             # 보더리스 VNC 화면 + 호버 컨트롤 바
│
└─ src-tauri/                   # ---------- Rust 백엔드 ----------
   ├─ Cargo.toml
   ├─ tauri.conf.json           # 창 설정, CSP, nsis/msi 번들 타겟
   ├─ capabilities/default.json # 창 권한 (fullscreen 등)
   ├─ icons/
   └─ src/
      ├─ main.rs
      ├─ lib.rs                 # 상태 관리 + 9개 커맨드 + 부트스트랩
      ├─ store.rs               # data.json 영속화 (원자적 저장)
      ├─ crypto.rs              # AES-256-GCM 비밀번호 암호화
      ├─ rfb.rs                 # 썸네일 전용 최소 RFB 클라이언트
      └─ proxy.rs               # WebSocket <-> TCP 브리지
```

---

## 4. 아키텍처

### 왜 Tauri인가

VNC 프로토콜(RFB)은 raw TCP를 쓰는데 WebView는 TCP 소켓을 열 수 없다. Electron이든 Tauri든 네이티브
계층에서 소켓을 열어 렌더러로 중계해야 하는 건 동일하다. 즉 Electron의 이점이 없으므로, 번들 크기와
메모리에서 압도적으로 유리한 Tauri를 선택했다.

### 두 개의 데이터 경로

**(A) 실시간 뷰어 — `proxy.rs` + noVNC**

```
noVNC (WebView) ──WebSocket──> 127.0.0.1:<임의포트> ──TCP──> VNC 서버:5900
                               (Rust 브리지, 바이트 그대로 통과)
```

브리지는 RFB를 **파싱하지 않고 그대로 흘려보낸다.** 덕분에 Tight / ZRLE / TightPNG 등 서버와 noVNC가
합의하는 모든 인코딩이 자동으로 동작하고, Rust 쪽에 프로토콜 구현 부담이 없다.

- 포트는 앱 시작 시 `127.0.0.1:0`에 바인딩해 커널이 할당 (외부 노출 없음)
- 커넥션 클릭 → `open_session`이 **1회용 UUID 토큰** 발급 → `ws://127.0.0.1:{port}/{token}`
- 토큰은 첫 접속에서 소비되어 재사용 불가

**(B) 백그라운드 썸네일 — `rfb.rs`**

`useThumbnails` 훅이 설정된 주기마다 화면에 보이는 카드들의 id를 큐에 넣고 **최대 2개씩** 순차 처리한다.
Rust 측 `capture_thumbnail`은 접속 → 핸드셰이크 → 전체화면 프레임 1장 수신 → 연결 종료 후,
긴 변 480px로 축소한 PNG data URL을 돌려준다.

`rfb.rs`는 의도적으로 **Raw 인코딩만** 지원한다. Raw는 RFB 스펙상 필수라 모든 서버가 지원하며,
30초에 한 번 도는 썸네일 경로에는 압축 코덱을 구현할 이유가 없다. 인증은 Security Type 2(VNC Auth)의
DES 변형(키 바이트 비트 반전)을 직접 구현했다.

**한 장만 받는 것의 함정 — 검은 썸네일**

TightVNC / UltraVNC 등 일부 Windows 서버는 접속 직후 첫 FramebufferUpdateRequest에 대해 **아직 채워지지
않은 프레임버퍼**를 그대로 돌려준다. 뷰어(noVNC)는 업데이트를 계속 요청하니 곧 정상 화면으로 수렴하지만,
한 장만 받고 끊는 캡처는 그 검은 프레임을 그대로 저장하게 된다. 그래서 `capture()`는

1. 응답이 여러 FramebufferUpdate 메시지로 쪼개져 와도 **전체 면적이 채워질 때까지 누적**하고
   (LastRect·CopyRect·커서/포인터 pseudo-encoding 처리 포함),
2. 결과가 **전 픽셀 검은색이면 0.5초 쉬고 다시 요청**한다 (최대 3회),
3. 그래도 검으면 이미지 대신 사유 메시지를 반환한다 — 카드에 검은 사각형 대신 설명이 뜬다.

### 라이브러리 선정

| 용도 | 선택 | 이유 |
|---|---|---|
| 실시간 RFB 렌더링 | `@novnc/novnc` (MPL-2.0) | 사실상의 표준 웹 VNC 구현, 모든 인코딩 지원 |
| WS↔TCP 브리지 | `tokio` + `tokio-tungstenite` | 비동기 I/O, 프로토콜 무관 파이프 |
| 썸네일 RFB | 자체 구현 (`rfb.rs`) | Raw만 필요 — 외부 크레이트보다 가볍고 통제 가능 |
| VNC Auth DES | `des` + `cipher` | 순수 Rust, 시스템 OpenSSL 불필요 |
| 이미지 축소/인코딩 | `image` (png 피처만) | 불필요한 포맷 디코더 제외로 바이너리 축소 |
| 비밀번호 암호화 | `aes-gcm` | AEAD, 무결성 검증 포함 |
| 상태 관리 | `zustand` | Redux 대비 보일러플레이트 없음 |
| 애니메이션 | `framer-motion` | 카드 grid layout 애니메이션 |

### 데이터 저장

`%APPDATA%\kr.kodekorea.legendviewer\` 아래에 두 파일:

- `data.json` — 폴더, 커넥션, 설정 (임시 파일 후 rename하는 원자적 쓰기)
- `key.bin` — 첫 실행 시 생성되는 랜덤 256비트 마스터 키

비밀번호는 `base64(nonce ‖ AES-256-GCM(password))` 형태로만 저장되며, **평문은 프론트엔드로 절대
전달되지 않는다.** 목록 조회 시에는 `hasPassword: boolean`만 내려간다. 복호화는 실제 접속/캡처
시점에 백엔드 안에서만 일어난다.

> 주의: `key.bin`이 같은 디스크에 있으므로 이는 "디스크 유출 시 즉시 노출 방지" 수준의 보호다.
> OS 키체인(Windows Credential Manager) 연동은 `crypto.rs`의 `load_or_create_key`만 교체하면 된다.

---

### macOS 화면 공유(Screen Sharing)에 접속하기

macOS는 보안 타입 목록을 `[30(ARD), ...]` 순으로 내려주고, **noVNC는 서버가 선호하는 순서대로** 지원
가능한 첫 타입을 고른다. 즉 macOS 상대로는 항상 Apple의 **ARD 인증(타입 30)** 이 선택되며, 이건
비밀번호뿐 아니라 **사용자 이름**을 함께 요구한다.

noVNC는 `username`이 `undefined`면 `credentialsrequired` 이벤트를 쏘고 **핸드셰이크를 멈춘 채 대기**한다.
이 이벤트를 듣지 않으면 화면은 "연결 중"에서 영원히 멈춘다 — 느린 게 아니라 응답을 기다리는 중인 것.

그래서 뷰어는

- 저장된 값이 있는 필드만 `credentials`에 넘긴다 (빈 문자열로 넘기면 인증 실패로 직행하므로),
- `credentialsrequired`를 받으면 **부족한 항목만** 화면에서 입력받아 `sendCredentials()`로 이어 보낸다.

커넥션에 `사용자 이름 = macOS 계정명`, `비밀번호 = 계정 암호`를 저장해 두면 다음부터 묻지 않는다.
반대로 썸네일 경로(`rfb.rs`)는 Security Type 2(VNC Auth)만 쓰므로, macOS에서
*시스템 설정 → 일반 → 공유 → 화면 공유 → 컴퓨터 설정 → "VNC 뷰어에서 암호로 화면 제어 가능"* 을
켜 두면 썸네일이 뜬다. 썸네일만 나오고 뷰어가 멈췄다면 딱 이 상태다.

## 5. 주요 화면 동작

- **상단 바** — 새 커넥션(+), 수정 모드(연필/체크 토글), 설정(톱니바퀴)
- **사이드바** — 폴더 트리. `모든 커넥션` 선택 시 전체 표시. 수정 모드에서 폴더 hover 시 휴지통 노출
  - **폴더 우클릭** → 하위 폴더 추가 / 이름 변경 / 폴더 삭제
  - `모든 커넥션` 우클릭 → 최상위에 새 폴더
  - 이름 변경은 인라인 편집 (`Enter` 확정, `Esc` 취소)
- **그리드** — `auto-fill minmax(250px, 1fr)` 반응형. 카드 hover 시 새로고침/편집 버튼
- **수정 모드** — 카드 우측 상단 원형 X → `정말 삭제하시겠습니까?` 다이얼로그
- **뷰어** — 화면 상단 중앙에 마우스를 올리면 컨트롤 바가 슬라이드 다운
  (Ctrl+Alt+Del, 전체화면 토글, 재연결, 연결 끊기). 전체화면이 아닐 때 `Esc`로 나가기

## 6. 다음에 붙이면 좋은 것

- 커넥션 카드 드래그 앤 드롭으로 폴더 이동
- 뷰어 탭/멀티 세션 (현재는 한 번에 하나)
- SSH 터널링 (`russh`로 로컬 포워딩 후 프록시 타겟을 127.0.0.1로 지정)
- 클립보드 동기화 (noVNC의 `clipboard` 이벤트 ↔ Tauri clipboard 플러그인)
- Windows Credential Manager 연동

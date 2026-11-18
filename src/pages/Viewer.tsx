import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import RFB from "@novnc/novnc";
import { Keyboard, Loader2, LogOut, Maximize, Minimize, RotateCw } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Connection, SessionInfo } from "@/types";

type Status = "connecting" | "connected" | "credentials" | "error";

interface Props {
  connection: Connection;
  scaleViewport: boolean;
  onClose: () => void;
}

export default function Viewer({ connection, scaleViewport, onClose }: Props) {
  const screenRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const tokenRef = useRef<string | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);

  const [status, setStatus] = useState<Status>("connecting");
  const [message, setMessage] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [needed, setNeeded] = useState<string[]>([]);
  const [creds, setCreds] = useState({ username: "", password: "" });
  /** Flips on when the handshake drags -- usually a sign of a slow link. */
  const [slow, setSlow] = useState(false);

  const teardown = useCallback(() => {
    rfbRef.current?.disconnect();
    rfbRef.current = null;
    if (tokenRef.current) {
      void api.closeSession(tokenRef.current);
      tokenRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("connecting");
    setMessage("");
    setSlow(false);
    setNeeded([]);
    const slowTimer = window.setTimeout(() => setSlow(true), 6000);

    (async () => {
      try {
        const session = await api.openSession(connection.id);
        if (cancelled || !screenRef.current) return;
        tokenRef.current = session.token;

        sessionRef.current = session;

        // Only hand noVNC the fields we actually have. A field left *undefined*
        // is what makes noVNC raise `credentialsrequired` instead of trying to
        // authenticate with an empty string and failing.
        const credentials: { username?: string; password?: string } = {};
        if (session.username) credentials.username = session.username;
        if (session.password) credentials.password = session.password;

        const rfb = new RFB(
          screenRef.current,
          `ws://127.0.0.1:${session.wsPort}/${session.token}`,
          { credentials, shared: true }
        );
        rfb.viewOnly = session.viewOnly;
        rfb.scaleViewport = scaleViewport;
        rfb.clipViewport = !scaleViewport;
        rfb.focusOnClick = true;
        rfb.background = "#0b0f19";
        rfb.qualityLevel = 7;
        rfb.compressionLevel = 2;

        rfb.addEventListener("connect", () => {
          setStatus("connected");
          rfb.focus();
        });
        // macOS Screen Sharing negotiates Apple's ARD auth, which needs a
        // username as well. Ask for whatever noVNC says is still missing.
        rfb.addEventListener("credentialsrequired", (e: Event) => {
          const types = (e as CustomEvent<{ types: string[] }>).detail?.types ?? ["password"];
          const missing = types.filter(
            (t) =>
              (t === "username" && !session.username) ||
              (t === "password" && !session.password)
          );
          if (missing.length === 0) {
            // Everything it asked for is already on file -- just resend.
            rfb.sendCredentials({
              username: session.username ?? "",
              password: session.password ?? "",
            });
            return;
          }
          setCreds({
            username: session.username ?? "",
            password: session.password ?? "",
          });
          setNeeded(missing);
          setStatus("credentials");
        });
        rfb.addEventListener("disconnect", (e: Event) => {
          const detail = (e as CustomEvent<{ clean: boolean }>).detail;
          if (detail?.clean) {
            onClose();
          } else {
            setStatus("error");
            setMessage("연결이 끊어졌습니다. 호스트와 포트, 방화벽 설정을 확인해 주세요.");
          }
        });
        rfb.addEventListener("securityfailure", (e: Event) => {
          const detail = (e as CustomEvent<{ reason?: string }>).detail;
          setStatus("error");
          setMessage(detail?.reason || "인증에 실패했습니다. 비밀번호를 확인해 주세요.");
        });

        rfbRef.current = rfb;
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(String(e).replace(/^Error:\s*/, ""));
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      teardown();
    };
  }, [connection.id, scaleViewport, attempt, onClose, teardown]);

  // Leave fullscreen behind when the viewer closes.
  useEffect(() => {
    return () => {
      void getCurrentWindow().setFullscreen(false);
    };
  }, []);

  const toggleFullscreen = async () => {
    const win = getCurrentWindow();
    const next = !fullscreen;
    await win.setFullscreen(next);
    setFullscreen(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !fullscreen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f19]">
      {/* hover-reveal control bar */}
      <div className="group absolute inset-x-0 top-0 z-20 flex h-10 justify-center">
        <div className="pointer-events-none absolute inset-0" />
        <div
          className={cn(
            "pointer-events-auto mt-0 flex -translate-y-[110%] items-center gap-1 rounded-b-2xl border border-t-0 border-white/10 bg-black/70 px-2 py-1.5 shadow-2xl backdrop-blur-md transition-transform duration-200",
            "group-hover:translate-y-0 focus-within:translate-y-0"
          )}
        >
          <span className="max-w-[220px] truncate px-2 text-xs font-medium text-white/80">
            {connection.name}
          </span>
          <span className="mx-1 h-4 w-px bg-white/15" />
          <ControlButton
            icon={<Keyboard className="h-4 w-4" />}
            label="Ctrl+Alt+Del"
            onClick={() => rfbRef.current?.sendCtrlAltDel()}
            disabled={status !== "connected"}
          />
          <ControlButton
            icon={fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            label={fullscreen ? "전체화면 해제" : "전체화면"}
            onClick={toggleFullscreen}
          />
          <ControlButton
            icon={<RotateCw className="h-4 w-4" />}
            label="다시 연결"
            onClick={() => {
              teardown();
              setAttempt((a) => a + 1);
            }}
          />
          <ControlButton
            icon={<LogOut className="h-4 w-4" />}
            label="연결 끊기"
            danger
            onClick={onClose}
          />
        </div>
      </div>

      <div ref={screenRef} className="flex-1" />

      {status !== "connected" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0b0f19] text-white/80">
          {status === "connecting" ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="text-sm">
                {connection.host}:{connection.port} 에 연결하는 중…
              </div>
              {slow && (
                <div className="max-w-sm px-6 text-center text-xs leading-relaxed text-white/50">
                  응답이 느립니다. macOS 화면 공유라면 시스템 설정 → 일반 → 공유 → 화면 공유가
                  켜져 있는지, 그리고 커넥션에 macOS 계정명이 입력됐는지 확인해 주세요.
                </div>
              )}
            </>
          ) : status === "credentials" ? (
            <form
              className="flex w-72 flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const stored = sessionRef.current;
                rfbRef.current?.sendCredentials({
                  username: creds.username || stored?.username || "",
                  password: creds.password || stored?.password || "",
                });
                setStatus("connecting");
              }}
            >
              <div className="mb-1 text-center text-sm font-medium">인증 정보가 필요합니다</div>
              {needed.includes("username") && (
                <input
                  autoFocus
                  placeholder="사용자 이름"
                  value={creds.username}
                  onChange={(e) => setCreds((c) => ({ ...c, username: e.target.value }))}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              )}
              {needed.includes("password") && (
                <input
                  type="password"
                  autoFocus={!needed.includes("username")}
                  placeholder="비밀번호"
                  value={creds.password}
                  onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              )}
              <button
                type="submit"
                className="mt-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
              >
                연결
              </button>
              <p className="text-center text-[11px] text-white/40">
                커넥션 편집에서 저장해 두면 다음부터 묻지 않습니다.
              </p>
            </form>
          ) : (
            <>
              <div className="text-sm font-medium text-destructive">연결 실패</div>
              <div className="max-w-md px-6 text-center text-xs text-white/60">{message}</div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    teardown();
                    setAttempt((a) => a + 1);
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  다시 시도
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium"
                >
                  닫기
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ControlButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-30",
        danger && "hover:bg-destructive hover:text-destructive-foreground"
      )}
    >
      {icon}
    </button>
  );
}

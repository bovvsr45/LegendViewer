import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";
import type { Connection } from "@/types";

const ROOT = "__root__";

interface Props {
  open: boolean;
  editing: Connection | null;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionDialog({ open, editing, onOpenChange }: Props) {
  const folders = useAppStore((s) => s.folders);
  const settings = useAppStore((s) => s.settings);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const saveConnection = useAppStore((s) => s.saveConnection);

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(String(settings.defaultPort));
  const [folderId, setFolderId] = useState<string>(ROOT);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setHost(editing?.host ?? "");
    setPort(String(editing?.port ?? settings.defaultPort));
    setFolderId(editing?.folderId ?? selectedFolderId ?? ROOT);
    setUsername(editing?.username ?? "");
    setPassword("");
    setPasswordTouched(false);
    setError("");
  }, [open, editing, settings.defaultPort, selectedFolderId]);

  const submit = async () => {
    if (!name.trim() || !host.trim()) {
      setError("이름과 주소는 필수입니다.");
      return;
    }
    const portNum = Number(port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      setError("포트는 1~65535 사이의 숫자여야 합니다.");
      return;
    }
    setBusy(true);
    try {
      await saveConnection({
        id: editing?.id ?? null,
        name: name.trim(),
        host: host.trim(),
        port: portNum,
        folderId: folderId === ROOT ? null : folderId,
        username: username.trim() || null,
        password: passwordTouched ? password : undefined,
        viewOnly: editing?.viewOnly ?? false,
      });
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy) void submit();
        }}
      >
        <DialogHeader>
          <DialogTitle>{editing ? "커넥션 수정" : "새 커넥션"}</DialogTitle>
          <DialogDescription>
            비밀번호는 이 PC에서만 AES-256-GCM으로 암호화되어 저장됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="사무실 PC"
            />
          </div>

          <div className="grid grid-cols-[1fr,110px] gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="host">호스트 / IP</Label>
              <Input
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.0.10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">포트</Label>
              <Input
                id="port"
                inputMode="numeric"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="username">사용자 이름</Label>
              <Input
                id="username"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="선택 사항"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordTouched(true);
                }}
                placeholder={editing?.hasPassword ? "저장됨 (변경 시 입력)" : "선택 사항"}
              />
            </div>
          </div>
          <p className="-mt-1 text-[11px] leading-relaxed text-muted-foreground">
            macOS 화면 공유에 붙을 때는 <strong>사용자 이름 = macOS 계정명</strong>,{" "}
            <strong>비밀번호 = 계정 암호</strong>를 넣어야 한다 (Apple의 ARD 인증). 일반 VNC
            서버는 사용자 이름을 비워 두면 된다.
          </p>

          <div className="space-y-1.5">
            <Label>폴더</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT}>폴더 없음</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={submit} disabled={busy}>
            {editing ? "저장" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

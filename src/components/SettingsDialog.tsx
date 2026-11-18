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
import type { Settings, Theme } from "@/types";

const INTERVALS = [
  { value: "0", label: "끄기" },
  { value: "10", label: "10초" },
  { value: "30", label: "30초" },
  { value: "60", label: "1분" },
  { value: "300", label: "5분" },
];

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const settings = useAppStore((s) => s.settings);
  const saveSettings = useAppStore((s) => s.saveSettings);
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const patch = (p: Partial<Settings>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
          <DialogDescription>변경 사항은 저장 시 즉시 적용됩니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>테마</Label>
            <Select value={draft.theme} onValueChange={(v) => patch({ theme: v as Theme })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">다크</SelectItem>
                <SelectItem value="light">라이트</SelectItem>
                <SelectItem value="system">시스템 설정</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>썸네일 새로고침 주기</Label>
            <Select
              value={String(draft.thumbnailInterval)}
              onValueChange={(v) => patch({ thumbnailInterval: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              주기가 짧을수록 원격 PC와 네트워크 부하가 커집니다. 커넥션이 많다면 1분 이상을
              권장합니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>기본 VNC 포트</Label>
            <Input
              inputMode="numeric"
              value={String(draft.defaultPort)}
              onChange={(e) => patch({ defaultPort: Number(e.target.value) || 5900 })}
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm">뷰어에서 화면 크기 자동 맞춤</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              checked={draft.scaleViewer}
              onChange={(e) => patch({ scaleViewer: e.target.checked })}
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={async () => {
              await saveSettings(draft);
              onOpenChange(false);
            }}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

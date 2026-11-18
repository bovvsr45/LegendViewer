import { Check, Monitor, Pencil, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

interface Props {
  onAdd: () => void;
  onSettings: () => void;
}

export function Header({ onAdd, onSettings }: Props) {
  const editMode = useAppStore((s) => s.editMode);
  const toggleEditMode = useAppStore((s) => s.toggleEditMode);
  const count = useAppStore((s) => s.connections.length);

  return (
    <header
      data-tauri-drag-region
      className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur"
    >
      <div className="pointer-events-none flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Monitor className="h-4 w-4" />
        </div>
        <div className="leading-none">
          <div className="text-sm font-semibold tracking-tight">LegendViewer</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{count}개의 커넥션</div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button size="sm" onClick={onAdd} className="mr-1 h-8">
          <Plus className="h-4 w-4" />
          새 커넥션
        </Button>
        <Button
          variant={editMode ? "default" : "ghost"}
          size="icon"
          className={cn("h-8 w-8", editMode && "bg-primary/90")}
          onClick={toggleEditMode}
          title={editMode ? "수정 모드 종료" : "수정 모드"}
        >
          {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onSettings}
          title="설정"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

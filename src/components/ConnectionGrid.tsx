import { AnimatePresence } from "framer-motion";
import { MonitorSmartphone, Plus } from "lucide-react";
import { ConnectionCard } from "@/components/ConnectionCard";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import type { Connection } from "@/types";

interface Props {
  connections: Connection[];
  capturingIds: Set<string>;
  onOpen: (c: Connection) => void;
  onEdit: (c: Connection) => void;
  onRequestDelete: (c: Connection) => void;
  onRefresh: (c: Connection) => void;
  onAdd: () => void;
}

export function ConnectionGrid({
  connections,
  capturingIds,
  onOpen,
  onEdit,
  onRequestDelete,
  onRefresh,
  onAdd,
}: Props) {
  const folders = useAppStore((s) => s.folders);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const title =
    selectedFolderId === null
      ? "모든 커넥션"
      : folders.find((f) => f.id === selectedFolderId)?.name ?? "폴더";

  if (connections.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <MonitorSmartphone className="h-7 w-7" />
        </div>
        <div>
          <div className="text-sm font-medium">아직 커넥션이 없습니다</div>
          <div className="mt-1 text-xs text-muted-foreground">
            원격 PC의 주소를 등록하면 여기에 미리보기가 표시됩니다.
          </div>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          커넥션 추가
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <h2 className="mb-4 text-base font-semibold tracking-tight">
        {title}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {connections.length}
        </span>
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
        <AnimatePresence mode="popLayout">
          {connections.map((c) => (
            <ConnectionCard
              key={c.id}
              connection={c}
              capturing={capturingIds.has(c.id)}
              onOpen={onOpen}
              onEdit={onEdit}
              onRequestDelete={onRequestDelete}
              onRefresh={onRefresh}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

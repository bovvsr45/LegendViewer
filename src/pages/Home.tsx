import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { FolderTree } from "@/components/FolderTree";
import { ConnectionGrid } from "@/components/ConnectionGrid";
import { ConnectionDialog } from "@/components/ConnectionDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useThumbnails } from "@/hooks/useThumbnails";
import { useAppStore } from "@/store/useAppStore";
import type { Connection } from "@/types";

export function Home({ onOpenViewer }: { onOpenViewer: (c: Connection) => void }) {
  const connections = useAppStore((s) => s.connections);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const settings = useAppStore((s) => s.settings);
  const removeConnection = useAppStore((s) => s.removeConnection);
  const setEditMode = useAppStore((s) => s.setEditMode);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Connection | null>(null);

  const visible = useMemo(
    () =>
      selectedFolderId === null
        ? connections
        : connections.filter((c) => c.folderId === selectedFolderId),
    [connections, selectedFolderId]
  );

  const { capturingIds, refresh } = useThumbnails(visible, settings.thumbnailInterval);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header onAdd={openAdd} onSettings={() => setSettingsOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <FolderTree />
        <main className="flex min-w-0 flex-1 flex-col">
          <ConnectionGrid
            connections={visible}
            capturingIds={capturingIds}
            onAdd={openAdd}
            onOpen={onOpenViewer}
            onEdit={(c) => {
              setEditing(c);
              setDialogOpen(true);
            }}
            onRequestDelete={setPendingDelete}
            onRefresh={refresh}
          />
        </main>
      </div>

      <ConnectionDialog open={dialogOpen} editing={editing} onOpenChange={setDialogOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ConfirmDialog
        open={!!pendingDelete}
        title="정말 삭제하시겠습니까?"
        description={`'${pendingDelete?.name ?? ""}' 커넥션이 목록에서 제거됩니다. 이 작업은 되돌릴 수 없습니다.`}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await removeConnection(pendingDelete.id);
          if (useAppStore.getState().connections.length === 0) setEditMode(false);
        }}
      />
    </div>
  );
}

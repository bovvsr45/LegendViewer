import { useMemo, useState } from "react";
import {
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Layers,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import type { Folder } from "@/types";

/** Where a new folder is about to be created (`null` = at the root). */
type PendingAdd = { parentId: string | null } | null;

interface NodeProps {
  folder: Folder;
  depth: number;
  childrenOf: Map<string | null, Folder[]>;
  countOf: (id: string) => number;
  renamingId: string | null;
  onCommitRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onStartRename: (f: Folder) => void;
  onAddChild: (f: Folder) => void;
  onRequestDelete: (f: Folder) => void;
}

function TreeNode(props: NodeProps) {
  const {
    folder,
    depth,
    childrenOf,
    countOf,
    renamingId,
    onCommitRename,
    onCancelRename,
    onStartRename,
    onAddChild,
    onRequestDelete,
  } = props;

  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const selectFolder = useAppStore((s) => s.selectFolder);
  const editMode = useAppStore((s) => s.editMode);

  const kids = childrenOf.get(folder.id) ?? [];
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState(folder.name);
  const active = selectedFolderId === folder.id;
  const renaming = renamingId === folder.id;

  if (renaming) {
    return (
      <div style={{ paddingLeft: 8 + depth * 14 }} className="py-0.5 pr-1.5">
        <Input
          autoFocus
          value={draft}
          className="h-7 text-sm"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => onCommitRename(folder.id, draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename(folder.id, draft);
            if (e.key === "Escape") {
              setDraft(folder.name);
              onCancelRename();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={() => selectFolder(folder.id)}
            style={{ paddingLeft: 8 + depth * 14 }}
            className={cn(
              "group flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-lg pr-1.5 text-sm transition-colors",
              active
                ? "bg-primary/15 font-medium text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded transition-transform",
                kids.length === 0 && "invisible",
                open && "rotate-90"
              )}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {active || open ? (
              <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
              <FolderIcon className="h-4 w-4 shrink-0" />
            )}

            <span className="flex-1 truncate">{folder.name}</span>

            {editMode ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(folder);
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="shrink-0 text-[11px] tabular-nums opacity-60">
                {countOf(folder.id)}
              </span>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem
            onSelect={() => {
              setOpen(true);
              onAddChild(folder);
            }}
          >
            <FolderPlus className="h-4 w-4" />
            하위 폴더 추가
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onStartRename(folder)}>
            <Pencil className="h-4 w-4" />
            이름 변경
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem destructive onSelect={() => onRequestDelete(folder)}>
            <Trash2 className="h-4 w-4" />
            폴더 삭제
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {open && kids.map((k) => <TreeNode key={k.id} {...props} folder={k} depth={depth + 1} />)}
    </div>
  );
}

export function FolderTree() {
  const folders = useAppStore((s) => s.folders);
  const connections = useAppStore((s) => s.connections);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const selectFolder = useAppStore((s) => s.selectFolder);
  const saveFolder = useAppStore((s) => s.saveFolder);
  const removeFolder = useAppStore((s) => s.removeFolder);

  const [pendingAdd, setPendingAdd] = useState<PendingAdd>(null);
  const [draft, setDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Folder | null>(null);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const key = f.parent_id ?? null;
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [folders]);

  const countOf = (id: string) => connections.filter((c) => c.folderId === id).length;
  const parentName = pendingAdd?.parentId
    ? folders.find((f) => f.id === pendingAdd.parentId)?.name
    : null;

  const commitAdd = async () => {
    const name = draft.trim();
    const parentId = pendingAdd?.parentId ?? null;
    setDraft("");
    setPendingAdd(null);
    if (name) await saveFolder(name, null, parentId);
  };

  const commitRename = async (id: string, name: string) => {
    setRenamingId(null);
    const target = folders.find((f) => f.id === id);
    const trimmed = name.trim();
    if (target && trimmed && trimmed !== target.name) {
      await saveFolder(trimmed, id, target.parent_id);
    }
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border/70 bg-card/30">
      <div className="flex h-11 items-center justify-between px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          폴더
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="새 폴더"
          onClick={() => setPendingAdd({ parentId: selectedFolderId })}
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              onClick={() => selectFolder(null)}
              className={cn(
                "flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-lg pl-2 pr-1.5 text-sm transition-colors",
                selectedFolderId === null
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span className="h-4 w-4 shrink-0" />
              <Layers className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">모든 커넥션</span>
              <span className="shrink-0 text-[11px] tabular-nums opacity-60">
                {connections.length}
              </span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => setPendingAdd({ parentId: null })}>
              <FolderPlus className="h-4 w-4" />
              새 폴더
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {(childrenOf.get(null) ?? []).map((f) => (
          <TreeNode
            key={f.id}
            folder={f}
            depth={0}
            childrenOf={childrenOf}
            countOf={countOf}
            renamingId={renamingId}
            onCommitRename={commitRename}
            onCancelRename={() => setRenamingId(null)}
            onStartRename={(t) => setRenamingId(t.id)}
            onAddChild={(t) => setPendingAdd({ parentId: t.id })}
            onRequestDelete={setPendingDelete}
          />
        ))}

        {pendingAdd && (
          <div className="mt-1 px-1">
            <Input
              autoFocus
              value={draft}
              placeholder={parentName ? `${parentName} 안에 새 폴더` : "새 폴더 이름"}
              className="h-8 text-sm"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitAdd();
                if (e.key === "Escape") {
                  setDraft("");
                  setPendingAdd(null);
                }
              }}
            />
          </div>
        )}

        {folders.length === 0 && !pendingAdd && (
          <p className="mt-3 px-2 text-[11px] leading-relaxed text-muted-foreground/70">
            폴더를 우클릭하면 이름 변경·삭제·하위 폴더 추가를 할 수 있습니다.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="폴더를 삭제할까요?"
        description={`'${pendingDelete?.name ?? ""}' 폴더와 하위 폴더가 삭제됩니다. 안에 있던 커넥션은 '모든 커넥션'으로 이동합니다.`}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        onConfirm={() => pendingDelete && void removeFolder(pendingDelete.id)}
      />
    </aside>
  );
}

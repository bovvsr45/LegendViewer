import { motion } from "framer-motion";
import { Lock, MonitorOff, Pencil, RefreshCw, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import type { Connection } from "@/types";

interface Props {
  connection: Connection;
  onOpen: (c: Connection) => void;
  onEdit: (c: Connection) => void;
  onRequestDelete: (c: Connection) => void;
  onRefresh: (c: Connection) => void;
  capturing: boolean;
}

export function ConnectionCard({
  connection,
  onOpen,
  onEdit,
  onRequestDelete,
  onRefresh,
  capturing,
}: Props) {
  const editMode = useAppStore((s) => s.editMode);
  const thumbnail = useAppStore((s) => s.thumbnails[connection.id]);
  const error = useAppStore((s) => s.thumbErrors[connection.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onClick={() => !editMode && onOpen(connection)}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all",
        editMode
          ? "cursor-default"
          : "cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
      )}
    >
      {/* preview */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-muted/60 to-muted">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={connection.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <MonitorOff className="h-7 w-7 shrink-0 opacity-40" />
            <span
              title={error || undefined}
              className="line-clamp-3 px-4 text-center text-[11px] leading-tight opacity-70"
            >
              {error ? error : capturing ? "미리보기 수집 중…" : "미리보기 없음"}
            </span>
          </div>
        )}

        {capturing && (
          <div className="absolute left-2 top-2 rounded-full bg-black/55 p-1.5 backdrop-blur">
            <RefreshCw className="h-3 w-3 animate-spin text-white" />
          </div>
        )}

        {editMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(connection);
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
            title="삭제"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {!editMode && (
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh(connection);
              }}
              className="rounded-md bg-white/10 p-1.5 text-white backdrop-blur transition-colors hover:bg-white/25"
              title="미리보기 새로고침"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(connection);
              }}
              className="rounded-md bg-white/10 p-1.5 text-white backdrop-blur transition-colors hover:bg-white/25"
              title="편집"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* meta */}
      <div className="flex items-center gap-2 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-tight">{connection.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {connection.host}:{connection.port}
          </div>
        </div>
        {connection.hasPassword && (
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
}

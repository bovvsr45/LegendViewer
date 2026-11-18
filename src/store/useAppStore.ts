import { create } from "zustand";
import { api } from "@/lib/api";
import type { AppSnapshot, Connection, ConnectionInput, Folder, Settings } from "@/types";

interface AppStore {
  ready: boolean;
  folders: Folder[];
  connections: Connection[];
  settings: Settings;

  /** null = "All connections" pseudo-folder */
  selectedFolderId: string | null;
  editMode: boolean;
  /** connection id -> PNG data URL */
  thumbnails: Record<string, string>;
  thumbErrors: Record<string, string>;

  load: () => Promise<void>;
  apply: (s: AppSnapshot) => void;
  selectFolder: (id: string | null) => void;
  toggleEditMode: () => void;
  setEditMode: (v: boolean) => void;

  saveConnection: (input: ConnectionInput) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  saveFolder: (name: string, id?: string | null, parentId?: string | null) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  saveSettings: (s: Settings) => Promise<void>;

  setThumbnail: (id: string, dataUrl: string) => void;
  setThumbError: (id: string, message: string) => void;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  thumbnailInterval: 30,
  defaultPort: 5900,
  scaleViewer: true,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ready: false,
  folders: [],
  connections: [],
  settings: DEFAULT_SETTINGS,
  selectedFolderId: null,
  editMode: false,
  thumbnails: {},
  thumbErrors: {},

  apply: (s) =>
    set({
      folders: s.folders,
      connections: s.connections,
      settings: s.settings,
      ready: true,
    }),

  load: async () => {
    get().apply(await api.getState());
  },

  selectFolder: (id) => set({ selectedFolderId: id }),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  setEditMode: (v) => set({ editMode: v }),

  saveConnection: async (input) => get().apply(await api.upsertConnection(input)),

  removeConnection: async (id) => {
    const snap = await api.deleteConnection(id);
    set((s) => {
      const thumbnails = { ...s.thumbnails };
      delete thumbnails[id];
      return { thumbnails };
    });
    get().apply(snap);
  },

  saveFolder: async (name, id, parentId) =>
    get().apply(await api.upsertFolder(name, id, parentId)),

  removeFolder: async (id) => {
    const snap = await api.deleteFolder(id);
    if (get().selectedFolderId === id) set({ selectedFolderId: null });
    get().apply(snap);
  },

  saveSettings: async (s) => get().apply(await api.updateSettings(s)),

  setThumbnail: (id, dataUrl) =>
    set((s) => ({
      thumbnails: { ...s.thumbnails, [id]: dataUrl },
      thumbErrors: { ...s.thumbErrors, [id]: "" },
    })),

  setThumbError: (id, message) =>
    set((s) => ({ thumbErrors: { ...s.thumbErrors, [id]: message } })),
}));

/** Connections that belong to the currently selected folder. */
export const selectVisibleConnections = (s: AppStore): Connection[] =>
  s.selectedFolderId === null
    ? s.connections
    : s.connections.filter((c) => c.folderId === s.selectedFolderId);

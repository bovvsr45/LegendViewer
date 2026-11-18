import { invoke } from "@tauri-apps/api/core";
import type { AppSnapshot, ConnectionInput, Settings, SessionInfo } from "@/types";

export const api = {
  getState: () => invoke<AppSnapshot>("get_state"),

  upsertConnection: (input: ConnectionInput) =>
    invoke<AppSnapshot>("upsert_connection", { input }),

  deleteConnection: (id: string) => invoke<AppSnapshot>("delete_connection", { id }),

  upsertFolder: (name: string, id?: string | null, parentId?: string | null) =>
    invoke<AppSnapshot>("upsert_folder", { id: id ?? null, name, parentId: parentId ?? null }),

  deleteFolder: (id: string) => invoke<AppSnapshot>("delete_folder", { id }),

  updateSettings: (settings: Settings) => invoke<AppSnapshot>("update_settings", { settings }),

  captureThumbnail: (id: string) => invoke<string>("capture_thumbnail", { id }),

  openSession: (id: string) => invoke<SessionInfo>("open_session", { id }),

  closeSession: (token: string) => invoke("close_session", { token }),
};

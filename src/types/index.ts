export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  folderId: string | null;
  username: string | null;
  hasPassword: boolean;
  viewOnly: boolean;
  createdAt: number;
}

export type Theme = "dark" | "light" | "system";

export interface Settings {
  theme: Theme;
  thumbnailInterval: number;
  defaultPort: number;
  scaleViewer: boolean;
}

export interface AppSnapshot {
  folders: Folder[];
  connections: Connection[];
  settings: Settings;
}

export interface ConnectionInput {
  id?: string | null;
  name: string;
  host: string;
  port: number;
  folderId: string | null;
  username: string | null;
  /** undefined keeps the stored password, "" clears it. */
  password?: string;
  viewOnly: boolean;
}

export interface SessionInfo {
  wsPort: number;
  token: string;
  username: string | null;
  password: string | null;
  viewOnly: boolean;
  name: string;
}

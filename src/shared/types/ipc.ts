import type { AppSettings } from './settings';
import type { MediaItem } from './media';
import type { SessionCheckpoint, UndoableAction } from './session';
import type { Result } from './results';

export const IPC_CHANNELS = {
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',
  FOLDERS_SELECT: 'folders:select',
  SCAN_START: 'scan:start',
  SCAN_CANCEL: 'scan:cancel',
  SCAN_PROGRESS: 'scan:progress', // Main -> Renderer event
  SCAN_COMPLETE: 'scan:complete', // Main -> Renderer event
  MEDIA_GET: 'media:get',
  MEDIA_UPDATE_REVIEWS: 'media:update-reviews',
  SESSION_GET_CHECKPOINT: 'session:get-checkpoint',
  SESSION_SAVE_CHECKPOINT: 'session:save-checkpoint',
  SESSION_CLEAR: 'session:clear',
  ORGANIZE_PREVIEW: 'organize:preview',
  ORGANIZE_EXECUTE: 'organize:execute',
  ORGANIZE_PROGRESS: 'organize:progress', // Main -> Renderer event
  FILE_OPEN: 'file:open',
  FILE_SHOW: 'file:show',
  MEDIA_TRASH: 'media:trash',
  APP_RESET: 'app:reset',
  TITLEBAR_UPDATE: 'titlebar:update',
} as const;

export interface ScanProgressPayload {
  scannedCount: number;
  totalCount: number;
  currentFile?: string;
  items: MediaItem[];
}

export interface OrganizeProgressPayload {
  processedCount: number;
  totalCount: number;
  currentFile: string;
  success: boolean;
  error?: string;
}

export interface OrganizePreviewItem {
  mediaId: string;
  sourcePath: string;
  targetPath: string;
  relativePath: string;
  conflict: boolean;
  conflictReason?: 'already_exists' | 'duplicate_target' | 'duplicate_source';
}

export interface GalleoAPI {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<Result<void>>;
  selectFolder: () => Promise<string | null>;
  startScan: (rootPaths: string[], forceRescan?: boolean) => Promise<Result<void>>;
  cancelScan: () => Promise<void>;
  onScanProgress: (callback: (payload: ScanProgressPayload) => void) => () => void;
  onScanComplete: (callback: () => void) => () => void;
  getMediaItems: (folderPath: string) => Promise<MediaItem[]>;
  updateReviews: (
    sessionId: string,
    updates: { mediaId: string; state: 'keep' | 'delete' | 'skipped' }[],
    undoAction?: UndoableAction
  ) => Promise<Result<void>>;
  getSessionCheckpoint: (folderPath: string) => Promise<SessionCheckpoint | null>;
  saveSessionCheckpoint: (checkpoint: SessionCheckpoint) => Promise<Result<void>>;
  clearSession: (folderPath: string) => Promise<Result<void>>;
  previewOrganization: (folderPath: string, destination: string, pattern: string) => Promise<Result<OrganizePreviewItem[]>>;
  executeOrganization: (
    folderPath: string,
    previewItems: OrganizePreviewItem[],
    preserveOriginals: boolean
  ) => Promise<Result<void>>;
  onOrganizeProgress: (callback: (payload: OrganizeProgressPayload) => void) => () => void;
  openFile: (path: string) => Promise<Result<void>>;
  showFile: (path: string) => Promise<Result<void>>;
  trashFiles: (paths: string[]) => Promise<Result<void>>;
  resetApp: (options: { settings?: boolean; database?: boolean; cache?: boolean; sessions?: boolean }) => Promise<Result<void>>;
  updateTitleBarOverlay: (colors: { color: string; symbolColor: string }) => Promise<void>;
}

// Global declaration to typed window
declare global {
  interface Window {
    api: GalleoAPI;
  }
}

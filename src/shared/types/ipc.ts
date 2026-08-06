import type { AppSettings } from "./settings"
import type { MediaItem } from "./media"
import type { SessionCheckpoint, UndoableAction } from "./session"
import type { Result } from "./results"

export const IPC_CHANNELS = {
  SETTINGS_GET: "settings:get",
  SETTINGS_SAVE: "settings:save",
  FOLDERS_SELECT: "folders:select",
  SCAN_START: "scan:start",
  SCAN_CANCEL: "scan:cancel",
  SCAN_COUNT_FOLDERS: "scan:count-folders",
  SCAN_FOLDER_COUNTS_UPDATED: "scan:folder-counts-updated",
  SCAN_PROGRESS: "scan:progress", // Main -> Renderer event
  SCAN_COMPLETE: "scan:complete", // Main -> Renderer event
  MEDIA_GET: "media:get",
  MEDIA_UPDATE_REVIEWS: "media:update-reviews",
  SESSION_GET_CHECKPOINT: "session:get-checkpoint",
  SESSION_SAVE_CHECKPOINT: "session:save-checkpoint",
  SESSION_CLEAR: "session:clear",
  ORGANIZE_PREVIEW: "organize:preview",
  ORGANIZE_EXECUTE: "organize:execute",
  ORGANIZE_PROGRESS: "organize:progress", // Main -> Renderer event
  FILE_OPEN: "file:open",
  FILE_SHOW: "file:show",
  MEDIA_TRASH: "media:trash",
  APP_RESET: "app:reset",
  MEDIA_CLEAR_INDEX: "media:clear-index",
  APP_CHECK_UPDATE: "app:check-update",
  URL_OPEN: "url:open",
  SEARCH_SEMANTIC: "search:semantic",
  SEARCH_FIND_SIMILAR: "search:find-similar",
  AI_MODEL_STATUS: "ai:model-status",
  AI_DOWNLOAD_MODEL: "ai:download-model",
  AI_DOWNLOAD_PROGRESS: "ai:download-progress",
  AI_PURGE_CACHE: "ai:purge-cache",
  AI_INDEXING_PROGRESS: "ai:indexing-progress",
  AI_START_INDEXING: "ai:start-indexing",
} as const

export interface UpdateCheckResult {
  updateAvailable: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  downloadUrl: string
  releaseNotes?: string
  releaseDate?: string
}

export interface ScanProgressPayload {
  scannedCount: number
  totalCount: number
  currentFile?: string
  items: MediaItem[]
}

export interface OrganizeProgressPayload {
  processedCount: number
  totalCount: number
  currentFile: string
  success: boolean
  error?: string
}

export interface OrganizePreviewItem {
  mediaId: string
  sourcePath: string
  targetPath: string
  relativePath: string
  conflict: boolean
  conflictReason?: "already_exists" | "duplicate_target" | "duplicate_source"
}

import type { SearchQuery, SearchResultItem } from "../../main/services/search-engine.service"

export interface AIIndexingProgressPayload {
  isIndexing: boolean
  processedCount: number
  totalCount: number
  currentFile?: string
  error?: string
  failedCount?: number
}

export interface FileChangeEvent {
  timestamp: number
  type: "added" | "deleted" | "modified"
  path: string
  filename: string
}

export interface FolderCountResult {
  path: string
  count: number
  needsRescan?: boolean
  rescanReason?: string
  changeLog?: FileChangeEvent[]
}

export interface GalleoAPI {
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<Result<void>>
  selectFolder: () => Promise<string | null>
  startScan: (
    rootPaths: string[],
    forceRescan?: boolean
  ) => Promise<Result<void>>
  cancelScan: () => Promise<void>
  /** Fast readdir-only count of media files per root - no metadata, no thumbnails. */
  countFolders: (rootPaths: string[]) => Promise<FolderCountResult[]>
  onScanProgress: (
    callback: (payload: ScanProgressPayload) => void
  ) => () => void
  onScanComplete: (callback: () => void) => () => void
  onFolderCountsUpdated: (
    callback: (counts: FolderCountResult[]) => void
  ) => () => void
  getMediaItems: (folderPath: string) => Promise<MediaItem[]>
  updateReviews: (
    sessionId: string,
    updates: { mediaId: string; state: "keep" | "delete" | "skipped" }[],
    undoAction?: UndoableAction
  ) => Promise<Result<void>>
  getSessionCheckpoint: (
    folderPath: string
  ) => Promise<SessionCheckpoint | null>
  saveSessionCheckpoint: (
    checkpoint: SessionCheckpoint
  ) => Promise<Result<void>>
  clearSession: (folderPath: string) => Promise<Result<void>>
  previewOrganization: (
    folderPath: string,
    destination: string,
    pattern: string
  ) => Promise<Result<OrganizePreviewItem[]>>
  executeOrganization: (
    folderPath: string,
    previewItems: OrganizePreviewItem[],
    preserveOriginals: boolean
  ) => Promise<Result<void>>
  onOrganizeProgress: (
    callback: (payload: OrganizeProgressPayload) => void
  ) => () => void
  openFile: (path: string) => Promise<Result<void>>
  showFile: (path: string) => Promise<Result<void>>
  trashFiles: (paths: string[]) => Promise<Result<void>>
  resetApp: (options: {
    settings?: boolean
    database?: boolean
    cache?: boolean
    sessions?: boolean
  }) => Promise<Result<void>>
  clearFolderIndex: (folderPath: string) => Promise<Result<void>>
  checkForUpdates: (force?: boolean) => Promise<Result<UpdateCheckResult>>
  openExternal: (url: string) => Promise<Result<void>>

  // AI Visual Search APIs
  search: {
    query: (params: SearchQuery) => Promise<SearchResultItem[]>
    findSimilar: (
      mediaId: string,
      limit?: number
    ) => Promise<SearchResultItem[]>
  }
  ai: {
    getStatus: () => Promise<{
      isDownloaded: boolean
      stats: { mediaEmbeddingCount: number; videoFrameEmbeddingCount: number }
    }>
    downloadModel: () => Promise<Result<void>>
    onDownloadProgress: (callback: (progress: number) => void) => () => void
    onIndexingProgress: (
      callback: (payload: AIIndexingProgressPayload) => void
    ) => () => void
    purgeCache: (options?: { deleteModel?: boolean }) => Promise<Result<void>>
    startIndexing: () => Promise<Result<void>>
  }
}

// Global declaration to typed window
declare global {
  interface Window {
    api: GalleoAPI
  }
}

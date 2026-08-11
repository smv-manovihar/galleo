import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"
import {
  IPC_CHANNELS,
  type ScanProgressPayload,
  type OrganizeProgressPayload,
  type TrashProgressPayload,
  type TrashCompletePayload,
  type AIIndexingProgressPayload,
  type FolderCountResult,
  type GalleoAPI,
} from "../shared/types/ipc"

const api: GalleoAPI = {
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  saveSettings: (settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings),
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.FOLDERS_SELECT),
  startScan: (rootPaths, forceRescan) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_START, rootPaths, forceRescan),
  cancelScan: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_CANCEL),
  countFolders: (rootPaths) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_COUNT_FOLDERS, rootPaths),

  onScanProgress: (callback) => {
    const listener = (_event: IpcRendererEvent, payload: ScanProgressPayload) =>
      callback(payload)
    ipcRenderer.on(IPC_CHANNELS.SCAN_PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SCAN_PROGRESS, listener)
    }
  },

  onScanComplete: (callback) => {
    const listener = () => callback()
    ipcRenderer.on(IPC_CHANNELS.SCAN_COMPLETE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SCAN_COMPLETE, listener)
    }
  },

  onScanPostProcessingComplete: (callback) => {
    const listener = () => callback()
    ipcRenderer.on(IPC_CHANNELS.SCAN_POST_PROCESSING_COMPLETE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SCAN_POST_PROCESSING_COMPLETE, listener)
    }
  },

  onFolderCountsUpdated: (callback) => {
    const listener = (
      _event: IpcRendererEvent,
      counts: FolderCountResult[]
    ) => callback(counts)
    ipcRenderer.on(IPC_CHANNELS.SCAN_FOLDER_COUNTS_UPDATED, listener)
    return () => {
      ipcRenderer.removeListener(
        IPC_CHANNELS.SCAN_FOLDER_COUNTS_UPDATED,
        listener
      )
    }
  },

  getMediaItems: (folderPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDIA_GET, folderPath),

  updateReviews: (sessionId, updates, undoAction) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDIA_UPDATE_REVIEWS, {
      sessionId,
      updates,
      undoAction,
    }),

  getSessionCheckpoint: (folderPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_CHECKPOINT, folderPath),
  saveSessionCheckpoint: (checkpoint) =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_SAVE_CHECKPOINT, checkpoint),
  clearSession: (folderPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLEAR, folderPath),

  previewOrganization: (folderPath, destination, pattern) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORGANIZE_PREVIEW, {
      folderPath,
      destination,
      pattern,
    }),

  executeOrganization: (folderPath, previewItems, preserveOriginals) =>
    ipcRenderer.invoke(IPC_CHANNELS.ORGANIZE_EXECUTE, {
      folderPath,
      previewItems,
      preserveOriginals,
    }),

  onOrganizeProgress: (callback) => {
    const listener = (_event: IpcRendererEvent, payload: OrganizeProgressPayload) =>
      callback(payload)
    ipcRenderer.on(IPC_CHANNELS.ORGANIZE_PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ORGANIZE_PROGRESS, listener)
    }
  },

  onTrashProgress: (callback) => {
    const listener = (_event: IpcRendererEvent, payload: TrashProgressPayload) =>
      callback(payload)
    ipcRenderer.on(IPC_CHANNELS.MEDIA_TRASH_PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MEDIA_TRASH_PROGRESS, listener)
    }
  },

  onTrashComplete: (callback) => {
    const listener = (_event: IpcRendererEvent, payload: TrashCompletePayload) =>
      callback(payload)
    ipcRenderer.on(IPC_CHANNELS.MEDIA_TRASH_COMPLETE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.MEDIA_TRASH_COMPLETE, listener)
    }
  },

  getTrashStatus: () => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_GET_TRASH_STATUS),

  openFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN, filePath),
  showFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FILE_SHOW, filePath),
  trashFiles: (paths) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_TRASH, paths),
  resetApp: (options) => ipcRenderer.invoke(IPC_CHANNELS.APP_RESET, options),
  clearFolderIndex: (folderPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEDIA_CLEAR_INDEX, folderPath),
  checkForUpdates: (force?: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_UPDATE, force),
  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.URL_OPEN, url),
  checkScanInterrupted: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_INTERRUPTED_CHECK),
  getScanStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_STATUS),

  search: {
    query: (params) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_SEMANTIC, params),
    findSimilar: (mediaId, limit) =>
      ipcRenderer.invoke(IPC_CHANNELS.SEARCH_FIND_SIMILAR, { mediaId, limit }),
  },

  ai: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AI_MODEL_STATUS),
    downloadModel: () => ipcRenderer.invoke(IPC_CHANNELS.AI_DOWNLOAD_MODEL),
    onDownloadProgress: (callback) => {
      const listener = (_event: IpcRendererEvent, progress: number) => callback(progress)
      ipcRenderer.on(IPC_CHANNELS.AI_DOWNLOAD_PROGRESS, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.AI_DOWNLOAD_PROGRESS, listener)
      }
    },
    onIndexingProgress: (callback) => {
      const listener = (
        _event: IpcRendererEvent,
        payload: AIIndexingProgressPayload
      ) => callback(payload)
      ipcRenderer.on(IPC_CHANNELS.AI_INDEXING_PROGRESS, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.AI_INDEXING_PROGRESS, listener)
      }
    },
    purgeCache: (options) => ipcRenderer.invoke(IPC_CHANNELS.AI_PURGE_CACHE, options),
    startIndexing: () => ipcRenderer.invoke(IPC_CHANNELS.AI_START_INDEXING),
  },
}

contextBridge.exposeInMainWorld("api", api)
export type { GalleoAPI }

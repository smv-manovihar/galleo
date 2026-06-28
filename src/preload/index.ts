import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type ScanProgressPayload, type OrganizeProgressPayload, type MediaPurgeAPI } from '../shared/types/ipc';

const api: MediaPurgeAPI = {
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  saveSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings),
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.FOLDERS_SELECT),
  startScan: (rootPaths, forceRescan) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_START, rootPaths, forceRescan),
  cancelScan: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_CANCEL),
  
  onScanProgress: (callback) => {
    const listener = (_event: any, payload: ScanProgressPayload) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.SCAN_PROGRESS, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SCAN_PROGRESS, listener);
    };
  },

  onScanComplete: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.SCAN_COMPLETE, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SCAN_COMPLETE, listener);
    };
  },

  getMediaItems: (folderPath) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_GET, folderPath),
  
  updateReviews: (sessionId, updates, undoAction) => 
    ipcRenderer.invoke(IPC_CHANNELS.MEDIA_UPDATE_REVIEWS, { sessionId, updates, undoAction }),
  
  getSessionCheckpoint: (folderPath) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_CHECKPOINT, folderPath),
  saveSessionCheckpoint: (checkpoint) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_SAVE_CHECKPOINT, checkpoint),
  clearSession: (folderPath) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLEAR, folderPath),
  
  previewOrganization: (folderPath, destination, pattern) => 
    ipcRenderer.invoke(IPC_CHANNELS.ORGANIZE_PREVIEW, { folderPath, destination, pattern }),
  
  executeOrganization: (folderPath, previewItems, preserveOriginals) => 
    ipcRenderer.invoke(IPC_CHANNELS.ORGANIZE_EXECUTE, { folderPath, previewItems, preserveOriginals }),

  onOrganizeProgress: (callback) => {
    const listener = (_event: any, payload: OrganizeProgressPayload) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.ORGANIZE_PROGRESS, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ORGANIZE_PROGRESS, listener);
    };
  },

  openFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN, filePath),
  showFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FILE_SHOW, filePath),
  trashFiles: (paths) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_TRASH, paths),
  resetApp: (options) => ipcRenderer.invoke(IPC_CHANNELS.APP_RESET, options),
};

contextBridge.exposeInMainWorld('api', api);
export type { MediaPurgeAPI };

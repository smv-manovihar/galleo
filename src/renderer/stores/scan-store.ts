import { create } from 'zustand';
import { useMediaStore } from './media-store';
import { useSettingsStore } from './settings-store';

interface ScanProgress {
  scannedCount: number;
  totalCount: number;
  currentFile?: string;
}

interface ScanState {
  isScanning: boolean;
  isStopping: boolean;
  scanProgress: ScanProgress;
  startScan: (rootPaths: string[], forceRescan?: boolean) => Promise<void>;
  cancelScan: () => Promise<void>;
}

export const useScanStore = create<ScanState>((set) => ({
  isScanning: false,
  isStopping: false,
  scanProgress: {
    scannedCount: 0,
    totalCount: 0,
  },

  startScan: async (rootPaths: string[], forceRescan: boolean = false) => {
    if (rootPaths.length === 0) return;

    set({
      isScanning: true,
      isStopping: false,
      scanProgress: { scannedCount: 0, totalCount: 0, currentFile: 'Discovered directories...' }
    });

    // Register IPC listener callbacks
    const cleanupProgress = window.api.onScanProgress((payload) => {
      // 1. Update progress in scan store
      set({
        scanProgress: {
          scannedCount: payload.scannedCount,
          totalCount: payload.totalCount,
          currentFile: payload.currentFile
        }
      });

      // 2. Only update media store if there are actually items to merge
      if (payload.items && payload.items.length > 0) {
        useMediaStore.setState((mediaState) => {
          const itemMap = new Map(mediaState.items.map(i => [i.id, i]));
          for (const item of payload.items) {
            itemMap.set(item.id, item);
          }
          return {
            items: Array.from(itemMap.values())
          };
        });
      }
    });

    const cleanupComplete = window.api.onScanComplete(async () => {
      cleanupProgress();
      cleanupComplete();
      set({ isScanning: false, isStopping: false });

      // Mark the scanned folders as scanned: true in settings
      const settingsStore = useSettingsStore.getState();
      const updatedRoots = settingsStore.settings.folders.roots.map((r) => {
        if (rootPaths.some((p) => p.toLowerCase() === r.path.toLowerCase())) {
          return { ...r, scanned: true };
        }
        return r;
      });
      await settingsStore.saveSettings({
        ...settingsStore.settings,
        folders: {
          ...settingsStore.settings.folders,
          roots: updatedRoots,
        },
      });

      // Refresh current folder items to load newly populated EXIF/duplicates
      const activeRootPath = useMediaStore.getState().activeRootPath;
      if (activeRootPath) {
        await useMediaStore.getState().fetchMediaItems(activeRootPath);
      }
    });

    const res = await window.api.startScan(rootPaths, forceRescan);
    if (!res.ok) {
      cleanupProgress();
      cleanupComplete();
      set({ isScanning: false, isStopping: false });
    }
  },

  cancelScan: async () => {
    set({ isStopping: true });
    await window.api.cancelScan();
  }
}));

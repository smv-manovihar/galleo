import { create } from "zustand"
import { useMediaStore } from "./media-store"
import { useSettingsStore } from "./settings-store"
import { toast } from "sonner"

interface ScanProgress {
  scannedCount: number
  totalCount: number
  currentFile?: string
}

interface ScanState {
  isScanning: boolean
  isStopping: boolean
  scanProgress: ScanProgress
  startScan: (rootPaths: string[], forceRescan?: boolean) => Promise<void>
  cancelScan: () => Promise<void>
}

// Module-level cleanup refs so stale listeners from prior invocations are
// always removed before a new scan registers fresh ones.
let _cleanupProgress: (() => void) | null = null
let _cleanupComplete: (() => void) | null = null

export const useScanStore = create<ScanState>((set, get) => ({
  isScanning: false,
  isStopping: false,
  scanProgress: {
    scannedCount: 0,
    totalCount: 0,
  },

  startScan: async (rootPaths: string[], forceRescan: boolean = false) => {
    if (rootPaths.length === 0) return

    // Tear down any stale listeners from a previous scan before registering new ones.
    _cleanupProgress?.()
    _cleanupComplete?.()
    _cleanupProgress = null
    _cleanupComplete = null

    set({
      isScanning: true,
      isStopping: false,
      scanProgress: {
        scannedCount: 0,
        totalCount: 0,
        currentFile: "Discovered directories...",
      },
    })

    // Register IPC listener callbacks
    _cleanupProgress = window.api.onScanProgress((payload) => {
      // 1. Update progress in scan store
      set({
        scanProgress: {
          scannedCount: payload.scannedCount,
          totalCount: payload.totalCount,
          currentFile: payload.currentFile,
        },
      })

      // 2. Only update media store if there are actually items to merge
      if (payload.items && payload.items.length > 0) {
        useMediaStore.setState((mediaState) => {
          const itemMap = new Map(mediaState.items.map((i) => [i.id, i]))
          for (const item of payload.items) {
            itemMap.set(item.id, item)
          }
          return {
            items: Array.from(itemMap.values()),
          }
        })
      }
    })

    _cleanupComplete = window.api.onScanComplete(async () => {
      const isWasStopping = get().isStopping

      // Remove listeners immediately so this fires exactly once.
      _cleanupProgress?.()
      _cleanupComplete?.()
      _cleanupProgress = null
      _cleanupComplete = null

      set({ isScanning: false, isStopping: false })

      if (isWasStopping) {
        toast.info("Folder scan canceled", { id: "scan-complete-toast" })
        return
      }

      // Mark the scanned folders as scanned: true in settings
      const settingsStore = useSettingsStore.getState()
      const updatedRoots = settingsStore.settings.folders.roots.map((r) => {
        if (rootPaths.some((p) => p.toLowerCase() === r.path.toLowerCase())) {
          return { ...r, scanned: true }
        }
        return r
      })
      await settingsStore.saveSettings({
        ...settingsStore.settings,
        folders: {
          ...settingsStore.settings.folders,
          roots: updatedRoots,
        },
      })

      // Refresh current folder items to load newly populated EXIF/duplicates
      const activeRootPath = useMediaStore.getState().activeRootPath
      if (activeRootPath) {
        await useMediaStore.getState().fetchMediaItems(activeRootPath)
      }

      const folderNames = rootPaths
        .map((p) => p.split(/[\\/]/).pop() || p)
        .join(", ")
      toast.success("Folder scan completed successfully", {
        id: "scan-complete-toast",
        description: `Successfully indexed files in ${folderNames}.`,
      })
    })

    const res = await window.api.startScan(rootPaths, forceRescan)
    if (!res.ok) {
      _cleanupProgress?.()
      _cleanupComplete?.()
      _cleanupProgress = null
      _cleanupComplete = null
      set({ isScanning: false, isStopping: false })
      let errMsg = "An unknown scan error occurred."
      if (res.error) {
        const err = res.error
        if (err.code === "UNKNOWN") {
          errMsg = err.message
        } else if (
          err.code === "EXIF_FAILED" ||
          err.code === "THUMBNAIL_FAILED"
        ) {
          errMsg = err.reason
        } else if (err.code === "CORRUPT_DB") {
          errMsg = err.detail
        } else if ("path" in err) {
          errMsg = `Failed for file: ${err.path} (${err.code})`
        } else {
          errMsg = `Error code: ${(err as any).code}`
        }
      }
      toast.error("Folder scan failed", {
        id: "scan-complete-toast",
        description: errMsg,
      })
    }
  },

  cancelScan: async () => {
    set({ isStopping: true })
    await window.api.cancelScan()
  },
}))

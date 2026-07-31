import { create } from "zustand"
import { useMediaStore } from "./media-store"
import { useSettingsStore } from "./settings-store"
import { toast } from "sonner"
import { ENABLE_AI_FEATURES } from "../../shared/constants"

interface ScanProgress {
  scannedCount: number
  totalCount: number
  currentFile?: string
}

interface PendingScan {
  rootPaths: string[]
  forceRescan?: boolean
}

export interface AIStatus {
  isDownloaded: boolean
  stats: { mediaEmbeddingCount: number; videoFrameEmbeddingCount: number }
}

export interface AIIndexingProgress {
  isIndexing: boolean
  processedCount: number
  totalCount: number
  currentFile?: string
}

interface ScanState {
  isScanning: boolean
  isStopping: boolean
  scanProgress: ScanProgress
  pendingScan: PendingScan | null
  showAIConsentDialog: boolean
  aiStatus: AIStatus | null
  isDownloadingAI: boolean
  aiDownloadProgress: number
  aiIndexingProgress: AIIndexingProgress
  /** Live disk media file count and rescan status per root path, fetched via fast readdir & watcher. */
  folderCounts: Map<string, { count: number; needsRescan?: boolean }>

  checkAIStatus: () => Promise<void>
  startScan: (rootPaths: string[], forceRescan?: boolean) => Promise<void>
  executeScan: (rootPaths: string[], forceRescan?: boolean) => Promise<void>
  confirmScanWithAIDownload: () => Promise<void>
  confirmScanWithoutAI: () => Promise<void>
  dismissAIConsentDialog: () => void
  cancelScan: () => Promise<void>
}

let _cleanupProgress: (() => void) | null = null
let _cleanupComplete: (() => void) | null = null

export const useScanStore = create<ScanState>((set, get) => ({
  isScanning: false,
  isStopping: false,
  scanProgress: {
    scannedCount: 0,
    totalCount: 0,
  },
  pendingScan: null,
  showAIConsentDialog: false,
  aiStatus: null,
  isDownloadingAI: false,
  aiDownloadProgress: 0,
  aiIndexingProgress: {
    isIndexing: false,
    processedCount: 0,
    totalCount: 0,
  },
  folderCounts: new Map(),

  checkAIStatus: async () => {
    if (!ENABLE_AI_FEATURES) {
      set({ aiStatus: null })
      return
    }
    if (typeof window !== "undefined" && window.api?.ai) {
      try {
        const status = await window.api.ai.getStatus()
        set({ aiStatus: status })
      } catch {
        set({ aiStatus: null })
      }
    }
  },

  startScan: async (rootPaths: string[], forceRescan: boolean = false) => {
    if (rootPaths.length === 0) return

    if (!ENABLE_AI_FEATURES) {
      // AI features disabled via feature flag — execute standard scan immediately
      await get().executeScan(rootPaths, forceRescan)
      return
    }

    // Fetch latest AI model status
    await get().checkAIStatus()
    const { aiStatus, isDownloadingAI } = get()

    if (aiStatus?.isDownloaded || isDownloadingAI) {
      // Model is already downloaded or currently downloading asynchronously — execute scan immediately
      await get().executeScan(rootPaths, forceRescan)
    } else {
      // Prompt user for AI model consent before scanning
      set({
        pendingScan: { rootPaths, forceRescan },
        showAIConsentDialog: true,
        aiDownloadProgress: 0,
      })
    }
  },

  confirmScanWithAIDownload: async () => {
    const { pendingScan } = get()
    
    // Close dialog and show AI model download progress in TopBar
    set({
      showAIConsentDialog: false,
      isDownloadingAI: true,
      aiDownloadProgress: 0,
    })

    try {
      if (typeof window !== "undefined" && window.api?.ai) {
        const cleanup = window.api.ai.onDownloadProgress((progress) => {
          set({ aiDownloadProgress: progress })
        })
        await window.api.ai.downloadModel()
        cleanup()
      }
      await get().checkAIStatus()
      toast.success("Visual AI model downloaded successfully", {
        description: "Starting library scan with visual search active...",
      })
    } catch (e: unknown) {
      toast.error("AI model download failed", {
        description: e instanceof Error ? e.message : "Proceeding with standard scan.",
      })
    } finally {
      set({ isDownloadingAI: false })
      if (pendingScan) {
        await get().executeScan(pendingScan.rootPaths, pendingScan.forceRescan)
        set({ pendingScan: null })
      }
    }
  },

  confirmScanWithoutAI: async () => {
    const { pendingScan } = get()
    set({ showAIConsentDialog: false })
    if (pendingScan) {
      await get().executeScan(pendingScan.rootPaths, pendingScan.forceRescan)
      set({ pendingScan: null })
    }
  },

  dismissAIConsentDialog: () => {
    set({
      showAIConsentDialog: false,
      pendingScan: null,
    })
  },

  executeScan: async (rootPaths: string[], forceRescan: boolean = false) => {
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

    let pendingItemsBuffer: any[] = []
    let flushTimeout: ReturnType<typeof setTimeout> | null = null

    const flushBuffer = () => {
      if (pendingItemsBuffer.length === 0) return
      const batch = pendingItemsBuffer
      pendingItemsBuffer = []
      useMediaStore.setState((mediaState) => {
        const itemMap = new Map(mediaState.items.map((i) => [i.id, i]))
        for (const item of batch) {
          itemMap.set(item.id, item)
        }
        return { items: Array.from(itemMap.values()) }
      })
    }

    _cleanupProgress = window.api.onScanProgress((payload) => {
      set({
        scanProgress: {
          scannedCount: payload.scannedCount,
          totalCount: payload.totalCount,
          currentFile: payload.currentFile,
        },
      })

      if (payload.items && payload.items.length > 0) {
        pendingItemsBuffer.push(...payload.items)
        if (!flushTimeout) {
          flushTimeout = setTimeout(() => {
            flushTimeout = null
            flushBuffer()
          }, 250)
        }
      }
    })

    _cleanupComplete = window.api.onScanComplete(async () => {
      if (flushTimeout) {
        clearTimeout(flushTimeout)
        flushTimeout = null
      }
      flushBuffer()

      const wasPartialScan = get().isStopping

      _cleanupProgress?.()
      _cleanupComplete?.()
      _cleanupProgress = null
      _cleanupComplete = null

      set({ isScanning: false, isStopping: false })

      // Reload media in every case — partial scans still produced indexed items
      const activeRootPath = useMediaStore.getState().activeRootPath
      if (activeRootPath) {
        await useMediaStore.getState().fetchMediaItems(activeRootPath)
      }

      // Re-fetch settings so the totalDiscoveredCount written by the scanner
      // during discovery is included. Then:
      //   - Partial scan: keep totalDiscoveredCount so isPartial stays derived correctly.
      //   - Full scan:    clear it — the DB is now truth, no stale count should linger.
      const settingsStore = useSettingsStore.getState()
      const latestSettings = await window.api.getSettings()
      const updatedRoots = latestSettings.folders.roots.map((r) => {
        if (rootPaths.some((p) => p.toLowerCase() === r.path.toLowerCase())) {
          return { ...r, scanned: true }
        }
        return r
      })
      await settingsStore.saveSettings({
        ...latestSettings,
        folders: {
          ...latestSettings.folders,
          roots: updatedRoots,
        },
      })

      if (wasPartialScan) {
        toast.info("Scan stopped: showing indexed results", {
          id: "scan-complete-toast",
          description: "Items scanned before stopping are visible. Resume scan to index remaining files.",
        })
        return
      }

      await get().checkAIStatus()

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
          errMsg = `Error code: ${String((err as Record<string, unknown>).code)}`
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

if (ENABLE_AI_FEATURES && typeof window !== "undefined" && window.api?.ai?.onIndexingProgress) {
  window.api.ai.onIndexingProgress((payload) => {
    useScanStore.setState({ aiIndexingProgress: payload })
    if (!payload.isIndexing) {
      useScanStore.getState().checkAIStatus()
    }
  })
}

if (typeof window !== "undefined" && window.api?.onFolderCountsUpdated) {
  window.api.onFolderCountsUpdated((counts) => {
    const map = new Map(useScanStore.getState().folderCounts)
    for (const item of counts) {
      map.set(item.path, { count: item.count, needsRescan: item.needsRescan })
    }
    useScanStore.setState({ folderCounts: map })
  })
}

import { create } from "zustand"
import { useMediaStore } from "./media-store"
import { useSettingsStore } from "./settings-store"
import { toast } from "sonner"
import { ENABLE_AI_FEATURES } from "../../shared/constants"

import type { MediaItem } from "../../shared/types/media"
import type { FolderCountResult } from "../../shared/types/ipc"

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
  isPostProcessing: boolean
  scanProgress: ScanProgress
  pendingScan: PendingScan | null
  showAIConsentDialog: boolean
  aiStatus: AIStatus | null
  isDownloadingAI: boolean
  aiDownloadProgress: number
  aiIndexingProgress: AIIndexingProgress
  /** Live disk media file count, rescan status, and change log per root path. */
  folderCounts: Map<string, FolderCountResult>

  checkAIStatus: () => Promise<void>
  checkActiveScanStatus: () => Promise<void>
  startScan: (rootPaths: string[], forceRescan?: boolean) => Promise<void>
  executeScan: (rootPaths: string[], forceRescan?: boolean) => Promise<void>
  confirmScanWithAIDownload: () => Promise<void>
  confirmScanWithoutAI: () => Promise<void>
  dismissAIConsentDialog: () => void
  cancelScan: () => Promise<void>
}

let _cleanupProgress: (() => void) | null = null
let _cleanupComplete: (() => void) | null = null
let _cleanupPostProcessing: (() => void) | null = null

export const useScanStore = create<ScanState>((set, get) => ({
  isScanning: false,
  isStopping: false,
  isPostProcessing: false,
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
    _cleanupPostProcessing?.()
    _cleanupProgress = null
    _cleanupComplete = null
    _cleanupPostProcessing = null

    // Ensure store has current items pre-loaded before scan starts
    const activeRoot = useMediaStore.getState().activeRootPath
    await useMediaStore.getState().fetchMediaItems(activeRoot || "all")

    set({
      isScanning: true,
      isStopping: false,
      isPostProcessing: false,
      scanProgress: {
        scannedCount: 0,
        totalCount: 0,
        currentFile: "Discovered directories...",
      },
    })

    let pendingItemsBuffer: MediaItem[] = []
    let flushTimeout: ReturnType<typeof setTimeout> | null = null
    let rafProgressId: number | null = null
    let latestPayload: { scannedCount: number; totalCount: number; currentFile?: string } | null = null

    const flushBuffer = () => {
      if (pendingItemsBuffer.length === 0) return
      const batch = pendingItemsBuffer
      pendingItemsBuffer = []
      const currentItems = useMediaStore.getState().items
      const itemMap = new Map(currentItems.map((i) => [i.id, i]))
      for (const item of batch) {
        itemMap.set(item.id, item)
      }
      useMediaStore.getState().setItems(Array.from(itemMap.values()))
    }

    _cleanupProgress = window.api.onScanProgress((payload) => {
      latestPayload = payload
      if (!rafProgressId) {
        rafProgressId = requestAnimationFrame(() => {
          rafProgressId = null
          if (latestPayload) {
            set({
              scanProgress: {
                scannedCount: latestPayload.scannedCount,
                totalCount: latestPayload.totalCount,
                currentFile: latestPayload.currentFile,
              },
            })
          }
        })
      }

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

    let wasStoppedScan = false

    _cleanupComplete = window.api.onScanComplete(async () => {
      if (rafProgressId) {
        cancelAnimationFrame(rafProgressId)
        rafProgressId = null
      }
      if (flushTimeout) {
        clearTimeout(flushTimeout)
        flushTimeout = null
      }
      flushBuffer()

      const wasPartialScan = get().isStopping
      wasStoppedScan = wasPartialScan
      const currentTotal = get().scanProgress.totalCount

      _cleanupProgress?.()
      _cleanupComplete?.()
      _cleanupProgress = null
      _cleanupComplete = null

      set({
        isScanning: false,
        isStopping: false,
        isPostProcessing: true,
        scanProgress: {
          scannedCount: currentTotal,
          totalCount: currentTotal,
          currentFile: wasPartialScan ? "Stopped" : "Scan complete (100%)",
        },
      })

      // Reload media in every case — partial scans still produced indexed items
      const activeRootPath = useMediaStore.getState().activeRootPath
      await useMediaStore.getState().fetchMediaItems(activeRootPath || "all")

      // Re-fetch settings so the totalDiscoveredCount written by the scanner
      // during discovery is included.
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
        toast.info("Scan stopped: running post-processing on indexed results", {
          id: "scan-complete-toast",
          description: "Analyzing duplicates & similarity for scanned files. Resume scan to index remaining files.",
        })
      }

      await get().checkAIStatus()
    })

    const effectiveRoots =
      rootPaths.length > 0
        ? rootPaths
        : useSettingsStore
            .getState()
            .settings.folders.roots.filter((r) => r.enabled)
            .map((r) => r.path)

    const folderBasenames = effectiveRoots
      .map((p) => {
        const cleanPath = p.replace(/[\\/]+$/, "")
        return cleanPath.split(/[\\/]/).pop() || p
      })
      .filter((n) => n.length > 0)

    let folderDescription = ""
    if (folderBasenames.length === 1) {
      folderDescription = folderBasenames[0]
    } else if (folderBasenames.length === 2) {
      folderDescription = `${folderBasenames[0]} and ${folderBasenames[1]}`
    } else if (folderBasenames.length > 2) {
      folderDescription = `${folderBasenames[0]}, ${folderBasenames[1]} (+${folderBasenames.length - 2} more)`
    }

    // Listen for background post-processing completion (duplicates + similarity)
    _cleanupPostProcessing = window.api.onScanPostProcessingComplete(async () => {
      _cleanupPostProcessing?.()
      _cleanupPostProcessing = null
      set({ isPostProcessing: false })

      // Re-fetch media items so duplicate/similarity data is reflected in the UI
      const activeRootPath = useMediaStore.getState().activeRootPath
      await useMediaStore.getState().fetchMediaItems(activeRootPath || "all")

      toast.success(
        wasStoppedScan
          ? "Post-processing completed for stopped scan"
          : "Folder scan completed successfully",
        {
          id: "scan-complete-toast",
          description: folderDescription ? `In ${folderDescription}` : undefined,
        }
      )
    })

    // Fire-and-forget: don't block the store on the full scan IPC response.
    // Completion is handled by onScanComplete listener above.
    window.api.startScan(rootPaths, forceRescan).then((res) => {
      if (!res.ok) {
        if (
          res.error?.code === "UNKNOWN" &&
          res.error?.message === "Scan already in progress"
        ) {
          return
        }

        _cleanupProgress?.()
        _cleanupComplete?.()
        _cleanupPostProcessing?.()
        _cleanupProgress = null
        _cleanupComplete = null
        _cleanupPostProcessing = null
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
    }).catch(() => {
      _cleanupProgress?.()
      _cleanupComplete?.()
      _cleanupPostProcessing?.()
      _cleanupProgress = null
      _cleanupComplete = null
      _cleanupPostProcessing = null
      set({ isScanning: false, isStopping: false })
    })
  },

  checkActiveScanStatus: async () => {
    try {
      if (typeof window !== "undefined" && window.api?.getScanStatus) {
        const isScanningOnBackend = await window.api.getScanStatus()
        if (isScanningOnBackend && !get().isScanning) {
          await get().executeScan([], false)
        }
      }
    } catch {
      // Best-effort check on mount
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
    if (payload.error) {
      toast.error("AI Indexing Error", {
        id: "ai-indexing-error",
        description: payload.error,
      })
    }
    if (!payload.isIndexing) {
      useScanStore.getState().checkAIStatus()
    }
  })
}

if (typeof window !== "undefined" && window.api?.onFolderCountsUpdated) {
  window.api.onFolderCountsUpdated((counts) => {
    const map = new Map(useScanStore.getState().folderCounts)
    for (const item of counts) {
      map.set(item.path, item)
    }
    useScanStore.setState({ folderCounts: map })
  })
}

// Check for crash-interrupted scans on app startup and notify the user
if (typeof window !== "undefined" && window.api?.checkScanInterrupted) {
  window.api.checkScanInterrupted().then((wasInterrupted) => {
    if (wasInterrupted) {
      toast.warning("Previous scan was interrupted", {
        id: "scan-interrupted-toast",
        description: "The app stopped unexpectedly during a scan. Please rescan your folders to ensure your library is up to date.",
        duration: 10000,
      })
    }
  }).catch(() => {})
}

import { BrowserWindow } from "electron"
import fs from "fs/promises"
import nodeFs from "fs"
import path from "path"
import crypto from "crypto"
import { MediaRepository } from "../repositories/media.repository"
import { SettingsService } from "./settings.service"
import { MetadataService, type ScanFileData } from "./metadata.service"
import { QualityService } from "./quality.service"
import { ThumbnailService } from "./thumbnail.service"
import { DuplicateService } from "./duplicate.service"
import { SimilarityService } from "./similarity.service"
import { analyzeImage } from "../infrastructure/image-processor"
import { type Result, ok, fail } from "../../shared/types/results"
import type { MediaItem } from "../../shared/types/media"
import { IPC_CHANNELS, type FolderCountResult, type FileChangeEvent } from "../../shared/types/ipc"
import { ENABLE_AI_FEATURES } from "../../shared/constants"
import { initDatabase } from "../infrastructure/database"

import { aiIndexerService } from "./ai-indexer.service"

export class ScannerService {
  private mediaRepository = new MediaRepository()
  private settingsService = new SettingsService()
  private metadataService = new MetadataService()
  private qualityService = new QualityService()
  private thumbnailService = new ThumbnailService()
  private duplicateService = new DuplicateService()
  private similarityService = new SimilarityService()
  private aiIndexerService = aiIndexerService

  private isScanning = false
  private isCancelled = false
  private activeWatchers = new Map<string, nodeFs.FSWatcher>()
  private watchDebounceTimers = new Map<string, NodeJS.Timeout>()
  private changedFolders = new Set<string>()
  private folderChangeLogs = new Map<string, FileChangeEvent[]>()
  private folderFileBaseline = new Map<
    string,
    Map<string, { size: number; mtime: number }>
  >()
  private folderNetChanges = new Map<
    string,
    Map<string, "added" | "deleted" | "modified">
  >()

  public getIsScanning(): boolean {
    return this.isScanning
  }

  public cancelScan(): void {
    if (this.isScanning) {
      this.isCancelled = true
      this.aiIndexerService.stopIndexing()
    }
  }

  /**
   * Persists a flag in the database indicating a scan is in progress.
   * Used to detect crash-interrupted scans on next app startup.
   */
  private markScanInProgress(): void {
    try {
      const db = initDatabase()
      db.prepare(`
        INSERT INTO settings (key, value)
        VALUES ('scan_in_progress', '1')
        ON CONFLICT(key) DO UPDATE SET value = '1'
      `).run()
    } catch {
      // Non-critical — best-effort crash detection
    }
  }

  private clearScanInProgress(): void {
    try {
      const db = initDatabase()
      db.prepare(`DELETE FROM settings WHERE key = 'scan_in_progress'`).run()
    } catch {
      // Non-critical
    }
  }

  public isScanInterrupted(): boolean {
    try {
      const db = initDatabase()
      const row = db.prepare(`SELECT value FROM settings WHERE key = 'scan_in_progress'`).get() as { value: string } | undefined
      return row?.value === "1"
    } catch {
      return false
    }
  }

  /**
   * Initializes or refreshes the baseline file map for a root folder from the SQLite database.
   */
  private normalizePath(p: string): string {
    return p.replace(/\\/g, "/").toLowerCase()
  }

  /**
   * Initializes or refreshes the baseline file map for a root folder from the SQLite database.
   */
  private initFolderBaseline(rootPath: string): Map<string, { size: number; mtime: number }> {
    const normRoot = this.normalizePath(rootPath)
    const dbItems = this.mediaRepository.getByFolderPath(rootPath)
    const map = new Map<string, { size: number; mtime: number }>()
    for (const item of dbItems) {
      if (item.path) {
        const normPath = this.normalizePath(item.path)
        const mtimeNum = item.dateModified
          ? typeof item.dateModified === "number"
            ? item.dateModified
            : new Date(item.dateModified).getTime()
          : 0
        map.set(normPath, {
          size: item.size,
          mtime: mtimeNum,
        })
      }
    }
    this.folderFileBaseline.set(normRoot, map)

    // Restore any persisted pending changes from SQLite DB across app restarts
    const persisted = this.mediaRepository.getPendingChanges(rootPath)
    if (persisted.length > 0) {
      let netChangesMap = this.folderNetChanges.get(normRoot)
      if (!netChangesMap) {
        netChangesMap = new Map()
        this.folderNetChanges.set(normRoot, netChangesMap)
      }
      for (const item of persisted) {
        netChangesMap.set(this.normalizePath(item.filePath), item.changeType)
      }
      this.changedFolders.add(normRoot)

      const logs: FileChangeEvent[] = []
      for (const [p, type] of netChangesMap.entries()) {
        logs.push({
          timestamp: Date.now(),
          type,
          path: p,
          filename: path.basename(p),
        })
      }
      this.folderChangeLogs.set(normRoot, logs)
    }

    return map
  }

  /**
   * Listens for filesystem changes across configured root folders using native OS watchers.
   * Performs an immediate initial background count and automatically re-counts media files when
   * changes are detected (debounced to avoid performance impact).
   */
  public watchFolders(window: BrowserWindow, rootPaths: string[]): void {
    const normRootPaths = rootPaths.map((p) => this.normalizePath(p))

    // Stop watchers for paths no longer in settings
    for (const [watchedPath, watcher] of this.activeWatchers.entries()) {
      if (!normRootPaths.includes(watchedPath)) {
        try {
          watcher.close()
        } catch {
          // Ignore close errors
        }
        this.activeWatchers.delete(watchedPath)
        this.changedFolders.delete(watchedPath)
        this.folderChangeLogs.delete(watchedPath)
        this.folderFileBaseline.delete(watchedPath)
        this.folderNetChanges.delete(watchedPath)
        const timer = this.watchDebounceTimers.get(watchedPath)
        if (timer) clearTimeout(timer)
        this.watchDebounceTimers.delete(watchedPath)
      }
    }

    // Set up native OS watcher for each root folder
    for (const rootPath of rootPaths) {
      const normRoot = this.normalizePath(rootPath)
      if (this.activeWatchers.has(normRoot)) continue
      try {
        if (!nodeFs.existsSync(rootPath)) continue
        this.initFolderBaseline(rootPath)
        if (!this.folderNetChanges.has(normRoot)) {
          this.folderNetChanges.set(normRoot, new Map())
        }

        const watcher = nodeFs.watch(rootPath, { recursive: true }, async (_eventType, filename) => {
          if (!filename) return

          const settings = this.settingsService.getSettings()
          const supportedExts = new Set(
            settings.scanning.supportedExtensions.map((e) =>
              e.toLowerCase().replace(/^\./, "")
            )
          )
          const ext = path.extname(filename).toLowerCase().replace(/^\./, "")

          // Ignore files that are not supported media extensions
          if (!ext || !supportedExts.has(ext)) {
            return
          }

          const fullPath = path.join(rootPath, filename)
          const pathKey = this.normalizePath(fullPath)

          let baselineMap = this.folderFileBaseline.get(normRoot)
          if (!baselineMap) {
            baselineMap = this.initFolderBaseline(rootPath)
          }

          const baseline = baselineMap.get(pathKey)
          const initialExisted = !!baseline

          const exists = nodeFs.existsSync(fullPath)
          let netChangesMap = this.folderNetChanges.get(normRoot)
          if (!netChangesMap) {
            netChangesMap = new Map()
            this.folderNetChanges.set(normRoot, netChangesMap)
          }

          if (exists) {
            try {
              const stat = await fs.stat(fullPath)
              if (initialExisted && baseline) {
                // If file size AND mtime match DB baseline (within 2s tolerance), file is in baseline state
                const mtimeDiff = Math.abs(stat.mtimeMs - baseline.mtime)
                if (stat.size === baseline.size && (baseline.mtime === 0 || mtimeDiff < 2000)) {
                  netChangesMap.delete(pathKey)
                } else {
                  netChangesMap.set(pathKey, "modified")
                }
              } else {
                // File didn't exist in baseline
                netChangesMap.set(pathKey, "added")
              }
            } catch {
              // Ignore stat read race
            }
          } else {
            // File does not exist on disk
            if (initialExisted) {
              netChangesMap.set(pathKey, "deleted")
            } else {
              // Added then deleted - net effect 0
              netChangesMap.delete(pathKey)
            }
          }

          // Evaluate net changes
          if (netChangesMap.size === 0) {
            this.changedFolders.delete(normRoot)
            this.folderChangeLogs.delete(normRoot)
          } else {
            this.changedFolders.add(normRoot)
            const logs: FileChangeEvent[] = []
            for (const [p, type] of netChangesMap.entries()) {
              logs.push({
                timestamp: Date.now(),
                type,
                path: p,
                filename: path.basename(p),
              })
            }
            this.folderChangeLogs.set(normRoot, logs)
          }

          const existingTimer = this.watchDebounceTimers.get(normRoot)
          if (existingTimer) clearTimeout(existingTimer)

          const newTimer = setTimeout(async () => {
            if (!this.isWindowAlive(window)) return
            try {
              // Batched DB transaction write: sync all pending changes for this root folder at once
              const currentNetMap = this.folderNetChanges.get(normRoot)
              if (currentNetMap && currentNetMap.size > 0) {
                const changes = Array.from(currentNetMap.entries()).map(([p, type]) => ({
                  filePath: p,
                  changeType: type,
                }))
                this.mediaRepository.syncPendingChanges(rootPath, changes)
              } else {
                this.mediaRepository.clearPendingChanges(rootPath)
              }

              const counts = await this.countMediaFiles([rootPath])
              if (this.isWindowAlive(window)) {
                window.webContents.send(
                  IPC_CHANNELS.SCAN_FOLDER_COUNTS_UPDATED,
                  counts
                )
              }
            } catch {
              // Ignore background count errors
            }
          }, 1500)

          this.watchDebounceTimers.set(normRoot, newTimer)
        })
        this.activeWatchers.set(normRoot, watcher)
      } catch {
        // Fallback gracefully if recursive watch is unsupported or denied
      }
    }

    // Initial background count on startup
    if (rootPaths.length > 0) {
      this.countMediaFiles(rootPaths)
        .then((counts) => {
          if (this.isWindowAlive(window)) {
            window.webContents.send(
              IPC_CHANNELS.SCAN_FOLDER_COUNTS_UPDATED,
              counts
            )
          }
        })
        .catch(() => {})
    }
  }

  /**
   * Checks whether the BrowserWindow is still usable before emitting IPC events.
   */
  private isWindowAlive(window: BrowserWindow): boolean {
    return !window.isDestroyed() && !window.webContents.isDestroyed()
  }

  /**
   * Main scan orchestration method. Recursively scans folders, processes files, and updates DB/UI.
   */
  public async scanFolders(
    rootPaths: string[],
    window: BrowserWindow,
    forceRescan: boolean = false
  ): Promise<Result<void>> {
    if (this.isScanning) {
      return fail({ code: "UNKNOWN", message: "Scan already in progress" })
    }

    this.isScanning = true
    this.isCancelled = false
    this.markScanInProgress()

    try {
      const settings = this.settingsService.getSettings()
      const supportedExtensions = new Set(
        settings.scanning.supportedExtensions.map((ext) => ext.toLowerCase())
      )

      const excludePatterns = settings.scanning.excludePatterns

      // 1. Discover all file paths asynchronously
      const scanList: ScanFileData[] = []

      for (const root of rootPaths) {
        if (this.isCancelled) break
        await this.discoverFiles(
          root,
          supportedExtensions,
          excludePatterns,
          scanList
        )
      }

      // 2. Build cacheMap ONCE from ALL root paths before processing begins.
      //    This ensures cache hits work correctly for multi-root scans.
      const cacheMap = new Map<string, MediaItem>()
      if (!forceRescan) {
        for (const root of rootPaths) {
          const dbItems = this.mediaRepository.getByFolderPath(root)
          for (const item of dbItems) {
            cacheMap.set(item.path.toLowerCase(), item)
          }
        }
      }

      // Track discovered paths for pruning deleted files later
      const discoveredPaths = new Set<string>(
        scanList.map((f) => f.path.toLowerCase())
      )

      if (!this.isCancelled) {
        const totalCount = scanList.length
        let scannedCount = 0
        let lastProgressTime = 0
        const batchSize = settings.performance.scanBatchSize || 50
        const concurrency = Math.max(
          1,
          settings.performance.maxConcurrentOps || 4
        )

        const sendProgressThrottled = (file: ScanFileData, force = false) => {
          const now = Date.now()
          if (force || now - lastProgressTime >= 100) {
            lastProgressTime = now
            if (this.isWindowAlive(window)) {
              window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                scannedCount,
                totalCount,
                currentFile: file.name,
                items: [],
              })
            }
          }
        }

        // 3. Process discovered files in batches, with up to `concurrency` files in-flight at once
        for (let i = 0; i < totalCount; i += batchSize) {
          if (this.isCancelled) break

          const batch = scanList.slice(i, i + batchSize)
          const processedItems: MediaItem[] = []

          await this.processWithConcurrency(
            batch,
            concurrency,
            async (file) => {
              if (this.isCancelled) return

              try {
                const cached = cacheMap.get(file.path.toLowerCase())
                const isOldThumb =
                  cached &&
                  cached.thumbnailPath &&
                  !cached.thumbnailPath.endsWith("_v2.webp")
                // Cache hit: size AND mtime both match, and the thumbnail format is current
                if (
                  cached &&
                  cached.size === file.size &&
                  cached.dateModified === file.mtime &&
                  !isOldThumb
                ) {
                  scannedCount++
                  sendProgressThrottled(file)
                  return
                }

                // Cache miss: extract metadata, run quality, and generate thumbnail
                const metaRes = await this.metadataService.extractMetadata(file)
                if (!metaRes.ok) {
                  scannedCount++
                  sendProgressThrottled(file)
                  return
                }

                const meta = metaRes.data

                // Create compressed thumbnail cache file FIRST to allow video hash generation from thumbnail frame
                let thumbnailPath = undefined
                const thumbRes =
                  await this.thumbnailService.getOrCreateThumbnail(
                    file.path,
                    file.id,
                    file.mediaType
                  )
                if (thumbRes.ok) {
                  thumbnailPath = thumbRes.data
                }

                // Analyze quality metrics (blur, darkness, screenshot, composite score)
                const qualityRes = await this.qualityService.analyzeItem(
                  file.path,
                  file.mediaType,
                  file.size,
                  file.name,
                  meta.width,
                  meta.height,
                  settings.quality
                )

                let quality = undefined
                let hash = undefined
                if (qualityRes.ok) {
                  quality = qualityRes.data.quality
                  hash = qualityRes.data.hash
                }

                // For videos, derive the perceptual hash from the generated thumbnail frame
                if (file.mediaType === "video" && thumbnailPath) {
                  try {
                    const analysisRes = await analyzeImage(thumbnailPath)
                    if (analysisRes.ok) {
                      hash = analysisRes.data.hash
                    }
                  } catch {
                    // Fail silently — keep hash undefined
                  }
                }

                const item: MediaItem = {
                  id: file.id,
                  path: file.path,
                  name: file.name,
                  size: file.size,
                  extension: file.extension,
                  mediaType: file.mediaType,
                  width: meta.width,
                  height: meta.height,
                  dateAdded: cached?.dateAdded ?? new Date().toISOString(),
                  dateOriginal: meta.dateOriginal ?? undefined,
                  dateInferred: meta.dateInferred ?? undefined,
                  dateFileSystem:
                    meta.dateFileSystem ?? new Date().toISOString(),
                  dateTarget: meta.dateTarget ?? new Date().toISOString(),
                  dateTargetSource: meta.dateTargetSource ?? "filesystem",
                  hash,
                  thumbnailPath,
                  dateModified: file.mtime,
                  quality,
                  isDuplicate: false,
                  isBestInDuplicateGroup: false,
                  // Preserve existing review state for changed files so user's decisions aren't reset
                  reviewState: cached?.reviewState ?? "pending",
                  reviewedAt: cached?.reviewedAt,
                }

                processedItems.push(item)

                scannedCount++
                sendProgressThrottled(file)
              } catch {
                scannedCount++
                sendProgressThrottled(file)
              }
            }
          )

          // Yield to event loop between batches so IPC + window stay responsive
          await new Promise(r => setImmediate(r))

          // Save batch to SQLite and stream new items to the frontend
          if (processedItems.length > 0) {
            this.mediaRepository.upsertMany(processedItems)

            // Yield after synchronous DB write to let IPC messages drain
            await new Promise(r => setImmediate(r))

            if (this.isWindowAlive(window)) {
              window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                scannedCount,
                totalCount,
                currentFile: batch[batch.length - 1]?.name,
                items: processedItems,
              })
            }
          }
        }
      }

      // 4. Prune files that were removed from disk since the last scan.
      //    Only runs on a full (non-cancelled) scan — a partial scan hasn't visited
      //    all paths yet, so we must not delete items that simply weren't reached.
      if (!this.isCancelled) {
        const deletedPaths: string[] = []
        for (const [normPath, cachedItem] of cacheMap.entries()) {
          if (!discoveredPaths.has(normPath)) {
            deletedPaths.push(cachedItem.path)
          }
        }
        if (deletedPaths.length > 0) {
          this.mediaRepository.deleteMany(deletedPaths)
        }

        // Record lastScannedMtime timestamp and clear changed flag for fully scanned roots
        const currentSettings = this.settingsService.getSettings()
        const updatedRoots = currentSettings.folders.roots.map((r) => {
          if (rootPaths.some((p) => p.toLowerCase() === r.path.toLowerCase())) {
            let mtime = Date.now()
            try {
              if (nodeFs.existsSync(r.path)) {
                mtime = nodeFs.statSync(r.path).mtimeMs
              }
            } catch {
              // fallback
            }
            return { ...r, lastScannedMtime: mtime }
          }
          return r
        })
        this.settingsService.saveSettings({
          ...currentSettings,
          folders: { ...currentSettings.folders, roots: updatedRoots },
        })

        for (const root of rootPaths) {
          const normRoot = this.normalizePath(root)
          this.changedFolders.delete(normRoot)
          this.folderChangeLogs.delete(normRoot)
          this.folderFileBaseline.delete(normRoot)
          this.folderNetChanges.delete(normRoot)
          this.mediaRepository.clearPendingChanges(root)
        }
      }

      // 5. Signal scan completion to the frontend IMMEDIATELY so the UI unlocks.
      //    Post-scan analysis (duplicates + similarity) runs asynchronously after.
      this.isScanning = false

      if (this.isWindowAlive(window)) {
        window.webContents.send(IPC_CHANNELS.SCAN_COMPLETE)
      }

      // 6. Post-scan duplicate + similarity analysis runs in the background.
      //    Wrapped in setImmediate to yield the event loop so IPC messages drain first.
      const allEnabledRoots = settings.folders.roots
        .filter((r) => r.enabled)
        .map((r) => r.path)
      const foldersToAnalyze = allEnabledRoots.length > 0 ? allEnabledRoots : rootPaths

      setImmediate(async () => {
        try {
          await this.duplicateService.resolveDuplicatesInFolders(
            foldersToAnalyze,
            settings.quality.duplicateHashDistance
          )

          await this.similarityService.resolveSimilarityInFolders(foldersToAnalyze)

          // Notify renderer that post-processing is done so it can re-fetch updated items
          if (this.isWindowAlive(window)) {
            window.webContents.send(IPC_CHANNELS.SCAN_POST_PROCESSING_COMPLETE)
          }

          // Trigger background AI indexing queue post-scan
          if (ENABLE_AI_FEATURES && !this.isCancelled) {
            this.aiIndexerService.startIndexing(window, () => this.isScanning).catch(() => {})
          }
        } catch {
          // Post-processing failed silently — items are still indexed,
          // duplicates/similarity just won't be resolved this cycle.
          if (this.isWindowAlive(window)) {
            window.webContents.send(IPC_CHANNELS.SCAN_POST_PROCESSING_COMPLETE)
          }
        } finally {
          this.clearScanInProgress()
        }
      })

      return ok(undefined)
    } catch (e: unknown) {
      this.isScanning = false
      this.clearScanInProgress()
      // Attempt to notify the renderer even on an unexpected crash so the UI
      // doesn't get stuck in the 'scanning' state.
      if (this.isWindowAlive(window)) {
        window.webContents.send(IPC_CHANNELS.SCAN_COMPLETE)
      }
      return fail({
        code: "UNKNOWN",
        message: e instanceof Error ? e.message : "Scanning process crashed",
      })
    }
  }

  /**
   * Called when files have been deleted by Galleo itself (e.g., commit deletions).
   * Clears baseline and net change tracking for these paths so the internal watcher
   * and folder status checks do not report a recommended rescan for expected app deletions.
   */
  public async notifyFilesDeleted(
    deletedPaths: string[],
    window?: BrowserWindow
  ): Promise<void> {
    if (!deletedPaths || deletedPaths.length === 0) return

    const affectedNormRoots = new Set<string>()
    const affectedRootPaths = new Map<string, string>()

    const settings = this.settingsService.getSettings()
    const allRoots = settings.folders.roots.map((r) => ({
      path: r.path,
      normPath: this.normalizePath(r.path),
    }))

    for (const p of deletedPaths) {
      const normP = this.normalizePath(p)
      for (const rootObj of allRoots) {
        if (
          normP === rootObj.normPath ||
          normP.startsWith(rootObj.normPath + "/")
        ) {
          affectedNormRoots.add(rootObj.normPath)
          affectedRootPaths.set(rootObj.normPath, rootObj.path)

          const baselineMap = this.folderFileBaseline.get(rootObj.normPath)
          if (baselineMap) {
            baselineMap.delete(normP)
          }

          const netChangesMap = this.folderNetChanges.get(rootObj.normPath)
          if (netChangesMap) {
            netChangesMap.delete(normP)
            if (netChangesMap.size === 0) {
              this.changedFolders.delete(rootObj.normPath)
              this.folderChangeLogs.delete(rootObj.normPath)
            } else {
              const currentLog = this.folderChangeLogs.get(rootObj.normPath)
              if (currentLog) {
                const updatedLog = currentLog.filter(
                  (log) => this.normalizePath(log.path) !== normP
                )
                if (updatedLog.length > 0) {
                  this.folderChangeLogs.set(rootObj.normPath, updatedLog)
                } else {
                  this.folderChangeLogs.delete(rootObj.normPath)
                }
              }
            }
          }
        }
      }
    }

    for (const normRoot of affectedNormRoots) {
      const rootPath = affectedRootPaths.get(normRoot) || normRoot
      const netMap = this.folderNetChanges.get(normRoot)
      if (!netMap || netMap.size === 0) {
        this.changedFolders.delete(normRoot)
        this.folderChangeLogs.delete(normRoot)
        this.mediaRepository.clearPendingChanges(rootPath)
      }
    }

    if (affectedNormRoots.size > 0) {
      const currentSettings = this.settingsService.getSettings()
      const updatedRoots = currentSettings.folders.roots.map((r) => {
        const normR = this.normalizePath(r.path)
        if (affectedNormRoots.has(normR)) {
          let mtime = Date.now()
          try {
            if (nodeFs.existsSync(r.path)) {
              mtime = nodeFs.statSync(r.path).mtimeMs
            }
          } catch {
            // fallback
          }
          return { ...r, lastScannedMtime: mtime }
        }
        return r
      })

      this.settingsService.saveSettings({
        ...currentSettings,
        folders: { ...currentSettings.folders, roots: updatedRoots },
      })
    }

    if (affectedRootPaths.size > 0) {
      const rootPathsList = Array.from(affectedRootPaths.values())
      const counts = await this.countMediaFiles(rootPathsList)
      if (window && this.isWindowAlive(window)) {
        window.webContents.send(
          IPC_CHANNELS.SCAN_FOLDER_COUNTS_UPDATED,
          counts
        )
      }
    }
  }

  /**
   * Fast readdir-only media file count per root folder.
   * Does NOT read metadata, generate thumbnails, or write to the DB.
   * Uses the same extension filter and exclude patterns as a full scan so the
   * count is directly comparable to the DB item count for isPartial derivation.
   * Runs concurrently across roots for minimal wall-clock time.
   */
  public async countMediaFiles(
    rootPaths: string[]
  ): Promise<FolderCountResult[]> {
    const settings = this.settingsService.getSettings()
    const extensions = new Set(
      settings.scanning.supportedExtensions.map((e) => e.toLowerCase())
    )
    const excludePatterns = settings.scanning.excludePatterns

    const results = await Promise.all(
      rootPaths.map(async (root) => {
        const normRoot = this.normalizePath(root)
        const count = await this.countFilesInDir(root, extensions, excludePatterns)
        let needsRescan = this.changedFolders.has(normRoot)
        const changeLog = this.folderChangeLogs.get(normRoot) ?? []

        const rootConfig = settings.folders.roots.find(
          (r) => this.normalizePath(r.path) === normRoot
        )

        // 2-second timestamp buffer to prevent OS sub-second rounding false positives
        if (!needsRescan && rootConfig?.scanned && rootConfig?.lastScannedMtime) {
          try {
            if (nodeFs.existsSync(root)) {
              const currentMtime = nodeFs.statSync(root).mtimeMs
              if (currentMtime > rootConfig.lastScannedMtime + 2000) {
                needsRescan = true
              }
            }
          } catch {
            // ignore
          }
        }

        let rescanReason: string | undefined = undefined
        if (needsRescan) {
          if (changeLog.length > 0) {
            const added = changeLog.filter((e) => e.type === "added")
            const deleted = changeLog.filter((e) => e.type === "deleted")
            const modified = changeLog.filter((e) => e.type === "modified")

            const parts: string[] = []
            if (added.length > 0) {
              parts.push(`${added.length} file${added.length > 1 ? "s" : ""} added`)
            }
            if (deleted.length > 0) {
              parts.push(`${deleted.length} file${deleted.length > 1 ? "s" : ""} deleted`)
            }
            if (modified.length > 0) {
              parts.push(`${modified.length} file${modified.length > 1 ? "s" : ""} modified`)
            }
            rescanReason = parts.length > 0 ? parts.join(", ") : "Files changed on disk"
          } else {
            rescanReason = "Files changed on disk"
          }
        }

        return {
          path: root,
          count,
          needsRescan,
          rescanReason,
          changeLog: changeLog.length > 0 ? changeLog : undefined,
        }
      })
    )
    return results
  }

  private buildExcludeRegex(excludePatterns: string[]): RegExp | null {
    if (!excludePatterns || excludePatterns.length === 0) return null
    const escaped = excludePatterns
      .map((p) => p.replace(/\*/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .filter(Boolean)
    if (escaped.length === 0) return null
    return new RegExp(escaped.join("|"), "i")
  }

  /**
   * Iterative readdir traversal that counts matching files without stat calls.
   * Symlinks are skipped to match the behaviour of discoverFiles.
   */
  private async countFilesInDir(
    dir: string,
    extensions: Set<string>,
    excludePatterns: string[]
  ): Promise<number> {
    const stack = [dir]
    let count = 0
    const excludeRegex = this.buildExcludeRegex(excludePatterns)
    while (stack.length > 0) {
      const current = stack.pop()!
      try {
        const entries = await fs.readdir(current, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(current, entry.name)
          const normalized = fullPath.replace(/\\/g, "/")
          if ((excludeRegex && excludeRegex.test(normalized)) || entry.isSymbolicLink()) continue
          if (entry.isDirectory()) {
            stack.push(fullPath)
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).substring(1).toLowerCase()
            if (extensions.has(ext)) count++
          }
        }
      } catch {
        // Skip inaccessible directories gracefully
      }
    }
    return count
  }

  /**
   * Runs up to `concurrency` async tasks at once over an array of items.
   * Yields to the event loop between each item so IPC and window rendering stay responsive.
   */
  private async processWithConcurrency<T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<void>
  ): Promise<void> {
    let idx = 0
    const worker = async () => {
      while (idx < items.length) {
        const item = items[idx++]
        await fn(item)
        // Yield to the event loop after each file so the main thread can
        // process IPC messages, repaint the window, and handle user input
        await new Promise(r => setImmediate(r))
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, worker)
    )
  }

  /**
   * Helper to recursively traverse directories and discover media files.
   * Uses an iterative stack approach to avoid Call Stack Overflow errors.
   * fs.stat calls within each directory are parallelized via Promise.all.
   */
  private async discoverFiles(
    startDir: string,
    extensions: Set<string>,
    excludePatterns: string[],
    outList: ScanFileData[]
  ): Promise<void> {
    const stack: string[] = [startDir]
    let dirCount = 0
    const excludeRegex = this.buildExcludeRegex(excludePatterns)

    while (stack.length > 0) {
      if (this.isCancelled) break
      const currentDir = stack.pop()!

      dirCount++
      if (dirCount % 50 === 0) {
        await new Promise((r) => setImmediate(r))
      }

      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true })

        // Separate into directories (push to stack) and candidate files (stat in parallel)
        const candidateFiles: {
          entry: { name: string }
          fullPath: string
          normalizedPath: string
          ext: string
        }[] = []

        for (const entry of entries) {
          if (this.isCancelled) break

          const fullPath = path.join(currentDir, entry.name)
          const normalizedPath = fullPath.replace(/\\/g, "/")

          // Check if excluded by simple match
          if (excludeRegex && excludeRegex.test(normalizedPath)) {
            continue
          }

          if (entry.isSymbolicLink()) {
            continue
          }

          if (entry.isDirectory()) {
            stack.push(fullPath)
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).substring(1).toLowerCase()
            if (extensions.has(ext)) {
              candidateFiles.push({ entry, fullPath, normalizedPath, ext })
            }
          }
        }

        // Stat all candidate files in parallel
        if (candidateFiles.length > 0) {
          const statResults = await Promise.all(
            candidateFiles.map(({ fullPath }) =>
              fs.stat(fullPath).catch(() => null)
            )
          )

          for (let i = 0; i < candidateFiles.length; i++) {
            const stats = statResults[i]
            if (!stats) continue
            const { entry, normalizedPath, ext } = candidateFiles[i]
            const fileId = this.generateFileId(normalizedPath)
            const isVideo = ["mp4", "mov", "avi", "mkv", "webm"].includes(ext)
            outList.push({
              id: fileId,
              path: normalizedPath,
              name: entry.name,
              size: stats.size,
              mtime: stats.mtime.toISOString(),
              extension: ext,
              mediaType: isVideo ? "video" : "photo",
            })
          }
        }
      } catch {
        // Skip inaccessible folders gracefully
      }
    }
  }

  /**
   * Generates a deterministic unique ID for a file path (SHA256 hash).
   */
  private generateFileId(filePath: string): string {
    return crypto
      .createHash("sha256")
      .update(filePath.toLowerCase())
      .digest("hex")
  }
}

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
import { IPC_CHANNELS } from "../../shared/types/ipc"
import { ENABLE_AI_FEATURES } from "../../shared/constants"

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

  public cancelScan(): void {
    if (this.isScanning) {
      this.isCancelled = true
      this.aiIndexerService.stopIndexing()
    }
  }

  /**
   * Listens for filesystem changes across configured root folders using native OS watchers.
   * Performs an immediate initial background count and automatically re-counts media files when
   * changes are detected (debounced to avoid performance impact).
   */
  public watchFolders(window: BrowserWindow, rootPaths: string[]): void {
    // Stop watchers for paths no longer in settings
    for (const [watchedPath, watcher] of this.activeWatchers.entries()) {
      if (!rootPaths.includes(watchedPath)) {
        try {
          watcher.close()
        } catch {
          // Ignore close errors
        }
        this.activeWatchers.delete(watchedPath)
        this.changedFolders.delete(watchedPath)
        const timer = this.watchDebounceTimers.get(watchedPath)
        if (timer) clearTimeout(timer)
        this.watchDebounceTimers.delete(watchedPath)
      }
    }

    // Set up native OS watcher for each root folder
    for (const rootPath of rootPaths) {
      if (this.activeWatchers.has(rootPath)) continue
      try {
        if (!nodeFs.existsSync(rootPath)) continue
        const watcher = nodeFs.watch(rootPath, { recursive: true }, () => {
          this.changedFolders.add(rootPath)
          const existingTimer = this.watchDebounceTimers.get(rootPath)
          if (existingTimer) clearTimeout(existingTimer)

          const newTimer = setTimeout(async () => {
            if (!this.isWindowAlive(window)) return
            try {
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

          this.watchDebounceTimers.set(rootPath, newTimer)
        })
        this.activeWatchers.set(rootPath, watcher)
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
        const batchSize = settings.performance.scanBatchSize || 50
        const concurrency = Math.max(
          1,
          settings.performance.maxConcurrentOps || 4
        )

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
                  if (this.isWindowAlive(window)) {
                    window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                      scannedCount,
                      totalCount,
                      currentFile: file.name,
                      items: [],
                    })
                  }
                  return
                }

                // Cache miss: extract metadata, run quality, and generate thumbnail
                const metaRes = await this.metadataService.extractMetadata(file)
                if (!metaRes.ok) {
                  scannedCount++
                  if (this.isWindowAlive(window)) {
                    window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                      scannedCount,
                      totalCount,
                      currentFile: file.name,
                      items: [],
                    })
                  }
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

                if (this.isWindowAlive(window)) {
                  window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                    scannedCount,
                    totalCount,
                    currentFile: file.name,
                    items: [],
                  })
                }
              } catch {
                scannedCount++
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
          )

          // Save batch to SQLite and stream new items to the frontend
          if (processedItems.length > 0) {
            this.mediaRepository.upsertMany(processedItems)

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
        for (const root of rootPaths) {
          const dbItems = this.mediaRepository.getByFolderPath(root)
          for (const dbItem of dbItems) {
            if (!discoveredPaths.has(dbItem.path.toLowerCase())) {
              deletedPaths.push(dbItem.path)
            }
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
          this.changedFolders.delete(root)
        }
      }

      // 5. Post-scan duplicate + similarity analysis.
      //    Always runs — even on cancellation — so users can see results for the
      //    items that were already indexed and written to the database.
      const allEnabledRoots = settings.folders.roots
        .filter((r) => r.enabled)
        .map((r) => r.path)
      const foldersToAnalyze = allEnabledRoots.length > 0 ? allEnabledRoots : rootPaths

      this.duplicateService.resolveDuplicatesInFolders(
        foldersToAnalyze,
        settings.quality.duplicateHashDistance
      )

      // 6. Pre-calculate similarity sorting index
      this.similarityService.resolveSimilarityInFolders(foldersToAnalyze)

      // 7. Always signal completion to the frontend so it can clean up its scan
      //    state and load whatever items were indexed. Guard against a window that
      //    was closed before the scan finished (force-quit scenario).
      if (this.isWindowAlive(window)) {
        window.webContents.send(IPC_CHANNELS.SCAN_COMPLETE)
      }

      this.isScanning = false

      // Trigger background AI indexing queue post-scan once main scanning and analysis complete
      if (ENABLE_AI_FEATURES && !this.isCancelled) {
        this.aiIndexerService.startIndexing(window, () => this.isScanning).catch(() => {})
      }

      return ok(undefined)
    } catch (e: unknown) {
      this.isScanning = false
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
   * Fast readdir-only media file count per root folder.
   * Does NOT read metadata, generate thumbnails, or write to the DB.
   * Uses the same extension filter and exclude patterns as a full scan so the
   * count is directly comparable to the DB item count for isPartial derivation.
   * Runs concurrently across roots for minimal wall-clock time.
   */
  public async countMediaFiles(
    rootPaths: string[]
  ): Promise<{ path: string; count: number; needsRescan?: boolean }[]> {
    const settings = this.settingsService.getSettings()
    const extensions = new Set(
      settings.scanning.supportedExtensions.map((e) => e.toLowerCase())
    )
    const excludePatterns = settings.scanning.excludePatterns

    const results = await Promise.all(
      rootPaths.map(async (root) => {
        const count = await this.countFilesInDir(root, extensions, excludePatterns)
        let needsRescan = this.changedFolders.has(root)

        const rootConfig = settings.folders.roots.find(
          (r) => r.path.toLowerCase() === root.toLowerCase()
        )

        if (!needsRescan && rootConfig?.scanned && rootConfig?.lastScannedMtime) {
          try {
            if (nodeFs.existsSync(root)) {
              const currentMtime = nodeFs.statSync(root).mtimeMs
              if (currentMtime > rootConfig.lastScannedMtime) {
                needsRescan = true
              }
            }
          } catch {
            // ignore
          }
        }

        return {
          path: root,
          count,
          needsRescan,
        }
      })
    )
    return results
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
    while (stack.length > 0) {
      const current = stack.pop()!
      try {
        const entries = await fs.readdir(current, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(current, entry.name)
          const normalized = fullPath.replace(/\\/g, "/").toLowerCase()
          const shouldSkip = excludePatterns.some((p) =>
            normalized.includes(p.replace(/\*/g, "").toLowerCase())
          )
          if (shouldSkip || entry.isSymbolicLink()) continue
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

    while (stack.length > 0) {
      if (this.isCancelled) break
      const currentDir = stack.pop()!

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
          let shouldSkip = false
          for (const pattern of excludePatterns) {
            if (
              normalizedPath
                .toLowerCase()
                .includes(pattern.replace(/\*/g, "").toLowerCase())
            ) {
              shouldSkip = true
              break
            }
          }
          if (shouldSkip) continue

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

import { ipcMain, dialog, BrowserWindow, shell } from "electron"
import fs from "fs/promises"
import path from "path"
import { IPC_CHANNELS, type OrganizePreviewItem } from "../shared/types/ipc"
import { SettingsService } from "./services/settings.service"
import { ScannerService } from "./services/scanner.service"
import { FileOpsService } from "./services/file-ops.service"
import { SessionService } from "./services/session.service"
import { UpdateService } from "./services/update.service"
import { aiService } from "./services/ai.service"
import { aiIndexerService } from "./services/ai-indexer.service"
import { SearchEngineService } from "./services/search-engine.service"
import { MediaRepository } from "./repositories/media.repository"
import { planOrganization } from "./core/organization"
import { type Result, ok, fail } from "../shared/types/results"
import { DEFAULT_SETTINGS, ENABLE_AI_FEATURES } from "../shared/constants"
import { initDatabase } from "./infrastructure/database"
import { getThumbnailCacheDir } from "./infrastructure/image-processor"
 
export function registerIpcHandlers(window: BrowserWindow): void {
  const settingsService = new SettingsService()
  const scannerService = new ScannerService()
  const fileOpsService = new FileOpsService()
  const sessionService = new SessionService()
  const mediaRepository = new MediaRepository()
  const updateService = new UpdateService()
  const searchEngineService = new SearchEngineService()

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return settingsService.getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_, settings) => {
    const res = await settingsService.saveSettings(settings)
    const enabledRoots = settings.folders.roots
      .filter((r: any) => r.enabled)
      .map((r: any) => r.path)
    scannerService.watchFolders(window, enabledRoots)
    return res
  })

  // Start background folder watcher/sniffer for initial root directories
  const currentSettings = settingsService.getSettings()
  const initialEnabledRoots = currentSettings.folders.roots
    .filter((r) => r.enabled)
    .map((r) => r.path)
  scannerService.watchFolders(window, initialEnabledRoots)

  // Native Folder Picker Dialog
  ipcMain.handle(IPC_CHANNELS.FOLDERS_SELECT, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ["openDirectory"] })
      : await dialog.showOpenDialog({ properties: ["openDirectory"] })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // Scan control
  ipcMain.handle(
    IPC_CHANNELS.SCAN_START,
    async (event, rootPaths: string[], forceRescan?: boolean) => {
      const targetWin = getValidWindow(event, window)
      return await scannerService.scanFolders(
        rootPaths,
        targetWin,
        forceRescan
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCAN_CANCEL, () => {
    scannerService.cancelScan()
  })

  ipcMain.handle(
    IPC_CHANNELS.SCAN_COUNT_FOLDERS,
    (_event, rootPaths: string[]) => scannerService.countMediaFiles(rootPaths)
  )

  // Media queries
  ipcMain.handle(IPC_CHANNELS.MEDIA_GET, (_, folderPath: string) => {
    return mediaRepository.getByFolderPath(folderPath)
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_CLEAR_INDEX, (_, folderPath: string) => {
    try {
      mediaRepository.clearByFolder(folderPath)
      return ok(undefined)
    } catch (e: any) {
      return fail({
        code: "UNKNOWN",
        message: e.message || "Clearing folder index failed",
      })
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.MEDIA_UPDATE_REVIEWS,
    (_, { sessionId, updates, undoAction }) => {
      return sessionService.updateReviews(sessionId, updates, undoAction)
    }
  )

  // Review sessions checkpoints
  ipcMain.handle(
    IPC_CHANNELS.SESSION_GET_CHECKPOINT,
    (_, folderPath: string) => {
      return sessionService.getCheckpoint(folderPath)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SESSION_SAVE_CHECKPOINT, (_, checkpoint) => {
    return sessionService.saveCheckpoint(checkpoint)
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_CLEAR, (_, folderPath: string) => {
    return sessionService.clearSession(folderPath)
  })

  // Organization Planning & Execution
  ipcMain.handle(
    IPC_CHANNELS.ORGANIZE_PREVIEW,
    async (
      _,
      { folderPath, destination, pattern }
    ): Promise<Result<OrganizePreviewItem[]>> => {
      try {
        const items = mediaRepository.getByFolderPath(folderPath)

        // Find existing files in destination directory to avoid collisions
        const existing = new Set<string>()
        if (await dirExists(destination)) {
          await scanFilesFlat(destination, existing)
        }

        const plan = planOrganization({
          items,
          destinationDir: destination,
          pattern,
          existingFilePaths: existing,
        })

        return ok(plan)
      } catch (e: any) {
        return fail({
          code: "UNKNOWN",
          message: e.message || "Organization preview planning failed",
        })
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.ORGANIZE_EXECUTE,
    async (event, { previewItems, preserveOriginals }) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const settings = settingsService.getSettings()
      const rootPaths = settings.folders.roots.map((r) => r.path)
      return await fileOpsService.executeOrganization(
        previewItems,
        preserveOriginals,
        win || window,
        rootPaths
      )
    }
  )

  // File Utilities
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, (_, filePath: string) => {
    return fileOpsService.openFile(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.FILE_SHOW, (_, filePath: string) => {
    return fileOpsService.showFile(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_TRASH, (_, paths: string[]) => {
    return fileOpsService.trashFiles(paths)
  })

  // Granular App Resetting Handlers
  ipcMain.handle(
    IPC_CHANNELS.APP_RESET,
    async (
      _,
      { settings, database, cache, sessions }
    ): Promise<Result<void>> => {
      try {
        const db = initDatabase()

        if (settings) {
          const serialized = JSON.stringify(DEFAULT_SETTINGS)
          const stmt = db.prepare(`
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `)
          stmt.run("app_settings", serialized)
        }

        if (database) {
          db.prepare("DELETE FROM media_items").run()
        }

        if (sessions) {
          db.prepare("DELETE FROM sessions").run()
        }

        if (cache) {
          db.prepare("UPDATE media_items SET thumbnail_path = NULL").run()
          const cacheDir = getThumbnailCacheDir()
          await fs.rm(cacheDir, { recursive: true, force: true })
          await fs.mkdir(cacheDir, { recursive: true })
        }

        return ok(undefined)
      } catch (e: any) {
        return fail({
          code: "UNKNOWN",
          message: e.message || "App reset failed",
        })
      }
    }
  )

  // App Update Checker Handlers
  ipcMain.handle(IPC_CHANNELS.APP_CHECK_UPDATE, async (_, force?: boolean) => {
    return await updateService.checkForUpdates(force)
  })

  ipcMain.handle(IPC_CHANNELS.URL_OPEN, (_, url: string) => {
    try {
      if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) {
        return fail({
          code: "INVALID_URL",
          message: "Only HTTP(S) URLs are permitted",
        })
      }
      shell.openExternal(url.trim())
      return ok(undefined)
    } catch (e: any) {
      return fail({
        code: "UNKNOWN",
        message: e.message || "Opening URL failed",
      })
    }
  })

  // AI & Visual Search IPC Handlers
  ipcMain.handle(IPC_CHANNELS.SEARCH_SEMANTIC, async (_, params) => {
    return await searchEngineService.search(params)
  })

  ipcMain.handle(
    IPC_CHANNELS.SEARCH_FIND_SIMILAR,
    async (_, { mediaId, limit }) => {
      return await searchEngineService.findSimilar(mediaId, limit)
    }
  )

  ipcMain.handle(IPC_CHANNELS.AI_MODEL_STATUS, () => {
    if (!ENABLE_AI_FEATURES) {
      return { isDownloaded: false, stats: { mediaEmbeddingCount: 0, videoFrameEmbeddingCount: 0 } }
    }
    return aiService.getStatus()
  })

  ipcMain.handle(IPC_CHANNELS.AI_DOWNLOAD_MODEL, async (event) => {
    if (!ENABLE_AI_FEATURES) {
      return fail({
        code: "UNKNOWN",
        message: "AI features are disabled via feature flag.",
      })
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    try {
      await aiService.downloadModel((progress) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.AI_DOWNLOAD_PROGRESS, progress)
        }
      })
      return ok(undefined)
    } catch (e: unknown) {
      return fail({
        code: "UNKNOWN",
        message: e instanceof Error ? e.message : "Downloading AI model failed",
      })
    }
  })

  ipcMain.handle(IPC_CHANNELS.AI_PURGE_CACHE, async (_, options?: { deleteModel?: boolean }) => {
    if (!ENABLE_AI_FEATURES) {
      return ok(undefined)
    }
    try {
      aiIndexerService.stopIndexing()
      await aiService.purgeEmbeddings(options)
      return ok(undefined)
    } catch (e: unknown) {
      return fail({
        code: "UNKNOWN",
        message: e instanceof Error ? e.message : "Purging AI index failed",
      })
    }
  })

  ipcMain.handle(IPC_CHANNELS.AI_START_INDEXING, async (event) => {
    if (!ENABLE_AI_FEATURES) {
      return fail({
        code: "UNKNOWN",
        message: "AI features are disabled via feature flag.",
      })
    }
    const targetWin = getValidWindow(event, window)
    try {
      aiIndexerService.startIndexing(targetWin).catch(() => {})
      return ok(undefined)
    } catch (e: unknown) {
      return fail({
        code: "UNKNOWN",
        message: e instanceof Error ? e.message : "Starting indexing failed",
      })
    }
  })
}

function getValidWindow(
  event: Electron.IpcMainInvokeEvent,
  defaultWindow: BrowserWindow
): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender)
  const target = win || defaultWindow
  if (!target || target.isDestroyed()) return defaultWindow
  return target
}

// Utility to recursively discover files for duplicate target detection in organization preview
async function scanFilesFlat(dir: string, outSet: Set<string>, maxDepth: number = 10): Promise<void> {
  const queue: Array<{ path: string; depth: number }> = [{ path: dir, depth: 0 }]
  while (queue.length > 0) {
    const item = queue.shift()!
    if (item.depth > maxDepth) continue
    try {
      const entries = await fs.readdir(item.path, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue
        const fullPath = path.join(item.path, entry.name)
        if (entry.isDirectory()) {
          queue.push({ path: fullPath, depth: item.depth + 1 })
        } else if (entry.isFile()) {
          outSet.add(fullPath.replace(/\\/g, "/").toLowerCase())
        }
      }
    } catch {}
  }
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath)
    return true
  } catch {
    return false
  }
}

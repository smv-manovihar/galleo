import { shell, BrowserWindow } from "electron"
import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { MediaRepository } from "../repositories/media.repository"
import type { MediaItem } from "../../shared/types/media"
import {
  fileExists,
  moveFile,
  copyFile,
  moveToTrash,
  checkAvailableDiskSpace,
} from "../infrastructure/file-system"
import { type Result, ok, fail } from "../../shared/types/results"
import {
  type OrganizePreviewItem,
  type OrganizeProgressPayload,
  type TrashProgressPayload,
  type TrashStatusPayload,
  IPC_CHANNELS,
} from "../../shared/types/ipc"

export class FileOpsService {
  private mediaRepository = new MediaRepository()
  private isTrashing = false
  private currentTrashProgress: TrashProgressPayload | null = null

  public getTrashStatus(): TrashStatusPayload {
    return {
      isTrashing: this.isTrashing,
      progress: this.currentTrashProgress,
    }
  }

  /**
   * Opens the file in the OS default application.
   */
  public async openFile(filePath: string): Promise<Result<void>> {
    try {
      const exists = await fileExists(filePath)
      if (!exists) {
        return fail({ code: "FILE_NOT_FOUND", path: filePath })
      }
      const errorMsg = await shell.openPath(filePath)
      if (errorMsg && errorMsg.trim().length > 0) {
        return fail({
          code: "UNKNOWN",
          message: errorMsg,
        })
      }
      return ok(undefined)
    } catch (e: unknown) {
      const err = e as Error
      return fail({
        code: "UNKNOWN",
        message: err.message || "Opening file failed",
      })
    }
  }

  /**
   * Highlights the file in the default OS file manager (Explorer).
   */
  public async showFile(filePath: string): Promise<Result<void>> {
    try {
      const exists = await fileExists(filePath)
      if (!exists) {
        return fail({ code: "FILE_NOT_FOUND", path: filePath })
      }
      shell.showItemInFolder(filePath)
      return ok(undefined)
    } catch (e: unknown) {
      const err = e as Error
      return fail({
        code: "UNKNOWN",
        message: err.message || "Highlighting file failed",
      })
    }
  }

  /**
   * Trashes a list of media paths safely (moves them to the OS Recycle Bin).
   */
  public async trashFiles(
    paths: string[],
    window?: BrowserWindow
  ): Promise<Result<void>> {
    this.isTrashing = true
    this.currentTrashProgress = {
      processedCount: 0,
      totalCount: paths.length,
    }

    try {
      const failures: string[] = []
      const successfulPaths: string[] = []
      const totalCount = paths.length

      let lastProgressTime = 0
      for (let i = 0; i < totalCount; i++) {
        const p = paths[i]
        const res = await moveToTrash(p)
        if (res.ok) {
          successfulPaths.push(p)
        } else {
          failures.push(p)
        }

        this.currentTrashProgress = {
          processedCount: i + 1,
          totalCount,
          currentPath: p,
        }

        const now = Date.now()
        const isLast = i === totalCount - 1
        if (window && !window.isDestroyed() && (isLast || now - lastProgressTime >= 100)) {
          lastProgressTime = now
          window.webContents.send(IPC_CHANNELS.MEDIA_TRASH_PROGRESS, {
            processedCount: i + 1,
            totalCount,
            currentPath: p,
          })
        }
      }

      // Sync metadata: remove successfully deleted files from local database
      if (successfulPaths.length > 0) {
        this.mediaRepository.deleteMany(successfulPaths)
      }

      if (window && !window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.MEDIA_TRASH_COMPLETE, {
          successCount: successfulPaths.length,
          failedPaths: failures.length > 0 ? failures : null,
        })
      }

      if (failures.length > 0) {
        return fail({
          code: "UNKNOWN",
          message: `Failed to move ${failures.length} of ${paths.length} files to trash: ${failures.slice(0, 3).join(", ")}${failures.length > 3 ? "..." : ""}`,
          data: { successfulPaths },
        })
      }

      return ok(undefined)
    } catch (e: unknown) {
      const err = e as Error
      return fail({
        code: "UNKNOWN",
        message: err.message || "Delete operation crashed",
      })
    } finally {
      this.isTrashing = false
      this.currentTrashProgress = null
    }
  }

  /**
   * Returns true if the given absolute file path is located inside
   * any of the tracked root folders.
   */
  private isUnderRoots(filePath: string, rootPaths: string[]): boolean {
    const normalized = filePath.replace(/\\/g, "/").toLowerCase()
    return rootPaths.some((root) => {
      const normalizedRoot = root
        .replace(/\\/g, "/")
        .toLowerCase()
        .replace(/\/$/, "")
      return normalized.startsWith(normalizedRoot + "/")
    })
  }

  /**
   * Executes the planned date organization (moving or copying files into new date subfolders).
   */
  public async executeOrganization(
    previewItems: OrganizePreviewItem[],
    preserveOriginals: boolean,
    window: BrowserWindow,
    rootPaths: string[]
  ): Promise<Result<void>> {
    try {
      const totalCount = previewItems.length
      let processedCount = 0

      // 1. Calculate total bytes to move/copy for disk space pre-check
      let totalBytes = 0
      for (const item of previewItems) {
        try {
          const stat = await fs.stat(item.sourcePath)
          totalBytes += stat.size
        } catch {
          // ignore
        }
      }

      // Check space on target drive only if copying (preserveOriginals) or moving across different drive volumes
      const isCrossVolume = previewItems.some(
        (item) =>
          path.parse(item.sourcePath).root.toLowerCase() !==
          path.parse(item.targetPath).root.toLowerCase()
      )

      if (previewItems.length > 0 && (preserveOriginals || isCrossVolume)) {
        const destParent = path.dirname(previewItems[0].targetPath)
        const spaceCheck = await checkAvailableDiskSpace(destParent, totalBytes)
        if (spaceCheck.ok === false) {
          return fail(spaceCheck.error)
        }
      }

      // Pre-fetch all involved media items in a single query upfront
      const mediaMap = this.mediaRepository.getByIds(
        previewItems.map((i) => i.mediaId)
      )
      const pathsToDelete: string[] = []
      const itemsToUpsert: MediaItem[] = []
      const movesToApply: Array<{
        oldPath: string
        newPath: string
        newName: string
        newExtension: string
      }> = []

      // 2. Process operations one by one (fault-tolerant loop)
      for (const item of previewItems) {
        processedCount++
        let success = false
        let errorMsg = undefined

        try {
          const srcExists = await fileExists(item.sourcePath)
          if (!srcExists) {
            errorMsg = "Source file missing"
          } else {
            // Check target folder exists or create it
            const destDir = path.dirname(item.targetPath)
            await fs.mkdir(destDir, { recursive: true })

            if (preserveOriginals) {
              const res = await copyFile(item.sourcePath, item.targetPath)
              success = res.ok
              if (res.ok === false) errorMsg = res.error.code
            } else {
              const res = await moveFile(item.sourcePath, item.targetPath)
              success = res.ok
              if (res.ok === false) errorMsg = res.error.code
            }

            // 3. Accumulate SQLite cache updates
            if (success) {
              const mediaItem = mediaMap.get(item.mediaId)
              if (preserveOriginals) {
                // Copy mode: if the target is inside a tracked root, add a new DB entry for the copy
                if (mediaItem && this.isUnderRoots(item.targetPath, rootPaths)) {
                  const targetHashId = crypto
                    .createHash("sha256")
                    .update(item.targetPath.toLowerCase())
                    .digest("hex")
                  itemsToUpsert.push({
                    ...mediaItem,
                    id: targetHashId,
                    path: item.targetPath,
                  })
                }
              } else {
                // Move mode: update path in-place to preserve FK embeddings if within tracked roots
                if (this.isUnderRoots(item.targetPath, rootPaths)) {
                  movesToApply.push({
                    oldPath: item.sourcePath,
                    newPath: item.targetPath,
                    newName: path.basename(item.targetPath),
                    newExtension: path
                      .extname(item.targetPath)
                      .replace(/^\./, "")
                      .toLowerCase(),
                  })
                } else {
                  pathsToDelete.push(item.sourcePath)
                }
              }
            }
          }
        } catch (err: unknown) {
          const e = err as Error
          success = false
          errorMsg = e.message || "Operation failed"
        }

        // Stream progress event to React
        const progressPayload: OrganizeProgressPayload = {
          processedCount,
          totalCount,
          currentFile: path.basename(item.sourcePath),
          success,
          error: errorMsg,
        }
        window.webContents.send(IPC_CHANNELS.ORGANIZE_PROGRESS, progressPayload)
      }

      // 4. Commit batched database transactions
      if (pathsToDelete.length > 0) {
        this.mediaRepository.deleteMany(pathsToDelete)
      }
      if (movesToApply.length > 0) {
        this.mediaRepository.updateMovedFiles(movesToApply)
      }
      if (itemsToUpsert.length > 0) {
        this.mediaRepository.upsertMany(itemsToUpsert)
      }

      return ok(undefined)
    } catch (e: unknown) {
      const err = e as Error
      return fail({
        code: "UNKNOWN",
        message: err.message || "Organization execution crashed",
      })
    }
  }
}

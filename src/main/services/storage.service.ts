import fs from "fs/promises"
import path from "path"
import { getDatabasePath } from "../infrastructure/database"
import { getThumbnailCacheDir } from "../infrastructure/image-processor"
import type { AppStorageUsage } from "../../shared/types/ipc"

export class StorageService {
  private cachedUsage: AppStorageUsage | null = null
  private lastComputedAt: number = 0
  private cacheTtlMs: number = 30_000 // 30-second TTL
  private pendingPromise: Promise<AppStorageUsage> | null = null
  private cacheVersion: number = 0

  /**
   * Retrieves disk space usage for SQLite database and cached thumbnails.
   * Uses cached stats if available and within TTL unless `force` is true.
   */
  public async getStorageUsage(force = false): Promise<AppStorageUsage> {
    const now = Date.now()
    if (
      !force &&
      this.cachedUsage &&
      now - this.lastComputedAt < this.cacheTtlMs
    ) {
      return this.cachedUsage
    }

    // Deduplicate in-flight compute requests
    if (this.pendingPromise && !force) {
      return this.pendingPromise
    }

    const currentVersion = this.cacheVersion
    this.pendingPromise = this.computeStorageUsage()
      .then((usage) => {
        if (this.cacheVersion === currentVersion) {
          this.cachedUsage = usage
          this.lastComputedAt = Date.now()
        }
        this.pendingPromise = null
        return usage
      })
      .catch((err) => {
        this.pendingPromise = null
        throw err
      })

    return this.pendingPromise
  }

  /**
   * Invalidates cached storage calculations so next fetch computes fresh metrics.
   */
  public invalidateCache(): void {
    this.cacheVersion++
    this.cachedUsage = null
    this.lastComputedAt = 0
    this.pendingPromise = null
  }

  /**
   * Computes the current storage footprint across DB files and thumbnail directory.
   */
  private async computeStorageUsage(): Promise<AppStorageUsage> {
    let databaseBytes = 0
    try {
      const dbPath = getDatabasePath()
      for (const suffix of ["", "-wal", "-shm"]) {
        try {
          const stat = await fs.stat(dbPath + suffix)
          databaseBytes += stat.size
        } catch {
          // file doesn't exist
        }
      }
    } catch {
      // ignore database path resolution error
    }

    let thumbnailBytes = 0
    let thumbnailCount = 0
    try {
      const cacheDir = getThumbnailCacheDir()
      const stack = [cacheDir]

      while (stack.length > 0) {
        const current = stack.pop()!
        try {
          const entries = await fs.readdir(current, { withFileTypes: true })
          const filePaths: string[] = []
          for (const entry of entries) {
            const full = path.join(current, entry.name)
            if (entry.isDirectory()) {
              stack.push(full)
            } else if (entry.isFile()) {
              filePaths.push(full)
            }
          }

          // Process file stats in concurrent batches of 50
          const batchSize = 50
          for (let i = 0; i < filePaths.length; i += batchSize) {
            const chunk = filePaths.slice(i, i + batchSize)
            const stats = await Promise.allSettled(
              chunk.map((fp) => fs.stat(fp))
            )
            for (const res of stats) {
              if (res.status === "fulfilled") {
                thumbnailBytes += res.value.size
                thumbnailCount++
              }
            }
          }
        } catch {
          // ignore directory read error
        }
      }
    } catch {
      // ignore thumbnail cache dir resolution error
    }

    return {
      databaseBytes,
      thumbnailBytes,
      thumbnailCount,
      totalBytes: databaseBytes + thumbnailBytes,
    }
  }
}

export const storageService = new StorageService()

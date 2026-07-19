import type { Database } from "better-sqlite3"
import type {
  MediaItem,
  MediaType,
  QualityMetrics,
} from "../../shared/types/media"
import { initDatabase } from "../infrastructure/database"

export class MediaRepository {
  private getDb(): Database {
    return initDatabase()
  }

  /**
   * Helper to map a database row to a MediaItem model object
   */
  private rowToMediaItem(row: any): MediaItem {
    let quality: QualityMetrics | undefined = undefined

    if (row.blur_score !== null) {
      quality = {
        blurScore: row.blur_score,
        brightness: row.brightness,
        isDark: Boolean(row.is_dark),
        isBlurry: Boolean(row.is_blurry),
        isScreenshot: Boolean(row.is_screenshot),
        isSmall: Boolean(row.is_small),
        compositeScore: row.composite_score,
      }
    }

    return {
      id: row.id,
      path: row.path,
      name: row.name,
      size: row.size,
      extension: row.extension,
      mediaType: row.media_type as MediaType,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      dateAdded: row.date_added,
      dateOriginal: row.date_original ?? undefined,
      dateInferred: row.date_inferred ?? undefined,
      dateFileSystem: row.date_filesystem,
      dateTarget: row.date_target,
      dateTargetSource: row.date_target_source as
        "exif" | "filename" | "filesystem",
      hash: row.hash ?? undefined,
      thumbnailPath: row.thumbnail_path ?? undefined,
      dateModified: row.date_modified ?? undefined,
      quality,
      duplicateGroupId: row.duplicate_group_id ?? undefined,
      isDuplicate: Boolean(row.is_duplicate),
      isBestInDuplicateGroup: Boolean(row.is_best_in_duplicate_group),
      reviewState: row.review_state as
        "pending" | "keep" | "delete" | "skipped",
      reviewedAt: row.reviewed_at ?? undefined,
    }
  }

  /**
   * Inserts or updates a list of MediaItems in a single fast database transaction.
   */
  public upsertMany(items: MediaItem[]): void {
    const db = this.getDb()

    const insertStmt = db.prepare(`
      INSERT INTO media_items (
        id, path, name, size, extension, media_type, width, height,
        date_added, date_original, date_inferred, date_filesystem,
        date_target, date_target_source, hash, thumbnail_path, date_modified,
        blur_score, brightness, is_dark, is_blurry, is_screenshot, is_small, composite_score,
        duplicate_group_id, is_duplicate, is_best_in_duplicate_group, review_state, reviewed_at
      ) VALUES (
        $id, $path, $name, $size, $extension, $mediaType, $width, $height,
        $dateAdded, $dateOriginal, $dateInferred, $dateFileSystem,
        $dateTarget, $dateTargetSource, $hash, $thumbnailPath, $dateModified,
        $blurScore, $brightness, $isDark, $isBlurry, $isScreenshot, $isSmall, $compositeScore,
        $duplicateGroupId, $isDuplicate, $isBestInDuplicateGroup, $reviewState, $reviewedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        path = excluded.path,
        name = excluded.name,
        size = excluded.size,
        extension = excluded.extension,
        media_type = excluded.media_type,
        width = excluded.width,
        height = excluded.height,
        date_original = excluded.date_original,
        date_inferred = excluded.date_inferred,
        date_filesystem = excluded.date_filesystem,
        date_target = excluded.date_target,
        date_target_source = excluded.date_target_source,
        hash = excluded.hash,
        thumbnail_path = COALESCE(excluded.thumbnail_path, media_items.thumbnail_path),
        date_modified = excluded.date_modified,
        blur_score = excluded.blur_score,
        brightness = excluded.brightness,
        is_dark = excluded.is_dark,
        is_blurry = excluded.is_blurry,
        is_screenshot = excluded.is_screenshot,
        is_small = excluded.is_small,
        composite_score = excluded.composite_score,
        duplicate_group_id = excluded.duplicate_group_id,
        is_duplicate = excluded.is_duplicate,
        is_best_in_duplicate_group = excluded.is_best_in_duplicate_group
    `)

    const transaction = db.transaction((batchItems: MediaItem[]) => {
      for (const item of batchItems) {
        insertStmt.run({
          id: item.id,
          path: item.path,
          name: item.name,
          size: item.size,
          extension: item.extension,
          mediaType: item.mediaType,
          width: item.width ?? null,
          height: item.height ?? null,
          dateAdded: item.dateAdded,
          dateOriginal: item.dateOriginal ?? null,
          dateInferred: item.dateInferred ?? null,
          dateFileSystem: item.dateFileSystem,
          dateTarget: item.dateTarget,
          dateTargetSource: item.dateTargetSource,
          hash: item.hash ?? null,
          thumbnailPath: item.thumbnailPath ?? null,
          dateModified: item.dateModified ?? null,
          blurScore: item.quality?.blurScore ?? null,
          brightness: item.quality?.brightness ?? null,
          isDark: item.quality ? (item.quality.isDark ? 1 : 0) : 0,
          isBlurry: item.quality ? (item.quality.isBlurry ? 1 : 0) : 0,
          isScreenshot: item.quality ? (item.quality.isScreenshot ? 1 : 0) : 0,
          isSmall: item.quality ? (item.quality.isSmall ? 1 : 0) : 0,
          compositeScore: item.quality?.compositeScore ?? null,
          duplicateGroupId: item.duplicateGroupId ?? null,
          isDuplicate: item.isDuplicate ? 1 : 0,
          isBestInDuplicateGroup: item.isBestInDuplicateGroup ? 1 : 0,
          reviewState: item.reviewState,
          reviewedAt: item.reviewedAt ?? null,
        })
      }
    })

    transaction(items)
  }

  /**
   * Retrieves all scanned media items inside a target root directory path (including subdirectories).
   */
  public getByFolderPath(folderPath: string): MediaItem[] {
    const db = this.getDb()
    if (folderPath.toLowerCase() === "all") {
      const stmt = db.prepare(`
        SELECT * FROM media_items 
        ORDER BY date_target DESC
      `)
      const rows = stmt.all()
      return rows.map((row) => this.rowToMediaItem(row))
    }

    // Normalize path separators to search standard path matching
    const searchPath = folderPath.replace(/\\/g, "/").toLowerCase()

    // We match any item whose path starts with the folderPath
    const stmt = db.prepare(`
       SELECT * FROM media_items 
       WHERE LOWER(path) LIKE ? 
       ORDER BY date_target DESC
     `)

    const rows = stmt.all(`${searchPath}%`)
    return rows.map((row) => this.rowToMediaItem(row))
  }

  /**
   * Updates a single item's review status
   */
  public updateReviewState(
    mediaId: string,
    state: "pending" | "keep" | "delete" | "skipped",
    reviewedAt?: string
  ): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      UPDATE media_items 
      SET review_state = ?, reviewed_at = ? 
      WHERE id = ?
    `)
    stmt.run(state, reviewedAt ?? null, mediaId)
  }

  /**
   * Updates multiple review actions at once
   */
  public updateReviewStatesBatch(
    updates: { mediaId: string; state: "keep" | "delete" | "skipped" }[],
    reviewedAt?: string
  ): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      UPDATE media_items 
      SET review_state = ?, reviewed_at = ? 
      WHERE id = ?
    `)

    const transaction = db.transaction((batch: typeof updates) => {
      for (const update of batch) {
        stmt.run(update.state, reviewedAt ?? null, update.mediaId)
      }
    })

    transaction(updates)
  }

  /**
   * Deletes scanned metadata for files that were physically removed/moved.
   */
  public deleteMany(paths: string[]): void {
    const db = this.getDb()
    const stmt = db.prepare("DELETE FROM media_items WHERE path = ?")

    const transaction = db.transaction((pathList: string[]) => {
      for (const p of pathList) {
        stmt.run(p)
      }
    })

    transaction(paths)
  }

  /**
   * Clears database metadata for a folder path
   */
  public clearByFolder(folderPath: string): void {
    const db = this.getDb()
    if (folderPath.toLowerCase() === "all") {
      const stmt = db.prepare("DELETE FROM media_items")
      stmt.run()
      return
    }
    const searchPath = folderPath.replace(/\\/g, "/").toLowerCase()
    const stmt = db.prepare("DELETE FROM media_items WHERE LOWER(path) LIKE ?")
    stmt.run(`${searchPath}%`)
  }

  /**
   * Resets all review states in a folder to pending.
   */
  public resetReviewStatesByFolder(folderPath: string): void {
    const db = this.getDb()
    if (folderPath.toLowerCase() === "all") {
      const stmt = db.prepare(`
        UPDATE media_items 
        SET review_state = 'pending', reviewed_at = NULL
      `)
      stmt.run()
      return
    }
    const searchPath = folderPath.replace(/\\/g, "/").toLowerCase()
    const stmt = db.prepare(`
      UPDATE media_items 
      SET review_state = 'pending', reviewed_at = NULL 
      WHERE LOWER(path) LIKE ?
    `)
    stmt.run(`${searchPath}%`)
  }
}

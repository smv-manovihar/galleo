import type { Database } from "better-sqlite3"
import { initDatabase } from "../infrastructure/database"

export interface MediaEmbeddingRecord {
  mediaId: string
  embedding: Float32Array
  createdAt: string
}

export interface VideoFrameEmbeddingRecord {
  id: string
  mediaId: string
  timestampSeconds: number
  frameIndex: number
  embedding: Float32Array
  thumbnailPath?: string
}

export class EmbeddingRepository {
  private getDb(): Database {
    return initDatabase()
  }

  /**
   * Helper to convert Float32Array to Buffer for SQLite BLOB storage
   */
  public static float32ToBuffer(array: Float32Array): Buffer {
    return Buffer.from(array.buffer, array.byteOffset, array.byteLength)
  }

  /**
   * Helper to convert SQLite Buffer BLOB to Float32Array
   */
  public static bufferToFloat32(buffer: Buffer): Float32Array {
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
    return new Float32Array(arrayBuffer)
  }

  /**
   * Insert or replace a single media item embedding (e.g. image vector)
   */
  public saveMediaEmbedding(mediaId: string, embedding: Float32Array): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO media_embeddings (media_id, embedding, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(media_id) DO UPDATE SET
        embedding = excluded.embedding,
        created_at = excluded.created_at
    `)
    const blob = EmbeddingRepository.float32ToBuffer(embedding)
    stmt.run(mediaId, blob, new Date().toISOString())
  }

  /**
   * Fetch embedding for a single media item
   */
  public getMediaEmbedding(mediaId: string): Float32Array | null {
    const db = this.getDb()
    const stmt = db.prepare(
      `SELECT embedding FROM media_embeddings WHERE media_id = ?`
    )
    const row = stmt.get(mediaId) as { embedding: Buffer } | undefined
    if (!row) return null
    return EmbeddingRepository.bufferToFloat32(row.embedding)
  }

  /**
   * Check if a photo embedding exists for mediaId
   */
  public hasMediaEmbedding(mediaId: string): boolean {
    const db = this.getDb()
    const stmt = db.prepare(
      `SELECT 1 FROM media_embeddings WHERE media_id = ? LIMIT 1`
    )
    return !!stmt.get(mediaId)
  }

  /**
   * Check if video frame embeddings exist for mediaId
   */
  public hasVideoFrameEmbeddings(mediaId: string): boolean {
    const db = this.getDb()
    const stmt = db.prepare(
      `SELECT 1 FROM video_frame_embeddings WHERE media_id = ? LIMIT 1`
    )
    return !!stmt.get(mediaId)
  }

  /**
   * Fetch all media embeddings for vector similarity search
   */
  public getAllMediaEmbeddings(): MediaEmbeddingRecord[] {
    const db = this.getDb()
    const stmt = db.prepare(
      `SELECT media_id, embedding, created_at FROM media_embeddings`
    )
    const rows = stmt.all() as Array<{
      media_id: string
      embedding: Buffer
      created_at: string
    }>

    return rows.map((row) => ({
      mediaId: row.media_id,
      embedding: EmbeddingRepository.bufferToFloat32(row.embedding),
      createdAt: row.created_at,
    }))
  }

  /**
   * Fetch media embeddings for a specific set of media IDs
   */
  public getMediaEmbeddingsForIds(mediaIds: string[]): MediaEmbeddingRecord[] {
    if (mediaIds.length === 0) return []
    const db = this.getDb()
    const chunkSize = 500
    const results: MediaEmbeddingRecord[] = []
    for (let i = 0; i < mediaIds.length; i += chunkSize) {
      const chunk = mediaIds.slice(i, i + chunkSize)
      const placeholders = chunk.map(() => "?").join(",")
      const stmt = db.prepare(
        `SELECT media_id, embedding, created_at FROM media_embeddings WHERE media_id IN (${placeholders})`
      )
      const rows = stmt.all(...chunk) as Array<{
        media_id: string
        embedding: Buffer
        created_at: string
      }>
      for (const row of rows) {
        results.push({
          mediaId: row.media_id,
          embedding: EmbeddingRepository.bufferToFloat32(row.embedding),
          createdAt: row.created_at,
        })
      }
    }
    return results
  }

  /**
   * Insert or replace multiple video frame embeddings for a video media item
   */
  public saveVideoFrameEmbeddings(
    frames: Array<{
      id: string
      mediaId: string
      timestampSeconds: number
      frameIndex: number
      embedding: Float32Array
      thumbnailPath?: string
    }>
  ): void {
    if (frames.length === 0) return

    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO video_frame_embeddings (id, media_id, timestamp_seconds, frame_index, embedding, thumbnail_path)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        embedding = excluded.embedding,
        timestamp_seconds = excluded.timestamp_seconds,
        frame_index = excluded.frame_index,
        thumbnail_path = excluded.thumbnail_path
    `)

    const insertMany = db.transaction((frameList) => {
      for (const frame of frameList) {
        const blob = EmbeddingRepository.float32ToBuffer(frame.embedding)
        stmt.run(
          frame.id,
          frame.mediaId,
          frame.timestampSeconds,
          frame.frameIndex,
          blob,
          frame.thumbnailPath ?? null
        )
      }
    })

    insertMany(frames)
  }

  /**
   * Fetch frame embeddings for a specific video media item
   */
  public getVideoFrameEmbeddings(
    mediaId: string
  ): VideoFrameEmbeddingRecord[] {
    const db = this.getDb()
    const stmt = db.prepare(
      `SELECT id, media_id, timestamp_seconds, frame_index, embedding, thumbnail_path 
       FROM video_frame_embeddings 
       WHERE media_id = ? 
       ORDER BY timestamp_seconds ASC`
    )
    const rows = stmt.all(mediaId) as Array<{
      id: string
      media_id: string
      timestamp_seconds: number
      frame_index: number
      embedding: Buffer
      thumbnail_path: string | null
    }>

    return rows.map((row) => ({
      id: row.id,
      mediaId: row.media_id,
      timestampSeconds: row.timestamp_seconds,
      frameIndex: row.frame_index,
      embedding: EmbeddingRepository.bufferToFloat32(row.embedding),
      thumbnailPath: row.thumbnail_path ?? undefined,
    }))
  }

  /**
   * Fetch all video frame embeddings across library for vector similarity search
   */
  public getAllVideoFrameEmbeddings(): VideoFrameEmbeddingRecord[] {
    const db = this.getDb()
    const stmt = db.prepare(
      `SELECT id, media_id, timestamp_seconds, frame_index, embedding, thumbnail_path 
       FROM video_frame_embeddings`
    )
    const rows = stmt.all() as Array<{
      id: string
      media_id: string
      timestamp_seconds: number
      frame_index: number
      embedding: Buffer
      thumbnail_path: string | null
    }>

    return rows.map((row) => ({
      id: row.id,
      mediaId: row.media_id,
      timestampSeconds: row.timestamp_seconds,
      frameIndex: row.frame_index,
      embedding: EmbeddingRepository.bufferToFloat32(row.embedding),
      thumbnailPath: row.thumbnail_path ?? undefined,
    }))
  }

  /**
   * Fetch video frame embeddings for a specific set of media IDs
   */
  public getVideoFrameEmbeddingsForIds(mediaIds: string[]): VideoFrameEmbeddingRecord[] {
    if (mediaIds.length === 0) return []
    const db = this.getDb()
    const chunkSize = 500
    const results: VideoFrameEmbeddingRecord[] = []
    for (let i = 0; i < mediaIds.length; i += chunkSize) {
      const chunk = mediaIds.slice(i, i + chunkSize)
      const placeholders = chunk.map(() => "?").join(",")
      const stmt = db.prepare(
        `SELECT id, media_id, timestamp_seconds, frame_index, embedding, thumbnail_path 
         FROM video_frame_embeddings WHERE media_id IN (${placeholders})`
      )
      const rows = stmt.all(...chunk) as Array<{
        id: string
        media_id: string
        timestamp_seconds: number
        frame_index: number
        embedding: Buffer
        thumbnail_path: string | null
      }>
      for (const row of rows) {
        results.push({
          id: row.id,
          mediaId: row.media_id,
          timestampSeconds: row.timestamp_seconds,
          frameIndex: row.frame_index,
          embedding: EmbeddingRepository.bufferToFloat32(row.embedding),
          thumbnailPath: row.thumbnail_path ?? undefined,
        })
      }
    }
    return results
  }

  /**
   * Remove all embeddings associated with a media item
   */
  public deleteEmbeddingsByMediaId(mediaId: string): void {
    const db = this.getDb()
    db.prepare(`DELETE FROM media_embeddings WHERE media_id = ?`).run(mediaId)
    db.prepare(`DELETE FROM video_frame_embeddings WHERE media_id = ?`).run(
      mediaId
    )
  }

  /**
   * Purge all media and video frame embeddings from database
   */
  public purgeAllEmbeddings(): void {
    const db = this.getDb()
    db.prepare(`DELETE FROM media_embeddings`).run()
    db.prepare(`DELETE FROM video_frame_embeddings`).run()
  }

  /**
   * Get counts of stored image and video frame embeddings
   */
  public getEmbeddingStats(): {
    mediaEmbeddingCount: number
    videoFrameEmbeddingCount: number
  } {
    const db = this.getDb()
    const mediaRow = db
      .prepare(`SELECT COUNT(*) as count FROM media_embeddings`)
      .get() as { count: number }
    const frameRow = db
      .prepare(`SELECT COUNT(*) as count FROM video_frame_embeddings`)
      .get() as { count: number }

    return {
      mediaEmbeddingCount: mediaRow?.count ?? 0,
      videoFrameEmbeddingCount: frameRow?.count ?? 0,
    }
  }

  /**
   * Get total count of media items that do not have vector embeddings yet
   */
  public getUnindexedCount(excludeIds: string[] = []): number {
    const db = this.getDb()
    if (excludeIds.length === 0) {
      const row = db.prepare(`
        SELECT COUNT(*) as count
        FROM media_items m
        LEFT JOIN media_embeddings e ON m.id = e.media_id
        LEFT JOIN video_frame_embeddings v ON m.id = v.media_id
        WHERE (m.media_type = 'photo' AND e.media_id IS NULL)
           OR (m.media_type = 'video' AND v.media_id IS NULL)
      `).get() as { count: number }
      return row?.count ?? 0
    } else {
      const placeholders = excludeIds.map(() => "?").join(",")
      const row = db.prepare(`
        SELECT COUNT(*) as count
        FROM media_items m
        LEFT JOIN media_embeddings e ON m.id = e.media_id
        LEFT JOIN video_frame_embeddings v ON m.id = v.media_id
        WHERE ((m.media_type = 'photo' AND e.media_id IS NULL)
           OR (m.media_type = 'video' AND v.media_id IS NULL))
           AND m.id NOT IN (${placeholders})
      `).get(...excludeIds) as { count: number }
      return row?.count ?? 0
    }
  }

  /**
   * Fetch list of media items that do not have vector embeddings yet
   */
  public getUnindexedMediaItems(limit: number = 500, excludeIds: string[] = []): Array<{
    id: string
    path: string
    mediaType: "photo" | "video"
    thumbnailPath?: string
  }> {
    const db = this.getDb()
    if (excludeIds.length === 0) {
      const stmt = db.prepare(`
        SELECT m.id, m.path, m.media_type, m.thumbnail_path
        FROM media_items m
        LEFT JOIN media_embeddings e ON m.id = e.media_id
        LEFT JOIN video_frame_embeddings v ON m.id = v.media_id
        WHERE (m.media_type = 'photo' AND e.media_id IS NULL)
           OR (m.media_type = 'video' AND v.media_id IS NULL)
        LIMIT ?
      `)
      const rows = stmt.all(limit) as Array<{
        id: string
        path: string
        media_type: string
        thumbnail_path: string | null
      }>
      return rows.map((r) => ({
        id: r.id,
        path: r.path,
        mediaType: r.media_type as "photo" | "video",
        thumbnailPath: r.thumbnail_path ?? undefined,
      }))
    } else {
      const placeholders = excludeIds.map(() => "?").join(",")
      const stmt = db.prepare(`
        SELECT m.id, m.path, m.media_type, m.thumbnail_path
        FROM media_items m
        LEFT JOIN media_embeddings e ON m.id = e.media_id
        LEFT JOIN video_frame_embeddings v ON m.id = v.media_id
        WHERE ((m.media_type = 'photo' AND e.media_id IS NULL)
           OR (m.media_type = 'video' AND v.media_id IS NULL))
           AND m.id NOT IN (${placeholders})
        LIMIT ?
      `)
      const rows = stmt.all(...excludeIds, limit) as Array<{
        id: string
        path: string
        media_type: string
        thumbnail_path: string | null
      }>
      return rows.map((r) => ({
        id: r.id,
        path: r.path,
        mediaType: r.media_type as "photo" | "video",
        thumbnailPath: r.thumbnail_path ?? undefined,
      }))
    }
  }
}

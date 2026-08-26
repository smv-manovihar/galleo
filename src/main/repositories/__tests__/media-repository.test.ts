import { describe, it, expect, beforeEach, vi } from "vitest"
import { MediaRepository } from "../media.repository"

interface MockMediaRow {
  id: string
  path: string
  name: string
  size: number
  extension: string
  media_type: string
  width?: number
  height?: number
  date_added: string
  date_original?: string
  date_inferred?: string
  date_filesystem: string
  date_target: string
  date_target_source: string
  hash?: string
  exact_hash?: string
  duration?: number
  thumbnail_path?: string
  date_modified?: string
  blur_score?: number
  brightness?: number
  is_dark?: number
  is_blurry?: number
  is_screenshot?: number
  is_small?: number
  composite_score?: number
  duplicate_group_id?: string
  is_duplicate?: number
  is_best_in_duplicate_group?: number
  similarity_index?: number
  review_state?: string
  reviewed_at?: string
  orientation?: number
}

const mockMediaItems = new Map<string, MockMediaRow>()
const mockPurgeMediaThumbnailFiles = vi.fn().mockResolvedValue(undefined)

vi.mock("../../infrastructure/image-processor", () => ({
  purgeMediaThumbnailFiles: (...args: unknown[]) => mockPurgeMediaThumbnailFiles(...args),
}))

vi.mock("../../infrastructure/database", () => ({
  initDatabase: () => ({
    prepare: (sql: string) => {
      const normalizedSql = sql.trim().replace(/\s+/g, " ")

      if (normalizedSql.includes("SELECT * FROM media_items WHERE id = ?")) {
        return {
          get: (id: string) => mockMediaItems.get(id),
        }
      }

      if (normalizedSql.includes("SELECT id, thumbnail_path as thumbnailPath FROM media_items")) {
        return {
          all: (...args: string[]) => {
            if (normalizedSql.includes("WHERE")) {
              const matched: Array<{ id: string; thumbnailPath?: string }> = []
              for (const item of mockMediaItems.values()) {
                if (args.some((arg) => item.path.toLowerCase().includes(arg.toLowerCase().replace(/[%!]/g, "")))) {
                  matched.push({ id: item.id, thumbnailPath: item.thumbnail_path })
                }
              }
              return matched
            }
            return Array.from(mockMediaItems.values()).map((i) => ({ id: i.id, thumbnailPath: i.thumbnail_path }))
          },
        }
      }

      if (normalizedSql.includes("DELETE FROM media_items")) {
        return {
          run: (...args: string[]) => {
            if (args.length === 0) {
              mockMediaItems.clear()
            } else {
              for (const [id, item] of Array.from(mockMediaItems.entries())) {
                if (args.some((arg) => item.path.toLowerCase() === arg.toLowerCase())) {
                  mockMediaItems.delete(id)
                }
              }
            }
            return { changes: 1 }
          },
        }
      }

      if (normalizedSql.includes("DELETE FROM session_decisions") || normalizedSql.includes("DELETE FROM undo_actions")) {
        return {
          run: () => ({ changes: 0 }),
        }
      }

      if (normalizedSql.includes("UPDATE media_items SET orientation = ? WHERE id = ? OR path = ?")) {
        return {
          run: (orientation: number, idOrPath1: string, idOrPath2: string) => {
            for (const [id, item] of mockMediaItems.entries()) {
              if (id === idOrPath1 || item.path === idOrPath2) {
                mockMediaItems.set(id, { ...item, orientation })
              }
            }
            return { changes: 1 }
          },
        }
      }

      if (normalizedSql.includes("UPDATE media_items SET is_blurry = CASE")) {
        return {
          run: (blurThreshold: number, darknessThreshold: number) => {
            for (const [id, item] of mockMediaItems.entries()) {
              const isBlurry = item.blur_score !== undefined && item.blur_score < blurThreshold ? 1 : 0
              const isDark =
                item.brightness !== undefined &&
                item.brightness < darknessThreshold &&
                (item.composite_score === undefined || item.composite_score < 85)
                  ? 1
                  : 0
              mockMediaItems.set(id, { ...item, is_blurry: isBlurry, is_dark: isDark })
            }
            return { changes: mockMediaItems.size }
          },
        }
      }

      return {
        run: () => ({ changes: 0 }),
        get: () => undefined,
        all: () => [],
      }
    },
    transaction: (fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => fn(...args),
  }),
}))

describe("MediaRepository orientation updates", () => {
  let mediaRepo: MediaRepository

  beforeEach(() => {
    mockMediaItems.clear()
    mockPurgeMediaThumbnailFiles.mockClear()
    mediaRepo = new MediaRepository()

    const item: MockMediaRow = {
      id: "media-123",
      path: "C:/photos/vacation.jpg",
      name: "vacation.jpg",
      size: 1024,
      extension: "jpg",
      media_type: "photo",
      date_added: "2026-08-01T00:00:00.000Z",
      date_filesystem: "2026-08-01T00:00:00.000Z",
      date_target: "2026-08-01T00:00:00.000Z",
      date_target_source: "filesystem",
      thumbnail_path: "C:/cache/media-123_poster_v3.webp",
      review_state: "pending",
      orientation: 0,
      blur_score: 60,
      brightness: 35,
      composite_score: 100,
      is_dark: 0,
      is_blurry: 0,
    }
    mockMediaItems.set(item.id, item)
  })

  it("updates orientation by media ID", () => {
    mediaRepo.updateOrientation("media-123", 90)
    const updated = mediaRepo.getById("media-123")
    expect(updated?.orientation).toBe(90)
  })

  it("updates orientation by file path", () => {
    mediaRepo.updateOrientation("C:/photos/vacation.jpg", 270)
    const updated = mediaRepo.getById("media-123")
    expect(updated?.orientation).toBe(270)
  })

  it("deletes media item and purges its thumbnail files on deleteMany", () => {
    mediaRepo.deleteMany(["C:/photos/vacation.jpg"])
    expect(mockMediaItems.has("media-123")).toBe(false)
    expect(mockPurgeMediaThumbnailFiles).toHaveBeenCalledWith(
      "media-123",
      "C:/cache/media-123_poster_v3.webp"
    )
  })

  it("clears all items and purges thumbnails on clearByFolder('all')", () => {
    mediaRepo.clearByFolder("all")
    expect(mockMediaItems.size).toBe(0)
    expect(mockPurgeMediaThumbnailFiles).toHaveBeenCalledWith(
      "media-123",
      "C:/cache/media-123_poster_v3.webp"
    )
  })

  it("does not flag items with composite_score >= 85 as is_dark when recalibrating quality thresholds", () => {
    mediaRepo.recalibrateQualityThresholds(30, 40)
    const item = mediaRepo.getById("media-123")
    expect(item?.quality?.isDark).toBe(false)
    expect(item?.quality?.compositeScore).toBe(100)
  })
})

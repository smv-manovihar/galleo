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

vi.mock("../../infrastructure/database", () => ({
  initDatabase: () => ({
    prepare: (sql: string) => {
      const normalizedSql = sql.trim().replace(/\s+/g, " ")

      if (normalizedSql.includes("SELECT * FROM media_items WHERE id = ?")) {
        return {
          get: (id: string) => mockMediaItems.get(id),
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
      review_state: "pending",
      orientation: 0,
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
})

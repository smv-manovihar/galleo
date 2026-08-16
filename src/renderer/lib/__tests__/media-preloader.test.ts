import { describe, it, expect, beforeEach } from "vitest"
import {
  toMediaUrl,
  preloadImage,
  preloadAdjacentMedia,
  isImagePreloaded,
  clearMediaPreloadCache,
} from "../media-preloader"
import type { MediaItem } from "../../../shared/types/media"

describe("media-preloader", () => {
  beforeEach(() => {
    clearMediaPreloadCache()
  })

  it("converts filesystem paths to safe media:// URLs", () => {
    expect(toMediaUrl("C:\\photos\\img1.jpg")).toBe("media:///C:/photos/img1.jpg")
    expect(toMediaUrl("/photos/img1.jpg")).toBe("media:////photos/img1.jpg")
    expect(toMediaUrl("media:///already/valid.jpg")).toBe("media:///already/valid.jpg")
    expect(toMediaUrl("")).toBe("")
  })

  it("preloads and tracks preloaded URLs", async () => {
    const testUrl = "media:///photos/sample.jpg"
    expect(isImagePreloaded(testUrl)).toBe(false)

    await preloadImage(testUrl)
    expect(isImagePreloaded(testUrl)).toBe(true)

    // Re-calling preloadImage for an already cached URL returns immediately
    await preloadImage(testUrl)
    expect(isImagePreloaded(testUrl)).toBe(true)
  })

  it("preloads adjacent media items correctly", () => {
    const mockItems: MediaItem[] = [
      {
        id: "1",
        name: "p1.jpg",
        path: "D:\\photos\\p1.jpg",
        thumbnailPath: "D:\\thumbs\\t1.jpg",
        size: 100,
        extension: "jpg",
        mediaType: "photo",
        dateAdded: "2026-01-01T00:00:00.000Z",
        dateTarget: "2026-01-01T00:00:00.000Z",
        dateTargetSource: "filesystem",
        dateFileSystem: "2026-01-01T00:00:00.000Z",
        isDuplicate: false,
        isBestInDuplicateGroup: false,
        reviewState: "pending",
      },
      {
        id: "2",
        name: "p2.jpg",
        path: "D:\\photos\\p2.jpg",
        size: 200,
        extension: "jpg",
        mediaType: "photo",
        dateAdded: "2026-01-02T00:00:00.000Z",
        dateTarget: "2026-01-02T00:00:00.000Z",
        dateTargetSource: "filesystem",
        dateFileSystem: "2026-01-02T00:00:00.000Z",
        isDuplicate: false,
        isBestInDuplicateGroup: false,
        reviewState: "pending",
      },
      {
        id: "3",
        name: "p3.jpg",
        path: "D:\\photos\\p3.jpg",
        thumbnailPath: "D:\\thumbs\\t3.jpg",
        size: 300,
        extension: "jpg",
        mediaType: "photo",
        dateAdded: "2026-01-03T00:00:00.000Z",
        dateTarget: "2026-01-03T00:00:00.000Z",
        dateTargetSource: "filesystem",
        dateFileSystem: "2026-01-03T00:00:00.000Z",
        isDuplicate: false,
        isBestInDuplicateGroup: false,
        reviewState: "pending",
      },
    ]

    // Preload adjacent to index 1 (should target 0 and 2)
    preloadAdjacentMedia(mockItems, 1, 1, 1)

    expect(isImagePreloaded("media:///D:/photos/p1.jpg")).toBe(true)
    expect(isImagePreloaded("media:///D:/thumbs/t1.jpg")).toBe(true)
    expect(isImagePreloaded("media:///D:/photos/p3.jpg")).toBe(true)
    expect(isImagePreloaded("media:///D:/thumbs/t3.jpg")).toBe(true)
  })

  it("handles empty or invalid inputs gracefully", () => {
    expect(() => preloadAdjacentMedia(undefined, -1)).not.toThrow()
    expect(() => preloadAdjacentMedia([], 0)).not.toThrow()
  })
})

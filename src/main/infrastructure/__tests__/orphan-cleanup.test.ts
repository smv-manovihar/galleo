import { describe, it, expect, vi, beforeEach } from "vitest"
import path from "path"
import fs from "fs/promises"
import {
  purgeMediaThumbnailFiles,
  purgeOrphanedCacheFiles,
} from "../image-processor"

vi.mock("sharp", () => ({
  default: Object.assign(vi.fn(), { cache: vi.fn() }),
}))

vi.mock("fs/promises", () => ({
  default: {
    readdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  },
}))

let mockActiveIds = new Set<string>()

vi.mock("../database", () => ({
  initDatabase: () => ({
    prepare: (sql: string) => {
      if (sql.includes("SELECT id FROM media_items")) {
        return {
          all: () => Array.from(mockActiveIds).map((id) => ({ id })),
        }
      }
      return {
        all: () => [],
      }
    },
  }),
}))

vi.mock("../app-paths", () => ({
  getThumbnailCacheDir: () => "/mock/cache/thumbnails",
  getVideoFrameCacheDir: () => "/mock/cache/thumbnails/video_frames",
}))

describe("Orphan Thumbnail & Frame Cache Cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveIds = new Set<string>(["active-media-1", "active-media-2"])
  })

  describe("purgeMediaThumbnailFiles", () => {
    it("deletes explicit thumbnailPath, related thumbnail files, and video frames for a media ID", async () => {
      vi.mocked(fs.readdir).mockImplementation(async (dirPath) => {
        const p = String(dirPath).replace(/\\/g, "/")
        if (p.endsWith("thumbnails/video_frames")) {
          return [
            "target-id_frame_0.jpg",
            "target-id_frame_1.jpg",
            "other-id_frame_0.jpg",
          ] as unknown as Awaited<ReturnType<typeof fs.readdir>>
        }
        return [
          "target-id_poster_v3.webp",
          "target-id_v1.webp",
          "other-id_poster_v3.webp",
        ] as unknown as Awaited<ReturnType<typeof fs.readdir>>
      })
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      await purgeMediaThumbnailFiles("target-id", "/mock/cache/thumbnails/target-id_poster_v3.webp")

      // Should unlink explicit path
      expect(fs.unlink).toHaveBeenCalledWith("/mock/cache/thumbnails/target-id_poster_v3.webp")

      // Should unlink matched files in thumbnails
      expect(fs.unlink).toHaveBeenCalledWith(path.join("/mock/cache/thumbnails", "target-id_poster_v3.webp"))
      expect(fs.unlink).toHaveBeenCalledWith(path.join("/mock/cache/thumbnails", "target-id_v1.webp"))

      // Should unlink matched video frames
      expect(fs.unlink).toHaveBeenCalledWith(path.join("/mock/cache/thumbnails/video_frames", "target-id_frame_0.jpg"))
      expect(fs.unlink).toHaveBeenCalledWith(path.join("/mock/cache/thumbnails/video_frames", "target-id_frame_1.jpg"))

      // Should NOT unlink other-id files
      expect(fs.unlink).not.toHaveBeenCalledWith(path.join("/mock/cache/thumbnails", "other-id_poster_v3.webp"))
      expect(fs.unlink).not.toHaveBeenCalledWith(path.join("/mock/cache/thumbnails/video_frames", "other-id_frame_0.jpg"))
    })
  })

  describe("purgeOrphanedCacheFiles", () => {
    it("sweeps and unlinks thumbnails and video frames not present in active media items", async () => {
      vi.mocked(fs.readdir).mockImplementation(async (dirPath) => {
        const p = String(dirPath).replace(/\\/g, "/")
        if (p.endsWith("thumbnails/video_frames")) {
          return [
            { name: "active-media-1_frame_0.jpg", isDirectory: () => false },
            { name: "orphaned-video_frame_0.jpg", isDirectory: () => false },
            { name: "orphaned-video_frame_1.jpg", isDirectory: () => false },
          ] as unknown as Awaited<ReturnType<typeof fs.readdir>>
        }
        return [
          { name: "active-media-1_poster_v3.webp", isDirectory: () => false },
          { name: "active-media-2_v3.webp", isDirectory: () => false },
          { name: "orphaned-item_poster_v3.webp", isDirectory: () => false },
          { name: "orphaned-legacy_v1.webp", isDirectory: () => false },
          { name: "video_frames", isDirectory: () => true },
        ] as unknown as Awaited<ReturnType<typeof fs.readdir>>
      })
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      const result = await purgeOrphanedCacheFiles()

      expect(result.freedThumbnails).toBe(2)
      expect(result.freedFrames).toBe(2)

      // Active items should NOT be unlinked
      expect(fs.unlink).not.toHaveBeenCalledWith(path.join("/mock/cache/thumbnails", "active-media-1_poster_v3.webp"))
      expect(fs.unlink).not.toHaveBeenCalledWith(path.join("/mock/cache/thumbnails", "active-media-2_v3.webp"))
      expect(fs.unlink).not.toHaveBeenCalledWith(path.join("/mock/cache/thumbnails/video_frames", "active-media-1_frame_0.jpg"))

      // Orphaned items should be unlinked
      expect(fs.unlink).toHaveBeenCalledWith(path.join("/mock/cache/thumbnails", "orphaned-item_poster_v3.webp"))
      expect(fs.unlink).toHaveBeenCalledWith(path.join("/mock/cache/thumbnails", "orphaned-legacy_v1.webp"))
      expect(fs.unlink).toHaveBeenCalledWith(path.join("/mock/cache/thumbnails/video_frames", "orphaned-video_frame_0.jpg"))
      expect(fs.unlink).toHaveBeenCalledWith(path.join("/mock/cache/thumbnails/video_frames", "orphaned-video_frame_1.jpg"))
    })
  })
})

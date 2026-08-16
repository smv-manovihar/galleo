import { describe, it, expect } from "vitest"
import type { MediaItem } from "../../../../shared/types/media"
import { resolveHistoryMediaItem } from "../../../lib/history-dialog-utils"
import type { DuplicateAuditHistoryDialogItem } from "../DuplicateAuditHistoryDialog"
import type { MediaCullingHistoryDialogItem } from "../../media-culling/MediaCullingHistoryDialog"

describe("DuplicateAuditHistoryDialog media resolution", () => {
  const sampleMediaItem: MediaItem = {
    id: "media-123",
    path: "/photos/beach.jpg",
    name: "beach.jpg",
    size: 2048,
    extension: "jpg",
    mediaType: "photo",
    dateAdded: "2026-01-01T00:00:00.000Z",
    dateFileSystem: "2026-01-01T00:00:00.000Z",
    dateTarget: "2026-01-01T00:00:00.000Z",
    dateTargetSource: "filesystem",
    thumbnailPath: "/thumbs/beach.jpg",
    isDuplicate: true,
    isBestInDuplicateGroup: false,
    reviewState: "keep",
  }

  it("uses item.mediaItem when provided", () => {
    const dialogItem: DuplicateAuditHistoryDialogItem = {
      id: "entry-1",
      mediaId: "media-123",
      name: "beach.jpg",
      path: "/photos/beach.jpg",
      currentDecision: "keep",
      mediaItem: sampleMediaItem,
    }

    const resolved = resolveHistoryMediaItem(dialogItem, [])
    expect(resolved).toBe(sampleMediaItem)
    expect(resolved.id).toBe("media-123")
  })

  it("finds matching item from store by id when mediaItem is omitted", () => {
    const dialogItem: DuplicateAuditHistoryDialogItem = {
      id: "entry-2",
      mediaId: "media-123",
      name: "beach.jpg",
      path: "/photos/beach.jpg",
      currentDecision: "keep",
    }

    const resolved = resolveHistoryMediaItem(dialogItem, [sampleMediaItem])
    expect(resolved).toBe(sampleMediaItem)
  })

  it("generates a valid fallback MediaItem for photos when not found in store", () => {
    const dialogItem: DuplicateAuditHistoryDialogItem = {
      id: "entry-3",
      mediaId: "unknown-id",
      name: "sunset.png",
      path: "C:\\Pictures\\sunset.png",
      thumbnailPath: "C:\\Pictures\\.thumbs\\sunset.png",
      currentDecision: "delete",
    }

    const resolved = resolveHistoryMediaItem(dialogItem, [])
    expect(resolved.id).toBe("unknown-id")
    expect(resolved.mediaType).toBe("photo")
    expect(resolved.extension).toBe("png")
    expect(resolved.thumbnailPath).toBe("C:\\Pictures\\.thumbs\\sunset.png")
    expect(resolved.reviewState).toBe("delete")
  })

  it("identifies video mediaType in fallback when path ends in video extension", () => {
    const dialogItem: DuplicateAuditHistoryDialogItem = {
      id: "entry-4",
      mediaId: "video-id",
      name: "clip.mp4",
      path: "/videos/clip.mp4",
      currentDecision: "pending",
    }

    const resolved = resolveHistoryMediaItem(dialogItem, [])
    expect(resolved.mediaType).toBe("video")
    expect(resolved.extension).toBe("mp4")
    expect(resolved.reviewState).toBe("pending")
  })
})

describe("MediaCullingHistoryDialog media resolution", () => {
  const sampleMediaItem: MediaItem = {
    id: "media-456",
    path: "/photos/mountain.jpg",
    name: "mountain.jpg",
    size: 4096,
    extension: "jpg",
    mediaType: "photo",
    dateAdded: "2026-01-01T00:00:00.000Z",
    dateFileSystem: "2026-01-01T00:00:00.000Z",
    dateTarget: "2026-01-01T00:00:00.000Z",
    dateTargetSource: "filesystem",
    thumbnailPath: "/thumbs/mountain.jpg",
    isDuplicate: false,
    isBestInDuplicateGroup: false,
    reviewState: "keep",
  }

  it("uses item.mediaItem when provided", () => {
    const dialogItem: MediaCullingHistoryDialogItem = {
      id: "entry-c-1",
      mediaId: "media-456",
      name: "mountain.jpg",
      path: "/photos/mountain.jpg",
      currentDecision: "keep",
      mediaItem: sampleMediaItem,
    }

    const resolved = resolveHistoryMediaItem(dialogItem, [])
    expect(resolved).toBe(sampleMediaItem)
  })

  it("finds matching item from store by path", () => {
    const dialogItem: MediaCullingHistoryDialogItem = {
      id: "entry-c-2",
      mediaId: "different-id",
      name: "mountain.jpg",
      path: "/photos/mountain.jpg",
      currentDecision: "keep",
    }

    const resolved = resolveHistoryMediaItem(dialogItem, [sampleMediaItem])
    expect(resolved).toBe(sampleMediaItem)
  })

  it("generates fallback MediaItem with correct decision mapping", () => {
    const dialogItem: MediaCullingHistoryDialogItem = {
      id: "entry-c-3",
      mediaId: "unknown-c-id",
      name: "vacation.mov",
      path: "/videos/vacation.mov",
      currentDecision: "skipped",
    }

    const resolved = resolveHistoryMediaItem(dialogItem, [])
    expect(resolved.id).toBe("unknown-c-id")
    expect(resolved.mediaType).toBe("video")
    expect(resolved.reviewState).toBe("skipped")
  })
})

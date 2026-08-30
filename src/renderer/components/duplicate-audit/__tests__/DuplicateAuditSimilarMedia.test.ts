import { describe, it, expect } from "vitest"
import { compareMediaQuality } from "../../../lib/media-quality"
import type { MediaItem } from "../../../../shared/types/media"

describe("compareMediaQuality ranking logic", () => {
  const createMockItem = (
    id: string,
    overrides: Partial<MediaItem> = {}
  ): MediaItem => ({
    id,
    path: `C:/Photos/${id}.jpg`,
    name: `${id}.jpg`,
    size: 1_000_000,
    extension: "jpg",
    mediaType: "photo",
    dateAdded: "2026-08-01T10:00:00.000Z",
    dateFileSystem: "2026-08-01T10:00:00.000Z",
    dateTarget: "2026-08-01T10:00:00.000Z",
    dateTargetSource: "filesystem",
    isDuplicate: true,
    isBestInDuplicateGroup: false,
    reviewState: "pending",
    orientation: 0,
    ...overrides,
  })

  it("prioritizes higher compositeScore over resolution when one item is defective (blurry)", () => {
    const sharpItem1080p = createMockItem("sharp_1080p", {
      width: 1920,
      height: 1080,
      quality: {
        compositeScore: 100,
        blurScore: 85,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const ruinedItem4k = createMockItem("ruined_4k", {
      width: 3840,
      height: 2160,
      quality: {
        compositeScore: 45,
        blurScore: 10,
        brightness: 120,
        isDark: false,
        isBlurry: true,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const sorted = [ruinedItem4k, sharpItem1080p].sort(compareMediaQuality)
    expect(sorted[0].id).toBe("sharp_1080p")
    expect(sorted[1].id).toBe("ruined_4k")
  })

  it("prioritizes higher resolution over higher blurScore when both items have equal compositeScore", () => {
    // 4K photo (12MP) with standard sharpness (blurScore: 68)
    const original4k = createMockItem("original_4k", {
      width: 4000,
      height: 3000,
      size: 5_000_000,
      quality: {
        compositeScore: 100,
        blurScore: 68,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    // Downscaled 720p photo with inflated Laplacian gradient sharpness (blurScore: 90)
    const downscaled720p = createMockItem("downscaled_720p", {
      width: 1280,
      height: 720,
      size: 400_000,
      quality: {
        compositeScore: 100,
        blurScore: 90,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const sorted = [downscaled720p, original4k].sort(compareMediaQuality)
    expect(sorted[0].id).toBe("original_4k")
    expect(sorted[1].id).toBe("downscaled_720p")
  })

  it("tie-breaks equal resolution by blurScore (burst-shot selection)", () => {
    const burstSharp = createMockItem("burst_sharp", {
      width: 4000,
      height: 3000,
      size: 5_000_000,
      quality: {
        compositeScore: 100,
        blurScore: 92,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const burstSoft = createMockItem("burst_soft", {
      width: 4000,
      height: 3000,
      size: 5_000_000,
      quality: {
        compositeScore: 100,
        blurScore: 65,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const sorted = [burstSoft, burstSharp].sort(compareMediaQuality)
    expect(sorted[0].id).toBe("burst_sharp")
    expect(sorted[1].id).toBe("burst_soft")
  })

  it("tie-breaks equal resolution and blurScore by file size (less compression)", () => {
    const highBitrate = createMockItem("high_bitrate", {
      width: 1920,
      height: 1080,
      size: 3_500_000,
      quality: {
        compositeScore: 100,
        blurScore: 80,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const compressed = createMockItem("compressed", {
      width: 1920,
      height: 1080,
      size: 800_000,
      quality: {
        compositeScore: 100,
        blurScore: 80,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const sorted = [compressed, highBitrate].sort(compareMediaQuality)
    expect(sorted[0].id).toBe("high_bitrate")
    expect(sorted[1].id).toBe("compressed")
  })
})

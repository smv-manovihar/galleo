import { describe, it, expect } from "vitest"
import { hammingDistance, findDuplicates } from "../duplicate-logic"
import type { MediaItem } from "../../../shared/types/media"

describe("hammingDistance", () => {
  it("returns 0 for identical hex strings", () => {
    expect(hammingDistance("ffff", "ffff")).toBe(0)
    expect(hammingDistance("123456789abcdef0", "123456789abcdef0")).toBe(0)
  })

  it("calculates exact differing bit counts", () => {
    // 0000 (0x0) vs 0001 (0x1) -> 1 bit diff
    expect(hammingDistance("0", "1")).toBe(1)

    // 1010 (0xa) vs 0101 (0x5) -> 4 bits diff
    expect(hammingDistance("a", "5")).toBe(4)

    // ffff (16 set bits) vs 0000 (0 set bits) -> 16 bits diff
    expect(hammingDistance("ffff", "0000")).toBe(16)
  })

  it("returns -1 for mismatched lengths or invalid inputs", () => {
    expect(hammingDistance("ff", "fff")).toBe(-1)
    expect(hammingDistance("", "ff")).toBe(-1)
    expect(hammingDistance(null, "ff")).toBe(-1)
    expect(hammingDistance("fg", "ff")).toBe(-1) // 'g' is invalid hex
  })
})

describe("findDuplicates", () => {
  const createMockItem = (
    id: string,
    hash: string,
    score: number,
    size = 1000,
    name?: string
  ): MediaItem => ({
    id,
    path: `path/to/${name || id}.jpg`,
    name: `${name || id}.jpg`,
    size,
    extension: "jpg",
    mediaType: "photo",
    dateAdded: new Date().toISOString(),
    dateFileSystem: new Date().toISOString(),
    dateTarget: new Date().toISOString(),
    dateTargetSource: "filesystem",
    hash,
    isDuplicate: false,
    isBestInDuplicateGroup: false,
    reviewState: "pending",
    quality: {
      blurScore: 80,
      brightness: 120,
      isDark: false,
      isBlurry: false,
      isScreenshot: false,
      isSmall: false,
      compositeScore: score,
    },
  })

  it("groups items within Hamming distance threshold", async () => {
    const item1 = createMockItem("item1", "ffff", 90)
    const item2 = createMockItem("item2", "fffe", 95) // 1 bit diff (duplicate)
    const item3 = createMockItem("item3", "0000", 80) // very different

    const groups = await findDuplicates([item1, item2, item3], 4)
    expect(groups.length).toBe(1)
    expect(groups[0].items.length).toBe(2)
    expect(groups[0].items.map((i) => i.id)).toContain("item1")
    expect(groups[0].items.map((i) => i.id)).toContain("item2")
  })

  it("prevents runaway transitive chaining across loosely related items", async () => {
    // 5 items in a chain:
    // i1 (ffff) -> i2 (fffe, dist 1) -> i3 (fffc, dist 1) -> i4 (fff8, dist 1) -> i5 (fff0, dist 1) -> i6 (0000, dist 12 from i1)
    const i1 = createMockItem("i1", "ffff", 95) // anchor (best quality)
    const i2 = createMockItem("i2", "fffe", 90) // dist to i1: 1
    const i3 = createMockItem("i3", "fffc", 85) // dist to i1: 2
    const i4 = createMockItem("i4", "0000", 80) // dist to i1: 16 (completely different)

    const groups = await findDuplicates([i1, i2, i3, i4], 2)
    expect(groups.length).toBe(1)
    // i4 must NOT be included in i1's group
    expect(groups[0].items.map((i) => i.id)).toContain("i1")
    expect(groups[0].items.map((i) => i.id)).toContain("i2")
    expect(groups[0].items.map((i) => i.id)).toContain("i3")
    expect(groups[0].items.map((i) => i.id)).not.toContain("i4")
  })

  it("selects the best quality item as best in group for exact duplicates", async () => {
    const item1 = createMockItem("item1", "ffff", 80, 500, "copy") // same name, same size
    const item2 = createMockItem("item2", "fffe", 90, 500, "copy") // same name, same size
    const item3 = createMockItem("item3", "fff0", 80, 500, "copy") // same name, same size

    const groups = await findDuplicates([item1, item2, item3], 4)
    expect(groups.length).toBe(1)

    const itemsInGroup = groups[0].items
    const best = itemsInGroup.find((i) => i.isBestInDuplicateGroup)
    expect(best).not.toBeUndefined()
    expect(best!.id).toBe("item2")
  })

  it("does not set isBestInDuplicateGroup to true for similar media (different filenames)", async () => {
    const item1 = createMockItem("item1", "ffff", 80, 500, "photo1")
    const item2 = createMockItem("item2", "fffe", 90, 400, "photo2")

    const groups = await findDuplicates([item1, item2], 4)
    expect(groups.length).toBe(1)

    const itemsInGroup = groups[0].items
    const best = itemsInGroup.find((i) => i.isBestInDuplicateGroup)
    expect(best).toBeUndefined() // should not set isBestInDuplicateGroup on ingestion for similar media
  })

  it("groups byte-for-byte exact duplicates matching exactHash", async () => {
    const item1 = {
      ...createMockItem("item1", "ffff", 80, 500, "vid1"),
      exactHash: "sha256_exact_abc",
    }
    const item2 = {
      ...createMockItem("item2", "0000", 90, 500, "vid2_different_name"),
      exactHash: "sha256_exact_abc",
    }

    const groups = await findDuplicates([item1, item2], 4)
    expect(groups.length).toBe(1)
    expect(groups[0].items.length).toBe(2)
    const best = groups[0].items.find((i) => i.isBestInDuplicateGroup)
    expect(best?.id).toBe("item2")
  })

  it("does not group videos with significant duration mismatch despite intro pHash match", async () => {
    const video1: MediaItem = {
      ...createMockItem("video1", "ffff", 80, 500, "short_clip"),
      mediaType: "video",
      duration: 15,
    }
    const video2: MediaItem = {
      ...createMockItem("video2", "fffe", 90, 800, "long_episode"),
      mediaType: "video",
      duration: 3600,
    }

    const groups = await findDuplicates([video1, video2], 4)
    expect(groups.length).toBe(0)
  })

  it("distinguishes videos with identical intro frame 1 but different frames 2 and 3", async () => {
    // 192-char multi-frame pHash (3 x 64 chars)
    // Frame 1 matches ("ffff..."), Frames 2 and 3 differ completely
    const video1Hash = "f".repeat(64) + "a".repeat(64) + "1".repeat(64)
    const video2Hash = "f".repeat(64) + "5".repeat(64) + "9".repeat(64)

    const video1: MediaItem = {
      ...createMockItem("v1", video1Hash, 80, 500, "video_a"),
      mediaType: "video",
      duration: 60,
    }
    const video2: MediaItem = {
      ...createMockItem("v2", video2Hash, 80, 500, "video_b"),
      mediaType: "video",
      duration: 60,
    }

    // Single frame maxDistance of 4 scales to 12 bits max distance across 192 chars
    const groups = await findDuplicates([video1, video2], 4)
    expect(groups.length).toBe(0)
  })

  it("groups multi-frame videos when majority of keyframes (2 of 3) match within distance threshold", async () => {
    // 192-char multi-frame pHash: Frame 1 and 2 match ("f"), Frame 3 differs slightly (2 bits diff total)
    const video1Hash = "f".repeat(64) + "f".repeat(64) + "f".repeat(62) + "ee"
    const video2Hash = "f".repeat(64) + "f".repeat(64) + "f".repeat(64)

    const video1: MediaItem = {
      ...createMockItem("v1", video1Hash, 80, 500, "video_a"),
      mediaType: "video",
      duration: 60,
    }
    const video2: MediaItem = {
      ...createMockItem("v2", video2Hash, 80, 500, "video_b"),
      mediaType: "video",
      duration: 60,
    }

    const groups = await findDuplicates([video1, video2], 4)
    expect(groups.length).toBe(1)
    expect(groups[0].items.length).toBe(2)
  })
})

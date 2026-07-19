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

  it("groups items within Hamming distance threshold", () => {
    const item1 = createMockItem("item1", "ffff", 90)
    const item2 = createMockItem("item2", "fffe", 95) // 1 bit diff (duplicate)
    const item3 = createMockItem("item3", "0000", 80) // very different

    const groups = findDuplicates([item1, item2, item3], 4)
    expect(groups.length).toBe(1)
    expect(groups[0].items.length).toBe(2)
    expect(groups[0].items.map((i) => i.id)).toContain("item1")
    expect(groups[0].items.map((i) => i.id)).toContain("item2")
  })

  it("selects the best quality item as best in group for exact duplicates", () => {
    const item1 = createMockItem("item1", "ffff", 80, 500, "copy") // same name, same size
    const item2 = createMockItem("item2", "fffe", 90, 500, "copy") // same name, same size
    const item3 = createMockItem("item3", "fff0", 80, 500, "copy") // same name, same size

    const groups = findDuplicates([item1, item2, item3], 4)
    expect(groups.length).toBe(1)

    const itemsInGroup = groups[0].items
    const best = itemsInGroup.find((i) => i.isBestInDuplicateGroup)
    expect(best).not.toBeUndefined()
    expect(best!.id).toBe("item2")
  })

  it("does not set isBestInDuplicateGroup to true for similar media (different filenames)", () => {
    const item1 = createMockItem("item1", "ffff", 80, 500, "photo1")
    const item2 = createMockItem("item2", "fffe", 90, 400, "photo2")

    const groups = findDuplicates([item1, item2], 4)
    expect(groups.length).toBe(1)

    const itemsInGroup = groups[0].items
    const best = itemsInGroup.find((i) => i.isBestInDuplicateGroup)
    expect(best).toBeUndefined() // should not set isBestInDuplicateGroup on ingestion for similar media
  })
})

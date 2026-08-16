import { describe, expect, it, beforeEach } from "vitest"
import {
  hammingDistance,
  getItemSetFingerprint,
  sortBySimilarity,
  getSimilaritySortedItems,
  findSimilarPerceptual,
  similaritySortedIdCache,
} from "../similarity"
import type { MediaItem } from "../../../shared/types/media"

const mockItem = (id: string, hash?: string): MediaItem => ({
  id,
  name: `file_${id}.jpg`,
  path: `/path/file_${id}.jpg`,
  size: 1024,
  extension: "jpg",
  mediaType: "photo",
  dateAdded: "2026-01-01T00:00:00Z",
  dateFileSystem: "2026-01-01T00:00:00Z",
  dateTarget: "2026-01-01T00:00:00Z",
  dateTargetSource: "filesystem",
  isDuplicate: false,
  isBestInDuplicateGroup: false,
  reviewState: "pending",
  hash,
})

describe("Similarity utilities", () => {
  beforeEach(() => {
    similaritySortedIdCache.clear()
  })

  describe("hammingDistance", () => {
    it("computes bitwise distance correctly", () => {
      expect(hammingDistance("00", "00")).toBe(0)
      expect(hammingDistance("00", "01")).toBe(1)
      expect(hammingDistance("ff", "00")).toBe(8)
    })

    it("returns Infinity for unequal length strings", () => {
      expect(hammingDistance("00", "000")).toBe(Infinity)
    })
  })

  describe("getItemSetFingerprint", () => {
    it("returns empty string for empty array", () => {
      expect(getItemSetFingerprint([])).toBe("")
    })

    it("returns fingerprint incorporating item count and hashes", () => {
      const items = [mockItem("1", "abc"), mockItem("2", "def")]
      const fp = getItemSetFingerprint(items)
      expect(fp).toContain("2_")
      expect(fp).toContain("1-abc")
    })
  })

  describe("sortBySimilarity", () => {
    it("orders items greedily by nearest hash neighbor", () => {
      const items = [
        mockItem("1", "0000"),
        mockItem("2", "ffff"),
        mockItem("3", "0001"),
      ]
      const sorted = sortBySimilarity(items)
      expect(sorted.map((i) => i.id)).toEqual(["1", "3", "2"])
    })
  })

  describe("getSimilaritySortedItems", () => {
    it("caches the similarity order and reuses it on subsequent calls", () => {
      const items = [
        mockItem("1", "0000"),
        mockItem("2", "ffff"),
        mockItem("3", "0001"),
      ]

      const firstCall = getSimilaritySortedItems(items)
      expect(similaritySortedIdCache.size).toBe(1)
      expect(firstCall.map((i) => i.id)).toEqual(["1", "3", "2"])

      // Mutate item reviewState property (simulating store update)
      const updatedItems = items.map((i) => ({ ...i, reviewState: "keep" as const }))
      const secondCall = getSimilaritySortedItems(updatedItems)

      // Cache hit (size remains 1)
      expect(similaritySortedIdCache.size).toBe(1)
      expect(secondCall.map((i) => i.id)).toEqual(["1", "3", "2"])
      expect(secondCall[0].reviewState).toBe("keep")
    })

    it("uses pre-indexed similarityIndex directly if present", () => {
      const items: MediaItem[] = [
        { ...mockItem("1"), similarityIndex: 2 },
        { ...mockItem("2"), similarityIndex: 0 },
        { ...mockItem("3"), similarityIndex: 1 },
      ]

      const result = getSimilaritySortedItems(items)
      expect(result.map((i) => i.id)).toEqual(["2", "3", "1"])
    })
  })

  describe("findSimilarPerceptual", () => {
    it("matches items within perceptual hash distance and orders by distance", () => {
      const target = mockItem("target", "00000000")
      const closeMatch = mockItem("close", "00000001") // 1 bit diff
      const mediumMatch = mockItem("med", "00000007") // 3 bits diff
      const distant = mockItem("far", "ffffffff") // 32 bits diff
      const all = [closeMatch, distant, target, mediumMatch]

      const results = findSimilarPerceptual(target, all, 16)
      expect(results.map((i) => i.id)).toEqual(["target", "close", "med"])
    })

    it("matches items with matching exactHash or duplicateGroupId", () => {
      const target: MediaItem = {
        ...mockItem("t"),
        exactHash: "hash_abc",
        duplicateGroupId: "group_1",
      }
      const exactMatch: MediaItem = {
        ...mockItem("exact"),
        exactHash: "hash_abc",
      }
      const groupMatch: MediaItem = {
        ...mockItem("group"),
        duplicateGroupId: "group_1",
      }
      const unrelated: MediaItem = mockItem("unrelated")

      const results = findSimilarPerceptual(target, [target, exactMatch, groupMatch, unrelated], 16)
      expect(results.map((i) => i.id)).toContain("t")
      expect(results.map((i) => i.id)).toContain("exact")
      expect(results.map((i) => i.id)).toContain("group")
      expect(results.map((i) => i.id)).not.toContain("unrelated")
    })
  })
})

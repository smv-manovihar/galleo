import { describe, expect, it, beforeEach } from "vitest"
import {
  hammingDistance,
  isDegenerateHash,
  computePerceptualDistance,
  getItemSetFingerprint,
  sortBySimilarity,
  getSimilaritySortedItems,
  findSimilarPerceptual,
  similaritySortedIdCache,
} from "../similarity"
import type { MediaItem } from "../../../shared/types/media"

const mockItem = (id: string, hash?: string, overrides: Partial<MediaItem> = {}): MediaItem => ({
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
  ...overrides,
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

    it("returns Infinity for unequal length strings or invalid hex", () => {
      expect(hammingDistance("00", "000")).toBe(Infinity)
      expect(hammingDistance(null, "00")).toBe(Infinity)
      expect(hammingDistance("00", "0g")).toBe(Infinity)
    })
  })

  describe("isDegenerateHash", () => {
    it("identifies empty or all-zero hashes", () => {
      expect(isDegenerateHash("")).toBe(true)
      expect(isDegenerateHash(null)).toBe(true)
      expect(isDegenerateHash("0".repeat(64))).toBe(true)
      expect(isDegenerateHash("0".repeat(63) + "1")).toBe(false)
    })
  })

  describe("computePerceptualDistance", () => {
    it("returns 0 for identical item IDs or identical exactHash", () => {
      const itemA = mockItem("a", "ffff", { exactHash: "sha_1" })
      const itemB = mockItem("b", "0000", { exactHash: "sha_1" })
      expect(computePerceptualDistance(itemA, itemA)).toBe(0)
      expect(computePerceptualDistance(itemA, itemB)).toBe(0)
    })

    it("returns 0 for copy filename and matching file size", () => {
      const orig = mockItem("orig", "ffff", { name: "IMG_1234.jpg", size: 50000 })
      const copy = mockItem("copy", "0000", { name: "IMG_1234 - Copy.jpg", size: 50000 })
      expect(computePerceptualDistance(orig, copy)).toBe(0)
    })

    it("returns Infinity for mismatched media types (photo vs video)", () => {
      const photo = mockItem("p", "ffff", { mediaType: "photo" })
      const video = mockItem("v", "ffff", { mediaType: "video", duration: 10 })
      expect(computePerceptualDistance(photo, video)).toBe(Infinity)
    })

    it("returns Infinity for videos with significant duration difference", () => {
      const shortVid = mockItem("v1", "ffff", { mediaType: "video", duration: 10 })
      const longVid = mockItem("v2", "ffff", { mediaType: "video", duration: 600 })
      expect(computePerceptualDistance(shortVid, longVid)).toBe(Infinity)
    })

    it("computes multi-frame video perceptual distance across 3 keyframes", () => {
      // 192-character hashes: 3 frames x 64 chars
      // Frame 1 and 2 identical, Frame 3 has 2 bits difference -> total 2 bits / 3 = avg 1 bit
      const v1Hash = "f".repeat(64) + "a".repeat(64) + "c".repeat(64)
      const v2Hash = "f".repeat(64) + "a".repeat(64) + "c".repeat(62) + "e".repeat(2)

      const vid1 = mockItem("v1", v1Hash, { mediaType: "video", duration: 30 })
      const vid2 = mockItem("v2", v2Hash, { mediaType: "video", duration: 30 })

      const dist = computePerceptualDistance(vid1, vid2, 10)
      expect(dist).toBe(1)
    })

    it("computes 4-frame video perceptual distance across 4 keyframes", () => {
      // 256-character hashes: 4 frames x 64 chars
      const v1Hash = "f".repeat(64) + "a".repeat(64) + "c".repeat(64) + "9".repeat(64)
      const v2Hash = "f".repeat(64) + "a".repeat(64) + "c".repeat(64) + "9".repeat(62) + "00"

      const vid1 = mockItem("v1", v1Hash, { mediaType: "video", duration: 60 })
      const vid2 = mockItem("v2", v2Hash, { mediaType: "video", duration: 60 })

      const dist = computePerceptualDistance(vid1, vid2, 10)
      expect(dist).toBe(1)
    })

    it("matches photo screenshot against a video keyframe block", () => {
      // Photo hash matches frame 2 of the 4-frame video
      const photoHash = "a".repeat(64)
      const videoHash = "f".repeat(64) + "a".repeat(64) + "c".repeat(64) + "9".repeat(64)

      const photo = mockItem("p1", photoHash, { mediaType: "photo" })
      const video = mockItem("v1", videoHash, { mediaType: "video", duration: 60 })

      const dist = computePerceptualDistance(photo, video, 10)
      expect(dist).toBeLessThanOrEqual(10)
    })

    it("handles mixed length video hashes (256-char 4-frame vs legacy 64-char single-frame)", () => {
      // 256-char hash with primary frame (chars 64..128) matching the 64-char hash
      const v256Hash = "0".repeat(64) + "f".repeat(64) + "0".repeat(64) + "0".repeat(64)
      const v64Hash = "f".repeat(64)

      const vid1 = mockItem("v1", v256Hash, { mediaType: "video", duration: 60 })
      const vid2 = mockItem("v2", v64Hash, { mediaType: "video", duration: 60 })

      const dist = computePerceptualDistance(vid1, vid2, 10)
      expect(dist).toBe(0)
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
    it("orders items greedily along nearest visual neighbor gradient", () => {
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

    it("matches items with matching exactHash, filename copy, or duplicateGroupId", () => {
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

    it("matches multi-frame videos when keyframes align", () => {
      const v1Hash = "a".repeat(64) + "b".repeat(64) + "c".repeat(64)
      const v2Hash = "a".repeat(64) + "b".repeat(64) + "c".repeat(62) + "00" // 2 frames identical, 1 frame 2 bits diff
      const v3Diff = "0".repeat(64) + "0".repeat(64) + "0".repeat(64)

      const targetVid = mockItem("v1", v1Hash, { mediaType: "video", duration: 60 })
      const matchingVid = mockItem("v2", v2Hash, { mediaType: "video", duration: 60 })
      const diffVid = mockItem("v3", v3Diff, { mediaType: "video", duration: 60 })

      const results = findSimilarPerceptual(targetVid, [targetVid, matchingVid, diffVid], 18)
      expect(results.map((i) => i.id)).toEqual(["v1", "v2"])
    })

    it("expands matches as radius increases", () => {
      const target = mockItem("target", "00000000")
      const d4 = mockItem("d4", "0000000f") // 4 bits diff
      const d10 = mockItem("d10", "000003ff") // 10 bits diff
      const d20 = mockItem("d20", "000fffff") // 20 bits diff
      const all = [target, d4, d10, d20]

      const narrowResults = findSimilarPerceptual(target, all, 6)
      expect(narrowResults.map((i) => i.id)).toEqual(["target", "d4"])

      const standardResults = findSimilarPerceptual(target, all, 12)
      expect(standardResults.map((i) => i.id)).toEqual(["target", "d4", "d10"])

      const broadResults = findSimilarPerceptual(target, all, 22)
      expect(broadResults.map((i) => i.id)).toEqual(["target", "d4", "d10", "d20"])
    })
  })
})

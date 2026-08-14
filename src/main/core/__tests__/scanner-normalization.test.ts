import { describe, it, expect } from "vitest"

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase()
}

function matchesRootPath(rootPath: string, targetPath: string): boolean {
  const normRoot = normalizePath(rootPath).replace(/\/+$/, "")
  const normTarget = normalizePath(targetPath)
  return normTarget === normRoot || normTarget.startsWith(normRoot + "/")
}

function buildExcludeRegex(excludePatterns: string[]): RegExp | null {
  if (!excludePatterns || excludePatterns.length === 0) return null

  const regexFragments: string[] = []

  for (const rawPattern of excludePatterns) {
    if (!rawPattern || typeof rawPattern !== "string") continue
    let p = rawPattern.replace(/\\/g, "/").trim()
    if (!p) continue

    p = p
      .replace(/^\*\*\/+/, "")
      .replace(/\/+\*\*$/, "")
      .replace(/\/+\*$/, "")
      .replace(/\/+$/, "")
    if (!p) continue

    if (/^\*?\.[a-zA-Z0-9_-]+$/.test(p)) {
      const ext = p.replace(/^\*/, "")
      const escapedExt = ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      regexFragments.push(`(?:^|/)[^/]*${escapedExt}(?:/|$)`)
      continue
    }

    if (p.includes("*")) {
      const escaped = p
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
      regexFragments.push(`(?:^|/)${escaped}(?:/|$)`)
    } else {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      regexFragments.push(`(?:^|/)${escaped}(?:/|$)`)
    }
  }

  if (regexFragments.length === 0) return null
  return new RegExp(regexFragments.join("|"), "i")
}

describe("Scanner Path Normalization & Matching", () => {
  it("normalizes Windows backslashes and casing", () => {
    expect(normalizePath("D:\\Photos\\SubFolder\\Image.JPG")).toBe(
      "d:/photos/subfolder/image.jpg"
    )
    expect(normalizePath("d:/photos/subfolder/image.jpg")).toBe(
      "d:/photos/subfolder/image.jpg"
    )
  })

  it("matches root paths regardless of slashes", () => {
    expect(
      matchesRootPath("D:\\Photos", "d:/photos/vacation/pic.jpg")
    ).toBe(true)
    expect(
      matchesRootPath("d:/photos/", "D:\\Photos\\vacation\\pic.jpg")
    ).toBe(true)
    expect(
      matchesRootPath("D:\\Photos", "D:\\Photos")
    ).toBe(true)
  })

  it("prevents false positive prefix matches across sibling directories", () => {
    expect(
      matchesRootPath("D:\\Photos", "D:\\Photos-Extra\\pic.jpg")
    ).toBe(false)
    expect(
      matchesRootPath("D:\\Photos", "D:\\PhotosExtra\\pic.jpg")
    ).toBe(false)
  })

  describe("Exclusion Pattern Matching", () => {
    it("correctly matches .thumbnails folder and contents", () => {
      const regex = buildExcludeRegex([".thumbnails", "node_modules", "*.tmp"])
      expect(regex).not.toBeNull()
      if (!regex) return

      expect(regex.test("d:/photos/.thumbnails")).toBe(true)
      expect(regex.test("d:/photos/.thumbnails/thumb1.jpg")).toBe(true)
      expect(regex.test("d:/photos/subfolder/.thumbnails/thumb1.jpg")).toBe(true)
    })

    it("handles glob patterns like **/.thumbnails/**", () => {
      const regex = buildExcludeRegex(["**/.thumbnails/**"])
      expect(regex).not.toBeNull()
      if (!regex) return

      expect(regex.test("d:/photos/.thumbnails")).toBe(true)
      expect(regex.test("d:/photos/.thumbnails/thumb1.jpg")).toBe(true)
    })

    it("prevents false positives on similar folder names", () => {
      const regex = buildExcludeRegex(["bin", "out", "temp"])
      expect(regex).not.toBeNull()
      if (!regex) return

      expect(regex.test("d:/photos/cabin_trip/image.jpg")).toBe(false)
      expect(regex.test("d:/photos/outdoors/sunset.jpg")).toBe(false)
      expect(regex.test("d:/photos/temperature/reading.jpg")).toBe(false)

      expect(regex.test("d:/photos/bin/file.jpg")).toBe(true)
      expect(regex.test("d:/photos/out/file.jpg")).toBe(true)
      expect(regex.test("d:/photos/temp/file.jpg")).toBe(true)
    })

    it("matches wildcard extension patterns", () => {
      const regex = buildExcludeRegex(["*.tmp", "*.log"])
      expect(regex).not.toBeNull()
      if (!regex) return

      expect(regex.test("d:/photos/cache.tmp")).toBe(true)
      expect(regex.test("d:/photos/sub/error.log")).toBe(true)
      expect(regex.test("d:/photos/photo.jpg")).toBe(false)
    })
  })

  describe("Scan Pruning Logic", () => {
    it("identifies previously indexed items that are now excluded for pruning", () => {
      const existingDbItems = [
        { path: "D:\\Photos\\vacation.jpg" },
        { path: "D:\\Photos\\.thumbnails\\thumb1.jpg" },
        { path: "D:\\Photos\\.thumbnails\\thumb2.jpg" },
      ]

      // During scan, .thumbnails is excluded so discoverFiles only finds vacation.jpg
      const discoveredPaths = new Set(["d:/photos/vacation.jpg"])

      const deletedPaths: string[] = []
      for (const item of existingDbItems) {
        const norm = normalizePath(item.path)
        if (!discoveredPaths.has(norm)) {
          deletedPaths.push(item.path)
        }
      }

      expect(deletedPaths).toEqual([
        "D:\\Photos\\.thumbnails\\thumb1.jpg",
        "D:\\Photos\\.thumbnails\\thumb2.jpg",
      ])
    })
  })

  describe("Thumbnail Version Validation & Purge Filtering", () => {
    const IMAGE_THUMB_SUFFIX = "_v3.webp"
    const VIDEO_THUMB_SUFFIX = "_v2.webp"

    function isThumbnailCurrent(
      thumbnailPath: string | null | undefined,
      mediaType: "photo" | "video"
    ): boolean {
      if (!thumbnailPath) return false
      const expectedSuffix =
        mediaType === "video" ? VIDEO_THUMB_SUFFIX : IMAGE_THUMB_SUFFIX
      return thumbnailPath.endsWith(expectedSuffix)
    }

    function getOldThumbnailsToPurge(
      files: string[],
      mediaId: string,
      currentFilename: string
    ): string[] {
      return files.filter((file) => {
        return (
          (file.startsWith(`${mediaId}_`) || file === `${mediaId}.webp`) &&
          file.endsWith(".webp") &&
          file !== currentFilename &&
          !file.includes("_frame_")
        )
      })
    }

    it("correctly identifies current vs outdated thumbnail versions", () => {
      // Photo tests
      expect(isThumbnailCurrent("d:/cache/abc_v3.webp", "photo")).toBe(true)
      expect(isThumbnailCurrent("d:/cache/abc_v2.webp", "photo")).toBe(false)
      expect(isThumbnailCurrent("d:/cache/abc_v1.webp", "photo")).toBe(false)
      expect(isThumbnailCurrent("d:/cache/abc.webp", "photo")).toBe(false)
      expect(isThumbnailCurrent(null, "photo")).toBe(false)

      // Video tests
      expect(isThumbnailCurrent("d:/cache/vid_v2.webp", "video")).toBe(true)
      expect(isThumbnailCurrent("d:/cache/vid_v1.webp", "video")).toBe(false)
      expect(isThumbnailCurrent("d:/cache/vid_v3.webp", "video")).toBe(false)
      expect(isThumbnailCurrent("d:/cache/vid.webp", "video")).toBe(false)
    })

    it("filters outdated thumbnail versions for deletion while preserving video frames and current thumb", () => {
      const mediaId = "media123"
      const currentFilename = "media123_v3.webp"
      const directoryFiles = [
        "media123_v1.webp",
        "media123_v2.webp",
        "media123.webp",
        "media123_v3.webp", // current, should be kept
        "media123_frame_0.webp", // video frame, should be kept
        "media123_frame_1.webp", // video frame, should be kept
        "othermedia456_v2.webp", // another item, should be kept
      ]

      const toPurge = getOldThumbnailsToPurge(
        directoryFiles,
        mediaId,
        currentFilename
      )
      expect(toPurge).toEqual([
        "media123_v1.webp",
        "media123_v2.webp",
        "media123.webp",
      ])
    })
  })
})


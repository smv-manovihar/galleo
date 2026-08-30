import { describe, it, expect, vi, beforeEach } from "vitest"
import { ScannerService } from "../scanner.service"
import { MediaRepository } from "../../repositories/media.repository"

interface ScannerWithRepo {
  mediaRepository: MediaRepository
}



vi.mock("electron", () => ({
  app: {
    getVersion: vi.fn(() => "1.2.2"),
    getPath: vi.fn(() => "/mock/temp"),
  },
  BrowserWindow: vi.fn(),
}))

vi.mock("../../infrastructure/image-processor", () => ({
  isThumbnailCurrent: vi.fn(() => true),
  purgeStalePhotoThumbnails: vi.fn().mockResolvedValue(undefined),
  purgeOrphanedCacheFiles: vi.fn().mockResolvedValue({ freedThumbnails: 0, freedFrames: 0 }),
  purgeMediaThumbnailFiles: vi.fn().mockResolvedValue(undefined),
  getThumbnailCacheDir: vi.fn(() => "/mock/thumbnails"),
  getVideoFrameCacheDir: vi.fn(() => "/mock/thumbnails/video_frames"),
}))

vi.mock("../../infrastructure/video-processor", () => ({
  extractVideoMultiHash: vi.fn().mockResolvedValue({ ok: true, data: "mockhash" }),
}))

vi.mock("../../infrastructure/file-hasher", () => ({
  computeFastContentHash: vi.fn().mockResolvedValue({ ok: true, data: "mockexacthash" }),
}))

vi.mock("../storage.service", () => ({
  storageService: {
    invalidateCache: vi.fn(),
  },
}))

let mockSettings: Record<string, string> = {}
let mockMediaCount = 0
let mockMissingDataCount = 0
let mockTableColumns = [
  "id", "path", "name", "size", "extension", "media_type",
  "width", "height", "date_added", "date_filesystem", "date_target", "date_target_source",
  "exact_hash", "duration", "thumbnail_path", "date_modified",
  "blur_score", "brightness", "composite_score",
  "duplicate_group_id", "is_duplicate", "is_best_in_duplicate_group",
  "similarity_index", "review_state", "orientation",
]

vi.mock("../../infrastructure/database", () => ({
  initDatabase: () => ({
    prepare: (sql: string) => {
      const normalizedSql = sql.trim().replace(/\s+/g, " ")
      if (normalizedSql.includes("SELECT value FROM settings WHERE key =")) {
        return {
          get: () => {
            const key = normalizedSql.includes("'last_indexed_version'")
              ? "last_indexed_version"
              : normalizedSql.includes("'scan_in_progress'")
              ? "scan_in_progress"
              : "app_settings"
            const val = mockSettings[key]
            return val !== undefined ? { value: val } : undefined
          },
        }
      }
      if (normalizedSql.includes("INSERT INTO settings")) {
        return {
          run: (...args: unknown[]) => {
            if (args[0] && typeof args[0] === "string" && args[1] && typeof args[1] === "string") {
              mockSettings[args[0]] = args[1]
            }
          },
        }
      }
      if (normalizedSql.includes("SELECT COUNT(*) as count FROM media_items")) {
        return {
          get: () => ({ count: mockMediaCount }),
        }
      }
      return {
        get: () => undefined,
        run: () => {},
        all: () => [],
      }
    },
    pragma: (statement: string) => {
      if (statement.includes("table_info(media_items)")) {
        return mockTableColumns.map((name) => ({ name }))
      }
      return []
    },
  }),
}))

describe("ScannerService Library Compatibility Check", () => {
  let scannerService: ScannerService

  beforeEach(() => {
    vi.clearAllMocks()
    mockSettings = {}
    mockMediaCount = 0
    mockMissingDataCount = 0
    mockTableColumns = [
      "id", "path", "name", "size", "extension", "media_type",
      "width", "height", "date_added", "date_filesystem", "date_target", "date_target_source",
      "exact_hash", "duration", "thumbnail_path", "date_modified",
      "blur_score", "brightness", "composite_score",
      "duplicate_group_id", "is_duplicate", "is_best_in_duplicate_group",
      "similarity_index", "review_state", "orientation",
    ]

    // Instantiate ScannerService
    scannerService = new ScannerService()

    // Mock mediaRepository methods directly on the instance to ensure clean test boundary
    const repo = (scannerService as unknown as ScannerWithRepo).mediaRepository
    vi.spyOn(repo, "getTotalMediaCount").mockImplementation(() => mockMediaCount)
    vi.spyOn(repo, "getTableColumns").mockImplementation(() => mockTableColumns)
    vi.spyOn(repo, "getItemsWithMissingCriticalDataCount").mockImplementation(() => mockMissingDataCount)
  })


  it("returns compatible for a fresh/empty library with 0 items", async () => {
    mockMediaCount = 0
    const status = await scannerService.checkLibraryCompatibility()

    expect(status.isCompatible).toBe(true)
    expect(status.needsForceRescan).toBe(false)
    expect(status.reasons).toHaveLength(0)
    expect(status.totalItemsCount).toBe(0)
  })

  it("flags missing columns when database table schema is outdated", async () => {
    mockMediaCount = 50
    // Remove exact_hash and orientation columns from table info
    mockTableColumns = mockTableColumns.filter(c => c !== "exact_hash" && c !== "orientation")
    mockSettings["last_indexed_version"] = "5"

    const status = await scannerService.checkLibraryCompatibility()

    expect(status.isCompatible).toBe(false)
    expect(status.needsForceRescan).toBe(true)
    expect(status.missingColumns).toContain("exact_hash")
    expect(status.missingColumns).toContain("orientation")
    expect(status.reasons.some(r => r.includes("missing columns"))).toBe(true)
  })

  it("flags items with missing critical data (null exact_hash, duration, or similarity)", async () => {
    mockMediaCount = 100
    mockMissingDataCount = 42
    mockSettings["last_indexed_version"] = "5"

    const status = await scannerService.checkLibraryCompatibility()

    expect(status.isCompatible).toBe(false)
    expect(status.needsForceRescan).toBe(true)
    expect(status.itemsWithMissingDataCount).toBe(42)
    expect(status.reasons.some(r => r.includes("missing updated metadata"))).toBe(true)
  })

  it("flags legacy index when last_indexed_version is missing in settings", async () => {
    mockMediaCount = 100
    mockMissingDataCount = 0
    // No last_indexed_version set in mockSettings

    const status = await scannerService.checkLibraryCompatibility()

    expect(status.isCompatible).toBe(false)
    expect(status.needsForceRescan).toBe(true)
    expect(status.lastIndexedVersion).toBeNull()
    expect(status.reasons.some(r => r.includes("legacy version"))).toBe(true)
  })

  it("flags older index version when last_indexed_version is less than required index version", async () => {
    mockMediaCount = 100
    mockMissingDataCount = 0
    mockSettings["last_indexed_version"] = "3" // older index version

    const status = await scannerService.checkLibraryCompatibility()

    expect(status.isCompatible).toBe(false)
    expect(status.needsForceRescan).toBe(true)
    expect(status.lastIndexedVersion).toBe(3)
    expect(status.currentIndexVersion).toBe(5)
    expect(status.reasons.some(r => r.includes("v3") && r.includes("v5"))).toBe(true)
  })

  it("flags interrupted scan and sets issueType to interrupted", async () => {
    mockMediaCount = 100
    mockSettings["scan_in_progress"] = "1"
    mockSettings["last_indexed_version"] = "5"


    const status = await scannerService.checkLibraryCompatibility()

    expect(status.isCompatible).toBe(false)
    expect(status.needsForceRescan).toBe(true)
    expect(status.wasScanInterrupted).toBe(true)
    expect(status.issueType).toBe("interrupted")
  })

  it("returns compatible when library is fully indexed with current index version and all columns present", async () => {
    mockMediaCount = 500
    mockMissingDataCount = 0
    mockSettings["last_indexed_version"] = "5"

    const status = await scannerService.checkLibraryCompatibility()

    expect(status.isCompatible).toBe(true)
    expect(status.needsForceRescan).toBe(false)
    expect(status.issueType).toBeNull()
    expect(status.reasons).toHaveLength(0)
    expect(status.itemsWithMissingDataCount).toBe(0)
    expect(status.missingColumns).toHaveLength(0)
    expect(status.lastIndexedVersion).toBe(5)
    expect(status.currentIndexVersion).toBe(5)
  })
})



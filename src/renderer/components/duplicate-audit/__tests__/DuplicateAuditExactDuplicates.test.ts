import { describe, it, expect } from "vitest"
import type { MediaItem } from "../../../../shared/types/media"
import type { ExactDuplicateGroup, FolderRuleType } from "../exact-duplicates/types"
import { getDirPath, getFilenameAndExt } from "../exact-duplicates/types"

describe("DuplicateAuditExactDuplicates helper & resolution logic", () => {
  const createMockItem = (
    id: string,
    name: string,
    dir: string,
    size = 2048,
    date = "2026-01-01T10:00:00Z"
  ): MediaItem => ({
    id,
    name,
    path: `${dir}/${name}`,
    size,
    extension: "jpg",
    mediaType: "photo",
    dateAdded: date,
    dateFileSystem: date,
    dateTarget: date,
    dateTargetSource: "filesystem",
    isDuplicate: true,
    isBestInDuplicateGroup: false,
    reviewState: "pending",
  })

  it("extracts directory path correctly with forward and backslashes", () => {
    expect(getDirPath("C:/Users/Pictures/Holiday/photo.jpg")).toBe("C:/Users/Pictures/Holiday")
    expect(getDirPath("C:\\Users\\Pictures\\Holiday\\photo.jpg")).toBe("C:\\Users\\Pictures\\Holiday")
    expect(getDirPath("photo.jpg")).toBe("photo.jpg")
  })

  it("extracts base filename and extension cleanly", () => {
    expect(getFilenameAndExt("IMG_1234.JPG")).toEqual({ base: "IMG_1234", ext: ".JPG" })
    expect(getFilenameAndExt("archive.tar.gz")).toEqual({ base: "archive.tar", ext: ".gz" })
    expect(getFilenameAndExt("no_ext")).toEqual({ base: "no_ext", ext: "" })
  })

  it("resolves groups with manual overrides correctly", () => {
    const itemA = createMockItem("id-1", "pic.jpg", "C:/FolderA")
    const itemB = createMockItem("id-2", "pic.jpg", "C:/FolderB")
    const itemC = createMockItem("id-3", "pic.jpg", "C:/FolderC")

    const duplicateGroups = [[itemA, itemB, itemC]]
    const exactDupsToKeep = [itemA]

    // Baseline resolution (no override)
    const resolveGroups = (overrides: Map<number, string>): ExactDuplicateGroup[] => {
      return duplicateGroups
        .map((group, idx) => {
          if (group.length < 2) return null
          const overrideKeepId = overrides.get(idx)
          const keep = overrideKeepId
            ? group.find((i) => i.id === overrideKeepId) ?? group[0]
            : exactDupsToKeep.find((k) => group.some((i) => i.id === k.id)) ?? group[0]
          const deletes = group.filter((i) => i.id !== keep.id)
          return { keep, deletes, groupIdx: idx }
        })
        .filter(Boolean) as ExactDuplicateGroup[]
    }

    const baseline = resolveGroups(new Map())
    expect(baseline[0].keep.id).toBe("id-1")
    expect(baseline[0].deletes.map((d) => d.id)).toEqual(["id-2", "id-3"])

    // User overrides group 0 to keep itemB instead
    const overrides = new Map([[0, "id-2"]])
    const overridden = resolveGroups(overrides)
    expect(overridden[0].keep.id).toBe("id-2")
    expect(overridden[0].deletes.map((d) => d.id)).toEqual(["id-1", "id-3"])
  })

  it("computes folder priority rule applications", () => {
    const rules: Record<string, FolderRuleType> = {
      "C:/KeepFolder": "keep",
      "C:/DeleteFolder": "delete",
      "C:/DefaultFolder": "off",
    }

    const keepFolders: string[] = []
    const deleteFolders: string[] = []
    for (const [folder, rule] of Object.entries(rules)) {
      if (rule === "keep") keepFolders.push(folder)
      if (rule === "delete") deleteFolders.push(folder)
    }

    expect(keepFolders).toEqual(["C:/KeepFolder"])
    expect(deleteFolders).toEqual(["C:/DeleteFolder"])
  })

  it("resolves groups efficiently using O(1) Set lookup with full parity", () => {
    const itemA = createMockItem("id-1", "pic.jpg", "C:/FolderA")
    const itemB = createMockItem("id-2", "pic.jpg", "C:/FolderB")
    const itemC = createMockItem("id-3", "pic.jpg", "C:/FolderC")

    const duplicateGroups = [[itemA, itemB, itemC]]
    const exactDupsToKeep = [itemB]
    const exactDupsToKeepIdSet = new Set(exactDupsToKeep.map((k) => k.id))

    const resolveWithSet = (overrides: Map<number, string>): ExactDuplicateGroup[] => {
      return duplicateGroups
        .map((group, idx) => {
          if (group.length < 2) return null
          const overrideKeepId = overrides.get(idx)
          const keep = overrideKeepId
            ? group.find((i) => i.id === overrideKeepId) ?? group[0]
            : group.find((i) => exactDupsToKeepIdSet.has(i.id)) ?? group[0]
          const deletes = group.filter((i) => i.id !== keep.id)
          return { keep, deletes, groupIdx: idx }
        })
        .filter(Boolean) as ExactDuplicateGroup[]
    }

    const resolved = resolveWithSet(new Map())
    expect(resolved[0].keep.id).toBe("id-2")
    expect(resolved[0].deletes.map((d) => d.id)).toEqual(["id-1", "id-3"])
  })

  it("accumulates delete count and reclaim size in a single pass", () => {
    const itemA = createMockItem("id-1", "pic1.jpg", "C:/FolderA", 1024)
    const itemB = createMockItem("id-2", "pic1.jpg", "C:/FolderB", 1024)
    const itemC = createMockItem("id-3", "pic2.jpg", "C:/FolderA", 4096)
    const itemD = createMockItem("id-4", "pic2.jpg", "C:/FolderB", 4096)
    const itemE = createMockItem("id-5", "pic2.jpg", "C:/FolderC", 4096)

    const resolvedGroups: ExactDuplicateGroup[] = [
      { groupIdx: 0, keep: itemA, deletes: [itemB] },
      { groupIdx: 1, keep: itemC, deletes: [itemD, itemE] },
    ]

    let count = 0
    let size = 0
    for (const g of resolvedGroups) {
      count += g.deletes.length
      for (const d of g.deletes) {
        size += d.size || 0
      }
    }

    expect(count).toBe(3)
    expect(size).toBe(1024 + 4096 + 4096)
  })
})


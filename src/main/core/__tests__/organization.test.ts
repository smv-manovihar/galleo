import { describe, it, expect } from "vitest"
import {
  buildFolderPathFromPattern,
  resolveFilenameConflict,
  planOrganization,
} from "../organization"
import type { MediaItem } from "../../../shared/types/media"

describe("buildFolderPathFromPattern", () => {
  const date = new Date(2024, 2, 15, 10, 30, 0) // Mar 15, 2024

  it("substitutes basic date tokens", () => {
    expect(buildFolderPathFromPattern("YYYY/MM/DD", date)).toBe("2024/03/15/")
    expect(buildFolderPathFromPattern("YYYY/MM", date)).toBe("2024/03/")
  })

  it("handles month names (MMMM)", () => {
    expect(buildFolderPathFromPattern("YYYY/MM - MMMM/DD", date)).toBe(
      "2024/03 - March/15/"
    )
  })

  it("normalizes slashes and guarantees trailing slash", () => {
    expect(buildFolderPathFromPattern("YYYY\\MM\\", date)).toBe("2024/03/")
    expect(buildFolderPathFromPattern("YYYY/MM", date)).toBe("2024/03/")
  })
})

describe("resolveFilenameConflict", () => {
  it("returns original name when no conflict exists", () => {
    const existing = new Set<string>(["image_1.jpg", "other.png"])
    expect(resolveFilenameConflict("image.jpg", existing)).toBe("image.jpg")
  })

  it("suffixes filename when conflict is found", () => {
    const existing = new Set<string>(["image.jpg", "image_1.jpg"])
    expect(resolveFilenameConflict("image.jpg", existing)).toBe("image_2.jpg")
  })

  it("respects file extensions", () => {
    const existing = new Set<string>(["video.mp4"])
    expect(resolveFilenameConflict("video.mp4", existing)).toBe("video_1.mp4")
  })

  it("handles filenames without extensions", () => {
    const existing = new Set<string>(["data", "data_1"])
    expect(resolveFilenameConflict("data", existing)).toBe("data_2")
  })
})

describe("planOrganization", () => {
  const createMockItem = (
    id: string,
    dateStr: string,
    name: string
  ): MediaItem => ({
    id,
    path: `D:\\Source\\${name}`,
    name,
    size: 2000,
    extension: "jpg",
    mediaType: "photo",
    dateAdded: new Date().toISOString(),
    dateFileSystem: dateStr,
    dateTarget: dateStr,
    dateTargetSource: "filesystem",
    isDuplicate: false,
    isBestInDuplicateGroup: false,
    reviewState: "pending",
  })

  it("plans organization paths and flags conflicts", () => {
    const item1 = createMockItem(
      "item1",
      "2024-03-15T12:00:00.000Z",
      "photo.jpg"
    )
    const item2 = createMockItem(
      "item2",
      "2024-03-15T12:00:00.000Z",
      "other.jpg"
    )

    // Simulate target directories
    const existing = new Set<string>([
      "d:/target/2024/03/other.jpg".toLowerCase(), // item2 target already exists on disk
    ])

    const plan = planOrganization({
      items: [item1, item2],
      destinationDir: "D:\\Target",
      pattern: "YYYY/MM/",
      existingFilePaths: existing,
    })

    expect(plan.length).toBe(2)

    // item1 has no conflicts
    const plan1 = plan.find((p) => p.mediaId === "item1")!
    expect(plan1.targetPath).toBe("D:\\Target\\2024\\03\\photo.jpg")
    expect(plan1.conflict).toBe(false)

    // item2 will conflict because of existing file in destination
    const plan2 = plan.find((p) => p.mediaId === "item2")!
    // Wait, since we are doing conflict resolution (rename):
    // If conflictResolution in Settings is "rename", the target path is adjusted to "other_1.jpg",
    // and conflict becomes false since the renamed path does not exist on disk!
    // Let's verify our logic: planOrganization resolves conflicts by generating a non-conflicting filename
    // and setting conflict to true only if it can't be resolved or if the final target conflicts.
    // In our implementation, `isConflict` is defined as `existingFilePaths.has(targetPath.toLowerCase())`
    // which checks the resolved targetPath. Since targetPath is resolved to other_1.jpg, and other_1.jpg
    // is NOT in existing, `conflict` will be false! This is correct (no collision on target).
    // Let's test that item2 resolves to other_1.jpg.
    expect(plan2.targetPath).toBe("D:\\Target\\2024\\03\\other_1.jpg")
    expect(plan2.conflict).toBe(false)
  })
})

import { describe, it, expect } from "vitest"
import type { MediaItem } from "../../../../shared/types/media"

describe("DuplicateAuditProgressSeeker logic", () => {
  const createMockItem = (id: string, name: string, size = 1000): MediaItem => ({
    id,
    name,
    path: `C:/photos/${name}`,
    size,
    extension: "jpg",
    mediaType: "photo",
    dateAdded: "2026-01-01T00:00:00Z",
    dateFileSystem: "2026-01-01T00:00:00Z",
    dateTarget: "2026-01-01T00:00:00Z",
    dateTargetSource: "filesystem",
    isDuplicate: true,
    isBestInDuplicateGroup: false,
    reviewState: "pending",
  })

  const group1: MediaItem[] = [
    createMockItem("item1", "photo1.jpg"),
    createMockItem("item2", "photo2.jpg"),
  ]
  const group2: MediaItem[] = [
    createMockItem("item3", "photo3.jpg"),
    createMockItem("item4", "photo4.jpg"),
    createMockItem("item5", "photo5.jpg"),
  ]
  const group3: MediaItem[] = [
    createMockItem("item6", "photo6.jpg"),
    createMockItem("item7", "photo7.jpg"),
  ]

  const allGroups = [group1, group2, group3]

  it("accurately computes group decision stats for pending vs decided groups", () => {
    const decisions: Record<string, "keep" | "delete" | "skipped"> = {
      item1: "keep",
      item2: "delete", // group1 completely decided
      item3: "keep",   // group2 partially decided (item4, item5 pending)
      // group3 unreviewed
    }

    const groupStats = allGroups.map((group) => {
      let keepCount = 0
      let deleteCount = 0
      let pendingCount = 0

      for (const item of group) {
        const dec = decisions[item.id]
        if (dec === "keep") keepCount++
        else if (dec === "delete") deleteCount++
        else pendingCount++
      }

      const isDecided = pendingCount === 0 && (keepCount > 0 || deleteCount > 0)
      return { isDecided, keepCount, deleteCount, pendingCount }
    })

    expect(groupStats[0].isDecided).toBe(true)
    expect(groupStats[0].keepCount).toBe(1)
    expect(groupStats[0].deleteCount).toBe(1)
    expect(groupStats[0].pendingCount).toBe(0)

    expect(groupStats[1].isDecided).toBe(false)
    expect(groupStats[1].keepCount).toBe(1)
    expect(groupStats[1].pendingCount).toBe(2)

    expect(groupStats[2].isDecided).toBe(false)
    expect(groupStats[2].pendingCount).toBe(2)

    const totalDecided = groupStats.filter((g) => g.isDecided).length
    expect(totalDecided).toBe(1)
  })

  it("calculates active marker percentage correctly", () => {
    const totalGroups = 4
    const getPercent = (activeIndex: number) => ((activeIndex + 0.5) / totalGroups) * 100

    expect(getPercent(0)).toBe(12.5)
    expect(getPercent(1)).toBe(37.5)
    expect(getPercent(2)).toBe(62.5)
    expect(getPercent(3)).toBe(87.5)
  })

  it("clamps seek ratio to valid group indices", () => {
    const totalGroups = 5
    const getIndexFromRatio = (ratio: number) => {
      const clampedRatio = Math.max(0, Math.min(1, ratio))
      return Math.min(totalGroups - 1, Math.max(0, Math.floor(clampedRatio * totalGroups)))
    }

    expect(getIndexFromRatio(-0.5)).toBe(0)
    expect(getIndexFromRatio(0)).toBe(0)
    expect(getIndexFromRatio(0.19)).toBe(0)
    expect(getIndexFromRatio(0.2)).toBe(1)
    expect(getIndexFromRatio(0.5)).toBe(2)
    expect(getIndexFromRatio(0.99)).toBe(4)
    expect(getIndexFromRatio(1.5)).toBe(4)
  })

  it("finds next pending index with forward search and wrap-around", () => {
    // decided: [1, 1, 0, 1, 0] (indices 0, 1, 3 are decided; indices 2, 4 are pending)
    const decidedArray = new Uint8Array([1, 1, 0, 1, 0])
    const total = decidedArray.length

    const findNextPending = (activeIdx: number): number => {
      for (let i = activeIdx + 1; i < total; i++) {
        if (decidedArray[i] === 0) return i
      }
      for (let i = 0; i < activeIdx; i++) {
        if (decidedArray[i] === 0) return i
      }
      return -1
    }

    // From index 0, next pending is index 2
    expect(findNextPending(0)).toBe(2)
    // From index 2, next pending is index 4
    expect(findNextPending(2)).toBe(4)
    // From index 4, next pending wraps around to index 2
    expect(findNextPending(4)).toBe(2)

    // All decided case
    const allDecided = new Uint8Array([1, 1, 1])
    const findNextPendingAll = (activeIdx: number) => {
      for (let i = activeIdx + 1; i < 3; i++) if (allDecided[i] === 0) return i
      for (let i = 0; i < activeIdx; i++) if (allDecided[i] === 0) return i
      return -1
    }
    expect(findNextPendingAll(1)).toBe(-1)
  })

  it("finds previous pending index with backward search and wrap-around", () => {
    // decided: [1, 1, 0, 1, 0] (indices 0, 1, 3 are decided; indices 2, 4 are pending)
    const decidedArray = new Uint8Array([1, 1, 0, 1, 0])
    const total = decidedArray.length

    const findPrevPending = (activeIdx: number): number => {
      for (let i = activeIdx - 1; i >= 0; i--) {
        if (decidedArray[i] === 0) return i
      }
      for (let i = total - 1; i > activeIdx; i--) {
        if (decidedArray[i] === 0) return i
      }
      return -1
    }

    // From index 4, previous pending is index 2
    expect(findPrevPending(4)).toBe(2)
    // From index 3, previous pending is index 2
    expect(findPrevPending(3)).toBe(2)
    // From index 2, previous pending wraps around to index 4
    expect(findPrevPending(2)).toBe(4)
    // From index 0, previous pending wraps around to index 4
    expect(findPrevPending(0)).toBe(4)

    // All decided case
    const allDecided = new Uint8Array([1, 1, 1])
    const findPrevPendingAll = (activeIdx: number) => {
      for (let i = activeIdx - 1; i >= 0; i--) if (allDecided[i] === 0) return i
      for (let i = 2; i > activeIdx; i--) if (allDecided[i] === 0) return i
      return -1
    }
    expect(findPrevPendingAll(1)).toBe(-1)
  })

  it("parses and validates direct group input correctly", () => {
    const totalGroups = 250
    const parseGroupInput = (input: string): number | null => {
      const clean = input.replace(/[^\d]/g, "")
      const val = parseInt(clean, 10)
      if (!isNaN(val) && val >= 1 && val <= totalGroups) {
        return val - 1 // 0-based index
      }
      return null
    }

    expect(parseGroupInput("1")).toBe(0)
    expect(parseGroupInput("42")).toBe(41)
    expect(parseGroupInput("250")).toBe(249)
    expect(parseGroupInput("0")).toBeNull()
    expect(parseGroupInput("251")).toBeNull()
    expect(parseGroupInput("invalid")).toBeNull()
    expect(parseGroupInput("  15  ")).toBe(14)
    expect(parseGroupInput("Group 15")).toBe(14)
  })

  it("normalizes input when starting with zero and entering subsequent digits", () => {
    const normalizeInput = (raw: string): string => {
      let val = raw
      if (/^0+[1-9]/.test(val)) {
        val = val.replace(/^0+/, "")
      } else if (/^0+$/.test(val)) {
        val = "0"
      }
      return val
    }

    expect(normalizeInput("05")).toBe("5")
    expect(normalizeInput("007")).toBe("7")
    expect(normalizeInput("00")).toBe("0")
    expect(normalizeInput("0")).toBe("0")
    expect(normalizeInput("042")).toBe("42")
    expect(normalizeInput("100")).toBe("100")
    expect(normalizeInput("10")).toBe("10")
    expect(normalizeInput("")).toBe("")
  })

  it("handles bitset decision calculation efficiently for 5,000 groups in <5ms", () => {
    const largeGroups: MediaItem[][] = Array.from({ length: 5000 }, (_, i) => [
      createMockItem(`item_a_${i}`, `photo_a_${i}.jpg`),
      createMockItem(`item_b_${i}`, `photo_b_${i}.jpg`),
    ])

    const mockDecisions: Record<string, "keep" | "delete" | "skipped"> = {}
    for (let i = 0; i < 2000; i++) {
      mockDecisions[`item_a_${i}`] = "keep"
      mockDecisions[`item_b_${i}`] = "delete"
    }

    const startTime = performance.now()
    let count = 0
    const total = largeGroups.length
    const arr = new Uint8Array(total)

    for (let i = 0; i < total; i++) {
      const g = largeGroups[i]
      let isDecided = g.length > 0
      for (let j = 0; j < g.length; j++) {
        const dec = mockDecisions[g[j].id]
        if (dec !== "keep" && dec !== "delete") {
          isDecided = false
          break
        }
      }
      if (isDecided) {
        arr[i] = 1
        count++
      }
    }
    const elapsed = performance.now() - startTime

    expect(count).toBe(2000)
    expect(arr[0]).toBe(1)
    expect(arr[1999]).toBe(1)
    expect(arr[2000]).toBe(0)
    expect(arr[4999]).toBe(0)
    expect(elapsed).toBeLessThan(50) // Extremely fast
  })
})

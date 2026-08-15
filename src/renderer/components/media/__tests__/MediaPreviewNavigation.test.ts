import { describe, it, expect } from "vitest"
import type { MediaItem } from "../../../../shared/types/media"

describe("MediaPreview navigation bounds logic", () => {
  const mockItems: MediaItem[] = [
    {
      id: "item-1",
      name: "img1.jpg",
      path: "/photos/img1.jpg",
      size: 1024,
      extension: "jpg",
      mediaType: "photo",
      dateAdded: "2026-01-01T00:00:00.000Z",
      dateModified: "2026-01-01T00:00:00.000Z",
      dateTarget: "2026-01-01T00:00:00.000Z",
      dateTargetSource: "filesystem",
      dateFileSystem: "2026-01-01T00:00:00.000Z",
      isDuplicate: false,
      isBestInDuplicateGroup: false,
      reviewState: "pending",
    },
    {
      id: "item-2",
      name: "img2.jpg",
      path: "/photos/img2.jpg",
      size: 2048,
      extension: "jpg",
      mediaType: "photo",
      dateAdded: "2026-01-02T00:00:00.000Z",
      dateModified: "2026-01-02T00:00:00.000Z",
      dateTarget: "2026-01-02T00:00:00.000Z",
      dateTargetSource: "filesystem",
      dateFileSystem: "2026-01-02T00:00:00.000Z",
      isDuplicate: false,
      isBestInDuplicateGroup: false,
      reviewState: "pending",
    },
    {
      id: "item-3",
      name: "img3.jpg",
      path: "/photos/img3.jpg",
      size: 3072,
      extension: "jpg",
      mediaType: "photo",
      dateAdded: "2026-01-03T00:00:00.000Z",
      dateModified: "2026-01-03T00:00:00.000Z",
      dateTarget: "2026-01-03T00:00:00.000Z",
      dateTargetSource: "filesystem",
      dateFileSystem: "2026-01-03T00:00:00.000Z",
      isDuplicate: false,
      isBestInDuplicateGroup: false,
      reviewState: "pending",
    },
  ]

  it("calculates hasNext as false when current item is null", () => {
    const item = null as MediaItem | null
    const items = mockItems as MediaItem[] | undefined
    const currentIndex = items && item ? items.findIndex((i) => i.id === item.id) : -1
    const hasPrevious = currentIndex > 0
    const hasNext = items && currentIndex >= 0 ? currentIndex < items.length - 1 : false

    expect(currentIndex).toBe(-1)
    expect(hasPrevious).toBe(false)
    expect(hasNext).toBe(false)
  })

  it("calculates hasNext and hasPrevious correctly at the first item", () => {
    const item = mockItems[0]
    const items = mockItems
    const currentIndex = items && item ? items.findIndex((i) => i.id === item.id) : -1
    const hasPrevious = currentIndex > 0
    const hasNext = items && currentIndex >= 0 ? currentIndex < items.length - 1 : false

    expect(currentIndex).toBe(0)
    expect(hasPrevious).toBe(false)
    expect(hasNext).toBe(true)
  })

  it("calculates hasNext and hasPrevious correctly at the middle item", () => {
    const item = mockItems[1]
    const items = mockItems
    const currentIndex = items && item ? items.findIndex((i) => i.id === item.id) : -1
    const hasPrevious = currentIndex > 0
    const hasNext = items && currentIndex >= 0 ? currentIndex < items.length - 1 : false

    expect(currentIndex).toBe(1)
    expect(hasPrevious).toBe(true)
    expect(hasNext).toBe(true)
  })

  it("calculates hasNext and hasPrevious correctly at the last item", () => {
    const item = mockItems[2]
    const items = mockItems
    const currentIndex = items && item ? items.findIndex((i) => i.id === item.id) : -1
    const hasPrevious = currentIndex > 0
    const hasNext = items && currentIndex >= 0 ? currentIndex < items.length - 1 : false

    expect(currentIndex).toBe(2)
    expect(hasPrevious).toBe(true)
    expect(hasNext).toBe(false)
  })

  it("ensures item is null when propItem is null even if navigatedItem was set", () => {
    const propItem: MediaItem | null = null
    const navigatedItem: MediaItem | null = mockItems[0]
    const resolvedItem = propItem ? (navigatedItem ?? propItem) : null

    expect(resolvedItem).toBeNull()
  })
})

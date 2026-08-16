import { describe, it, expect } from "vitest"
import { filterAndSortItems, type FilterAndSortOptions } from "../media-store"
import type { MediaItem } from "../../../shared/types/media"

describe("filterAndSortItems sorting logic", () => {
  const createMockItem = (
    id: string,
    overrides: Partial<MediaItem> = {}
  ): MediaItem => ({
    id,
    path: `C:/Photos/${id}.jpg`,
    name: `${id}.jpg`,
    size: 1_000_000,
    extension: "jpg",
    mediaType: "photo",
    dateAdded: "2026-08-01T10:00:00.000Z",
    dateFileSystem: "2026-08-01T10:00:00.000Z",
    dateTarget: "2026-08-01T10:00:00.000Z",
    dateTargetSource: "filesystem",
    isDuplicate: false,
    isBestInDuplicateGroup: false,
    reviewState: "pending",
    orientation: 0,
    ...overrides,
  })

  const baseOptions: FilterAndSortOptions = {
    activeRootPath: null,
    searchQuery: "",
    filterType: "all",
    filterReviewState: "all",
    filterQuality: "all",
    sortBy: "date-desc",
    decisions: {},
  }

  it("distinguishes 'Highest Quality' (score-desc) from 'Newest First' (date-desc) when compositeScores are equal", () => {
    // itemOldSharp is older, but sharper (blurScore: 95)
    const itemOldSharp = createMockItem("item_old_sharp", {
      dateTarget: "2026-08-01T10:00:00.000Z",
      quality: {
        compositeScore: 100,
        blurScore: 95,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    // itemNewSoft is newer, but less sharp (blurScore: 60)
    const itemNewSoft = createMockItem("item_new_soft", {
      dateTarget: "2026-08-15T10:00:00.000Z",
      quality: {
        compositeScore: 100,
        blurScore: 60,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const items = [itemNewSoft, itemOldSharp]

    // Newest first should put itemNewSoft first
    const dateSorted = filterAndSortItems(items, {
      ...baseOptions,
      sortBy: "date-desc",
    })
    expect(dateSorted[0].id).toBe("item_new_soft")
    expect(dateSorted[1].id).toBe("item_old_sharp")

    // Highest quality should put itemOldSharp first because of higher sharpness
    const qualitySorted = filterAndSortItems(items, {
      ...baseOptions,
      sortBy: "score-desc",
    })
    expect(qualitySorted[0].id).toBe("item_old_sharp")
    expect(qualitySorted[1].id).toBe("item_new_soft")
  })

  it("tie-breaks score-desc by resolution and file size when scores are identical", () => {
    const item4k = createMockItem("item_4k", {
      width: 3840,
      height: 2160,
      size: 5_000_000,
      quality: {
        compositeScore: 100,
        blurScore: 90,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const item1080p = createMockItem("item_1080p", {
      width: 1920,
      height: 1080,
      size: 2_000_000,
      quality: {
        compositeScore: 100,
        blurScore: 90,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const qualitySorted = filterAndSortItems([item1080p, item4k], {
      ...baseOptions,
      sortBy: "score-desc",
    })
    expect(qualitySorted[0].id).toBe("item_4k")
    expect(qualitySorted[1].id).toBe("item_1080p")
  })

  it("sorts 'Lowest Quality' (score-asc) putting lowest compositeScore, lowest blurScore, and smallest resolution first", () => {
    const itemLowScore = createMockItem("item_low_score", {
      quality: {
        compositeScore: 30,
        blurScore: 20,
        brightness: 40,
        isDark: true,
        isBlurry: true,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const itemHighScore = createMockItem("item_high_score", {
      quality: {
        compositeScore: 100,
        blurScore: 95,
        brightness: 120,
        isDark: false,
        isBlurry: false,
        isScreenshot: false,
        isSmall: false,
      },
    })

    const sortedAsc = filterAndSortItems([itemHighScore, itemLowScore], {
      ...baseOptions,
      sortBy: "score-asc",
    })
    expect(sortedAsc[0].id).toBe("item_low_score")
    expect(sortedAsc[1].id).toBe("item_high_score")
  })

  it("sorts by size-desc and size-asc correctly", () => {
    const smallItem = createMockItem("small", { size: 100 })
    const largeItem = createMockItem("large", { size: 10_000 })

    const sortedDesc = filterAndSortItems([smallItem, largeItem], {
      ...baseOptions,
      sortBy: "size-desc",
    })
    expect(sortedDesc[0].id).toBe("large")
    expect(sortedDesc[1].id).toBe("small")

    const sortedAsc = filterAndSortItems([smallItem, largeItem], {
      ...baseOptions,
      sortBy: "size-asc",
    })
    expect(sortedAsc[0].id).toBe("small")
    expect(sortedAsc[1].id).toBe("large")
  })
})

import { create } from "zustand"
import type { MediaItem } from "../../shared/types/media"
import { useSettingsStore } from "./settings-store"
import { useSessionStore } from "./session-store"
import { useScanStore } from "./scan-store"
import { useUIStore } from "./ui-store"
import { findSimilarPerceptual, DEFAULT_SIMILARITY_RADIUS } from "../lib/similarity"

export interface CachedDashboardMetrics {
  totalFiles: number
  photoCount: number
  videoCount: number
  totalSize: number
  keptCount: number
  trashCount: number
  pendingCount: number
  reviewedCount: number
  reviewProgress: number
  blurryItems: MediaItem[]
  darkItems: MediaItem[]
  duplicateItems: MediaItem[]
  screenshotItems: MediaItem[]
  smallItems: MediaItem[]
  duplicateGroupsCount: number
  duplicateSavedBytes: number
  blurrySavedBytes: number
}

export interface FilterAndSortOptions {
  activeRootPath: string | null
  searchQuery: string
  similarTargetItem?: MediaItem | null
  similarRadius?: number
  filterType: "all" | "photo" | "video"
  filterReviewState: "all" | "pending" | "kept" | "trash"
  filterQuality:
    | "all"
    | "blurry"
    | "dark"
    | "duplicates"
    | "screenshots"
    | "small"
  sortBy:
    | "date-desc"
    | "date-asc"
    | "score-desc"
    | "score-asc"
    | "size-desc"
    | "size-asc"
  decisions: Record<string, "keep" | "delete" | "skipped">
}

/** Pure single-pass filter + sort pipeline shared by the store and UI. */
export function filterAndSortItems(
  items: MediaItem[],
  opts: FilterAndSortOptions
): MediaItem[] {
  const {
    activeRootPath,
    searchQuery,
    similarTargetItem,
    similarRadius = DEFAULT_SIMILARITY_RADIUS,
    filterType,
    filterReviewState,
    filterQuality,
    sortBy,
    decisions,
  } = opts

  const baseItems = similarTargetItem
    ? findSimilarPerceptual(similarTargetItem, items, similarRadius)
    : items

  const normRoot =
    activeRootPath && activeRootPath !== "all"
      ? activeRootPath.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
      : null
  const q = searchQuery.trim().length > 0 ? searchQuery.toLowerCase() : null

  const result = baseItems.filter((item) => {
    // 0. Active Root Path Filter
    if (normRoot) {
      const itemNorm = item.path.replace(/\\/g, "/").toLowerCase()
      if (itemNorm !== normRoot && !itemNorm.startsWith(normRoot + "/")) {
        return false
      }
    }

    // 1. Text Search Filter
    if (q) {
      if (!item.name.toLowerCase().includes(q) && !item.path.toLowerCase().includes(q)) {
        return false
      }
    }

    // 2. Type Filter (photo / video)
    if (filterType !== "all" && item.mediaType !== filterType) {
      return false
    }

    // 3. Review State Filter
    if (filterReviewState !== "all") {
      const state: string = decisions[item.id] || item.reviewState || "pending"
      if (filterReviewState === "pending" && state !== "pending" && state !== "skipped") {
        return false
      }
      if (filterReviewState === "kept" && state !== "keep") return false
      if (filterReviewState === "trash" && state !== "delete") return false
    }

    // 4. Quality Metrics Filter
    if (filterQuality !== "all") {
      if (filterQuality === "blurry" && item.quality?.isBlurry !== true) return false
      if (filterQuality === "dark" && item.quality?.isDark !== true) return false
      if (filterQuality === "screenshots" && item.quality?.isScreenshot !== true) return false
      if (filterQuality === "small" && item.quality?.isSmall !== true) return false
      if (filterQuality === "duplicates" && item.isDuplicate !== true) return false
    }

    return true
  })

  // When similarTargetItem is active, preserve similarity ranking (closest visual matches first) unless user explicitly chose a non-default sort
  if (similarTargetItem && sortBy === "date-desc") {
    return result
  }

  // 5. Fast Sorting logic (avoid expensive Intl.Collator / localeCompare)
  result.sort((a, b) => {
    if (sortBy === "date-desc") {
      const dA = a.dateTarget || a.dateAdded || ""
      const dB = b.dateTarget || b.dateAdded || ""
      if (dB !== dA) return dB < dA ? -1 : 1
      return a.name.localeCompare(b.name)
    }
    if (sortBy === "date-asc") {
      const dA = a.dateTarget || a.dateAdded || ""
      const dB = b.dateTarget || b.dateAdded || ""
      if (dA !== dB) return dA < dB ? -1 : 1
      return a.name.localeCompare(b.name)
    }
    if (sortBy === "score-desc") {
      const scoreA = a.quality ? a.quality.compositeScore : -1
      const scoreB = b.quality ? b.quality.compositeScore : -1
      if (scoreB !== scoreA) {
        return scoreB - scoreA
      }
      const blurA = a.quality?.blurScore ?? 0
      const blurB = b.quality?.blurScore ?? 0
      if (blurB !== blurA) {
        return blurB - blurA
      }
      const resA = (a.width ?? 0) * (a.height ?? 0)
      const resB = (b.width ?? 0) * (b.height ?? 0)
      if (resB !== resA) {
        return resB - resA
      }
      if (b.size !== a.size) {
        return b.size - a.size
      }
      const dA = a.dateTarget || a.dateAdded || ""
      const dB = b.dateTarget || b.dateAdded || ""
      if (dB !== dA) return dB < dA ? -1 : 1
      return a.name.localeCompare(b.name)
    }
    if (sortBy === "score-asc") {
      const scoreA = a.quality ? a.quality.compositeScore : 999
      const scoreB = b.quality ? b.quality.compositeScore : 999
      if (scoreA !== scoreB) {
        return scoreA - scoreB
      }
      const blurA = a.quality?.blurScore ?? 100
      const blurB = b.quality?.blurScore ?? 100
      if (blurA !== blurB) {
        return blurA - blurB
      }
      const resA = (a.width ?? 0) * (a.height ?? 0)
      const resB = (b.width ?? 0) * (b.height ?? 0)
      if (resA !== resB) {
        return resA - resB
      }
      if (a.size !== b.size) {
        return a.size - b.size
      }
      const dA = a.dateTarget || a.dateAdded || ""
      const dB = b.dateTarget || b.dateAdded || ""
      if (dA !== dB) return dA < dB ? -1 : 1
      return a.name.localeCompare(b.name)
    }
    if (sortBy === "size-desc") {
      if (b.size !== a.size) return b.size - a.size
      const dA = a.dateTarget || a.dateAdded || ""
      const dB = b.dateTarget || b.dateAdded || ""
      if (dB !== dA) return dB < dA ? -1 : 1
      return a.name.localeCompare(b.name)
    }
    if (sortBy === "size-asc") {
      if (a.size !== b.size) return a.size - b.size
      const dA = a.dateTarget || a.dateAdded || ""
      const dB = b.dateTarget || b.dateAdded || ""
      if (dA !== dB) return dA < dB ? -1 : 1
      return a.name.localeCompare(b.name)
    }
    return 0
  })

  return result
}

interface MediaState {
  items: MediaItem[]
  cachedMetrics: CachedDashboardMetrics
  cachedDuplicateGroups: MediaItem[][]
  cachedRootItemCounts: Map<string, number>
  selectedItemId: string | null
  isLoading: boolean
  searchQuery: string
  filterType: "all" | "photo" | "video"
  filterReviewState: "all" | "pending" | "kept" | "trash"
  filterQuality:
    | "all"
    | "blurry"
    | "dark"
    | "duplicates"
    | "screenshots"
    | "small"
  sortBy:
    | "date-desc"
    | "date-asc"
    | "score-desc"
    | "score-asc"
    | "size-desc"
    | "size-asc"
  activeRootPath: string | null
  similarTargetItem: MediaItem | null
  similarRadius: number

  fetchMediaItems: (folderPath: string) => Promise<void>
  setItems: (items: MediaItem[]) => void
  setSearchQuery: (query: string) => void
  setSimilarTargetItem: (item: MediaItem | null) => void
  setSimilarRadius: (radius: number) => void
  findSimilarVisual: (item: MediaItem, radius?: number) => void
  setFilterType: (type: "all" | "photo" | "video") => void
  setFilterReviewState: (state: "all" | "pending" | "kept" | "trash") => void
  setFilterQuality: (
    quality:
      | "all"
      | "blurry"
      | "dark"
      | "duplicates"
      | "screenshots"
      | "small"
  ) => void
  setSortBy: (
    sort:
      | "date-desc"
      | "date-asc"
      | "score-desc"
      | "score-asc"
      | "size-desc"
      | "size-asc"
  ) => void
  setSelectedItemId: (id: string | null) => void
  setActiveRootPath: (path: string | null) => void
  updateItemOrientation: (idOrPath: string, orientation: number) => void
  updateItemReviewStates: (
    updates:
      | Map<string, "keep" | "delete" | "skipped" | "pending">
      | Record<string, "keep" | "delete" | "skipped" | "pending">
  ) => void
  getFilteredItems: () => MediaItem[]
  getDashboardMetrics: () => CachedDashboardMetrics
}

const DEFAULT_METRICS: CachedDashboardMetrics = {
  totalFiles: 0,
  photoCount: 0,
  videoCount: 0,
  totalSize: 0,
  keptCount: 0,
  trashCount: 0,
  pendingCount: 0,
  reviewedCount: 0,
  reviewProgress: 0,
  blurryItems: [],
  darkItems: [],
  duplicateItems: [],
  screenshotItems: [],
  smallItems: [],
  duplicateGroupsCount: 0,
  duplicateSavedBytes: 0,
  blurrySavedBytes: 0,
}

function computeMetricsForItems(items: MediaItem[]): CachedDashboardMetrics {
  let photoCount = 0
  let videoCount = 0
  let totalSize = 0
  let keptCount = 0
  let trashCount = 0
  let pendingCount = 0
  const blurryItems: MediaItem[] = []
  const darkItems: MediaItem[] = []
  const duplicateItems: MediaItem[] = []
  const screenshotItems: MediaItem[] = []
  const smallItems: MediaItem[] = []
  const groupsSet = new Set<string>()

  const scanState = useScanStore.getState()
  const isBusyScanning = scanState.isScanning || scanState.isPostProcessing

  const sessionDecisions = useSessionStore.getState().decisions
  for (const item of items) {
    if (item.mediaType === "photo") photoCount++
    else if (item.mediaType === "video") videoCount++
    totalSize += item.size || 0

    const activeState = sessionDecisions[item.id] || item.reviewState
    if (activeState === "keep") keptCount++
    else if (activeState === "delete") trashCount++
    else pendingCount++

    if (item.quality?.isBlurry) blurryItems.push(item)
    if (item.quality?.isDark) darkItems.push(item)
    if (!isBusyScanning && item.isDuplicate) {
      if (!item.isBestInDuplicateGroup) duplicateItems.push(item)
      if (item.duplicateGroupId) {
        groupsSet.add(item.duplicateGroupId)
      }
    }
    if (item.quality?.isScreenshot) screenshotItems.push(item)
    if (item.quality?.isSmall) smallItems.push(item)
  }

  const totalFiles = items.length
  const reviewedCount = keptCount + trashCount
  const reviewProgress = totalFiles > 0 ? Math.round((reviewedCount / totalFiles) * 100) : 0

  // Pause duplicate and wasted space byte calculations while scanning is active
  const duplicateSavedBytes = isBusyScanning
    ? 0
    : duplicateItems.reduce((sum, i) => sum + (i.size || 0), 0)
  const blurrySavedBytes = isBusyScanning
    ? 0
    : blurryItems.reduce((sum, i) => sum + (i.size || 0), 0)

  return {
    totalFiles,
    photoCount,
    videoCount,
    totalSize,
    keptCount,
    trashCount,
    pendingCount,
    reviewedCount,
    reviewProgress,
    blurryItems,
    darkItems,
    duplicateItems,
    screenshotItems,
    smallItems,
    duplicateGroupsCount: isBusyScanning ? 0 : groupsSet.size,
    duplicateSavedBytes,
    blurrySavedBytes,
  }
}

function computeCaches(
  items: MediaItem[],
  activeRootPath: string | null = null
) {
  let targetItems = items
  if (activeRootPath && activeRootPath !== "all") {
    const normRoot = activeRootPath.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
    targetItems = items.filter((item) => {
      const itemNorm = item.path.replace(/\\/g, "/").toLowerCase()
      return itemNorm === normRoot || itemNorm.startsWith(normRoot + "/")
    })
  }

  const cachedMetrics = computeMetricsForItems(targetItems)

  const dupGroupsMap: Record<string, MediaItem[]> = {}
  const { settings } = useSettingsStore.getState()
  const roots = settings.folders.roots
    .filter((r) => r.scanned)
    .map((r) => ({ rawPath: r.path, norm: r.path.replace(/\\/g, "/").toLowerCase() }))
  const rootItemCounts = new Map<string, number>()

  const scanState = useScanStore.getState()
  const isBusyScanning = scanState.isScanning || scanState.isPostProcessing

  for (let i = 0; i < targetItems.length; i++) {
    const item = targetItems[i]
    if (!isBusyScanning && item.isDuplicate && item.duplicateGroupId) {
      if (!dupGroupsMap[item.duplicateGroupId]) {
        dupGroupsMap[item.duplicateGroupId] = []
      }
      dupGroupsMap[item.duplicateGroupId].push(item)
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const normPath = item.path.replace(/\\/g, "/").toLowerCase()
    for (let rIdx = 0; rIdx < roots.length; rIdx++) {
      const rootNorm = roots[rIdx].norm.replace(/\/+$/, "")
      if (normPath === rootNorm || normPath.startsWith(rootNorm + "/")) {
        rootItemCounts.set(roots[rIdx].rawPath, (rootItemCounts.get(roots[rIdx].rawPath) || 0) + 1)
      }
    }
  }

  const cachedDuplicateGroups = isBusyScanning
    ? []
    : Object.keys(dupGroupsMap)
        .sort((a, b) => {
          const countDiff = dupGroupsMap[b].length - dupGroupsMap[a].length
          if (countDiff !== 0) return countDiff
          const sizeB = dupGroupsMap[b].reduce((acc, item) => acc + item.size, 0)
          const sizeA = dupGroupsMap[a].reduce((acc, item) => acc + item.size, 0)
          if (sizeB !== sizeA) return sizeB - sizeA
          return a.localeCompare(b)
        })
        .map((k) => dupGroupsMap[k])
        .filter((g) => g.length > 1)

  return { cachedMetrics, cachedDuplicateGroups, cachedRootItemCounts: rootItemCounts }
}

export const useMediaStore = create<MediaState>((set, get) => ({
  items: [],
  cachedMetrics: DEFAULT_METRICS,
  cachedDuplicateGroups: [],
  cachedRootItemCounts: new Map(),
  selectedItemId: null,
  isLoading: false,
  searchQuery: "",
  filterType: "all",
  filterReviewState: "all",
  filterQuality: "all",
  sortBy: "date-desc",
  activeRootPath: null,
  similarTargetItem: null,
  similarRadius: DEFAULT_SIMILARITY_RADIUS,

  setItems: (items) => {
    const { activeRootPath } = get()
    const { cachedMetrics, cachedDuplicateGroups, cachedRootItemCounts } =
      computeCaches(items, activeRootPath)
    set({ items, cachedMetrics, cachedDuplicateGroups, cachedRootItemCounts })
  },

  updateItemOrientation: (idOrPath: string, orientation: number) => {
    const { items, activeRootPath } = get()
    const updatedItems = items.map((item) =>
      item.id === idOrPath || item.path === idOrPath
        ? { ...item, orientation }
        : item
    )
    const { cachedMetrics, cachedDuplicateGroups, cachedRootItemCounts } =
      computeCaches(updatedItems, activeRootPath)
    set({ items: updatedItems, cachedMetrics, cachedDuplicateGroups, cachedRootItemCounts })
    void window.api.updateMediaOrientation(idOrPath, orientation)
  },

  updateItemReviewStates: (updates) => {
    const { items, activeRootPath } = get()
    const isMap = updates instanceof Map
    let hasChange = false

    const updatedItems = items.map((item) => {
      const newState = isMap
        ? (updates as Map<string, "keep" | "delete" | "skipped" | "pending">).get(item.id)
        : (updates as Record<string, "keep" | "delete" | "skipped" | "pending">)[item.id]

      if (newState !== undefined && item.reviewState !== newState) {
        hasChange = true
        return { ...item, reviewState: newState }
      }
      return item
    })

    if (!hasChange) return

    let targetItems = updatedItems
    if (activeRootPath && activeRootPath !== "all") {
      const normRoot = activeRootPath.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
      targetItems = updatedItems.filter((item) => {
        const itemNorm = item.path.replace(/\\/g, "/").toLowerCase()
        return itemNorm === normRoot || itemNorm.startsWith(normRoot + "/")
      })
    }
    const cachedMetrics = computeMetricsForItems(targetItems)

    set({ items: updatedItems, cachedMetrics })
  },

  fetchMediaItems: async (folderPath: string) => {
    set({ isLoading: true, activeRootPath: folderPath })
    try {
      // Always fetch all items to keep full store items map intact for all roots
      const items = await window.api.getMediaItems("all")

      // Filter out items belonging to disabled root folders
      const { settings } = useSettingsStore.getState()
      const disabledPrefixes = settings.folders.roots
        .filter((r) => !r.enabled)
        .map((r) => r.path.replace(/\\/g, "/").toLowerCase())

      const visibleItems =
        disabledPrefixes.length === 0
          ? items
          : items.filter((item) => {
              const normalizedPath = item.path.replace(/\\/g, "/").toLowerCase()
              return !disabledPrefixes.some((prefix) =>
                normalizedPath.startsWith(prefix)
              )
            })

      const { cachedMetrics, cachedDuplicateGroups, cachedRootItemCounts } =
        computeCaches(visibleItems, folderPath)
      set({
        items: visibleItems,
        cachedMetrics,
        cachedDuplicateGroups,
        cachedRootItemCounts,
        isLoading: false,
      })

      // Automatically sync session checkpoint on fetch
      if (visibleItems.length > 0) {
        useSessionStore
          .getState()
          .initSession(folderPath, visibleItems.length)
          .catch(() => {})
      }
    } catch {
      set({
        items: [],
        cachedMetrics: DEFAULT_METRICS,
        cachedDuplicateGroups: [],
        cachedRootItemCounts: new Map(),
        isLoading: false,
      })
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSimilarTargetItem: (similarTargetItem) => set({ similarTargetItem }),
  setSimilarRadius: (similarRadius) => set({ similarRadius }),
  findSimilarVisual: (item, radius) => {
    const configuredRadius =
      useSettingsStore.getState().settings?.quality?.similarityRadius ||
      DEFAULT_SIMILARITY_RADIUS
    set({
      similarTargetItem: item,
      similarRadius: radius ?? configuredRadius,
      searchQuery: "",
    })
    useUIStore.getState().setCurrentView("browse")
  },
  setFilterType: (filterType) => set({ filterType }),
  setFilterReviewState: (filterReviewState) => set({ filterReviewState }),
  setFilterQuality: (filterQuality) => set({ filterQuality }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),
  setActiveRootPath: (activeRootPath) => {
    const { items } = get()
    const { cachedMetrics, cachedDuplicateGroups, cachedRootItemCounts } =
      computeCaches(items, activeRootPath)
    set({
      activeRootPath,
      cachedMetrics,
      cachedDuplicateGroups,
      cachedRootItemCounts,
    })
  },

  getDashboardMetrics: () => {
    const { items, activeRootPath } = get()
    const targetItems =
      !activeRootPath || activeRootPath === "all"
        ? items
        : items.filter((item) => {
            const normRoot = activeRootPath
              .replace(/\\/g, "/")
              .toLowerCase()
              .replace(/\/+$/, "")
            const itemNorm = item.path.replace(/\\/g, "/").toLowerCase()
            return itemNorm === normRoot || itemNorm.startsWith(normRoot + "/")
          })

    return computeMetricsForItems(targetItems)
  },

  getFilteredItems: () => {
    const {
      items,
      activeRootPath,
      searchQuery,
      similarTargetItem,
      similarRadius,
      filterType,
      filterReviewState,
      filterQuality,
      sortBy,
    } = get()
    return filterAndSortItems(items, {
      activeRootPath,
      searchQuery,
      similarTargetItem,
      similarRadius,
      filterType,
      filterReviewState,
      filterQuality,
      sortBy,
      decisions: useSessionStore.getState().decisions,
    })
  },
}))

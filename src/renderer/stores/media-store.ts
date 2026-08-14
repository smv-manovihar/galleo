import { create } from "zustand"
import type { MediaItem } from "../../shared/types/media"
import { useSettingsStore } from "./settings-store"
import { useSessionStore } from "./session-store"
import { useScanStore } from "./scan-store"

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
    filterType,
    filterReviewState,
    filterQuality,
    sortBy,
    decisions,
  } = opts
  const normRoot =
    activeRootPath && activeRootPath !== "all"
      ? activeRootPath.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
      : null
  const q = searchQuery.trim().length > 0 ? searchQuery.toLowerCase() : null

  const result = items.filter((item) => {
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

  // 5. Fast Sorting logic (avoid expensive Intl.Collator / localeCompare)
  result.sort((a, b) => {
    if (sortBy === "date-desc") {
      const dA = a.dateTarget || ""
      const dB = b.dateTarget || ""
      return dB < dA ? -1 : dB > dA ? 1 : 0
    }
    if (sortBy === "date-asc") {
      const dA = a.dateTarget || ""
      const dB = b.dateTarget || ""
      return dA < dB ? -1 : dA > dB ? 1 : 0
    }
    if (sortBy === "score-desc") {
      const scoreA = a.quality?.compositeScore ?? 0
      const scoreB = b.quality?.compositeScore ?? 0
      return scoreB - scoreA
    }
    if (sortBy === "score-asc") {
      const scoreA = a.quality?.compositeScore ?? 0
      const scoreB = b.quality?.compositeScore ?? 0
      return scoreA - scoreB
    }
    if (sortBy === "size-desc") {
      return b.size - a.size
    }
    if (sortBy === "size-asc") {
      return a.size - b.size
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

  fetchMediaItems: (folderPath: string) => Promise<void>
  setItems: (items: MediaItem[]) => void
  setSearchQuery: (query: string) => void
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

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!isBusyScanning && item.isDuplicate && item.duplicateGroupId) {
      if (!dupGroupsMap[item.duplicateGroupId]) {
        dupGroupsMap[item.duplicateGroupId] = []
      }
      dupGroupsMap[item.duplicateGroupId].push(item)
    }

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
        .sort()
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
      filterType,
      filterReviewState,
      filterQuality,
      sortBy,
    } = get()
    return filterAndSortItems(items, {
      activeRootPath,
      searchQuery,
      filterType,
      filterReviewState,
      filterQuality,
      sortBy,
      decisions: useSessionStore.getState().decisions,
    })
  },
}))

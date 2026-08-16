import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  useRef,
} from "react"
import { toast } from "sonner"
import { useMediaStore, filterAndSortItems } from "../stores/media-store"
import { useSessionStore } from "../stores/session-store"
import { useScanStore } from "../stores/scan-store"
import { MediaGrid } from "../components/media/MediaGrid"
import { MediaTimeline } from "../components/media/MediaTimeline"
import { MediaList } from "../components/media/MediaList"
import { MediaPreview } from "../components/media/MediaPreview"
import { MediaInfoDialog } from "../components/media/MediaInfoDialog"
import {
  MediaContextMenu,
  type MediaContextMenuState,
} from "../components/media/MediaContextMenu"
import {
  BrowseToolbar,
  type LayoutMode,
  type GroupMode,
} from "../components/browse/BrowseToolbar"
import { BrowseCommitBanner } from "../components/browse/BrowseCommitBanner"
import { BrowseBatchBar } from "../components/browse/BrowseBatchBar"
import { CommitConfirmDialog } from "../components/browse/CommitConfirmDialog"
import type { MediaItem } from "../../shared/types/media"
import type { SearchResultItem } from "../../main/services/search-engine.service"
import { PageContainer } from "@/components/ui/page-layout"
import { storage } from "../lib/storage"
import { ENABLE_AI_FEATURES } from "../../shared/constants"

export const BrowseMediaPage: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const isLoading = useMediaStore((s) => s.isLoading)
  const isScanning = useScanStore((s) => s.isScanning)
  const filterType = useMediaStore((s) => s.filterType)
  const setFilterType = useMediaStore((s) => s.setFilterType)
  const filterReviewState = useMediaStore((s) => s.filterReviewState)
  const setFilterReviewState = useMediaStore((s) => s.setFilterReviewState)
  const filterQuality = useMediaStore((s) => s.filterQuality)
  const setFilterQuality = useMediaStore((s) => s.setFilterQuality)
  const sortBy = useMediaStore((s) => s.sortBy)
  const setSortBy = useMediaStore((s) => s.setSortBy)
  const searchQuery = useMediaStore((s) => s.searchQuery)
  const similarTargetItem = useMediaStore((s) => s.similarTargetItem)
  const keptCount = useMediaStore((s) => s.cachedMetrics.keptCount)
  const trashCount = useMediaStore((s) => s.cachedMetrics.trashCount)

  const decisions = useSessionStore((s) => s.decisions)
  const isCommitting = useSessionStore((s) => s.isCommitting)

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(
    () => (storage.get("browse_layout") as LayoutMode) || "card"
  )
  const [groupMode, setGroupMode] = useState<GroupMode>(
    () => (storage.get("browse_group") as GroupMode) || "normal"
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [previewAutoPlay, setPreviewAutoPlay] = useState(false)
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null)
  const [showCommitConfirm, setShowCommitConfirm] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(
    null
  )
  const [activeContextMenu, setActiveContextMenu] =
    useState<MediaContextMenuState | null>(null)
  const toolbarContainerRef = useRef<HTMLDivElement>(null)
  const [topOffset, setTopOffset] = useState(64)

  useEffect(() => {
    const el = toolbarContainerRef.current
    if (!el) return

    const updateHeight = () => {
      const rect = el.getBoundingClientRect()
      // Top position of toolbar is top-3 (12px). Add 10px spacing below toolbar.
      const calculatedOffset = Math.ceil(rect.height + 22)
      setTopOffset(calculatedOffset)
    }

    updateHeight()

    const observer = new ResizeObserver(() => {
      updateHeight()
    })
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  // Compute deletion count and byte size lazily only when relevant
  const deleteDetails = useMemo(() => {
    if (filterReviewState !== "trash" && !showCommitConfirm) {
      return { count: 0, size: 0 }
    }
    let count = 0
    let size = 0
    for (const item of items) {
      const state = decisions[item.id] || item.reviewState
      if (state === "delete") {
        count++
        size += item.size || 0
      }
    }
    return { count, size }
  }, [filterReviewState, showCommitConfirm, items, decisions])

  // Initialize review session when activeRootPath changes or is loaded
  useEffect(() => {
    if (isScanning) return
    if (activeRootPath && items.length > 0) {
      void useSessionStore.getState().initSession(activeRootPath, items.length)
    }
  }, [activeRootPath, items.length, isScanning])

  useEffect(() => {
    storage.set("browse_layout", layoutMode)
  }, [layoutMode])
  useEffect(() => {
    storage.set("browse_group", groupMode)
  }, [groupMode])

  // Hybrid Semantic Search Effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      return
    }

    let isMounted = true

    const timer = setTimeout(async () => {
      try {
        if (typeof window !== "undefined" && window.api?.search) {
          const results = await window.api.search.query({
            query: searchQuery,
            mediaType: filterType,
            folderPath:
              activeRootPath && activeRootPath !== "all"
                ? activeRootPath
                : undefined,
          })
          if (isMounted) {
            setSearchResults(results)
          }
        }
      } catch {
        if (isMounted) setSearchResults(null)
      }
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [searchQuery, filterType, activeRootPath])

  const handleFindSimilar = useCallback(async (mediaId: string) => {
    if (!ENABLE_AI_FEATURES) return
    try {
      if (typeof window !== "undefined" && window.api?.search) {
        const results = await window.api.search.findSimilar(mediaId, 24)
        setSearchResults(results)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleFindSimilarVisual = useCallback((item: MediaItem) => {
    useMediaStore.getState().findSimilarVisual(item)
  }, [])

  const searchResultsMap = useMemo(() => {
    if (!searchResults) return undefined
    const map = new Map<string, SearchResultItem>()
    for (const res of searchResults) {
      map.set(res.mediaId, res)
    }
    return map
  }, [searchResults])

  const activeSearchResults = searchQuery.trim() ? searchResults : null

  const activeSearchIdSet = useMemo(() => {
    if (!activeSearchResults) return null
    return new Set(activeSearchResults.map((r) => r.mediaId))
  }, [activeSearchResults])

  // Single-pass filter + sort re-run only when the inputs that drive it change
  const rawFilteredItems = useMemo(
    () =>
      filterAndSortItems(items, {
        activeRootPath,
        searchQuery,
        similarTargetItem,
        filterType,
        filterReviewState,
        filterQuality,
        sortBy,
        decisions,
      }),
    [
      items,
      activeRootPath,
      searchQuery,
      similarTargetItem,
      filterType,
      filterReviewState,
      filterQuality,
      sortBy,
      decisions,
    ]
  )

  const filteredItems = useMemo(() => {
    if (activeSearchIdSet) {
      return rawFilteredItems.filter((item) => activeSearchIdSet.has(item.id))
    }
    return rawFilteredItems
  }, [rawFilteredItems, activeSearchIdSet])

  const deferredFilteredItems = useDeferredValue(filteredItems)
  const isPending = isLoading || deferredFilteredItems !== filteredItems

  const handleSelectToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleReviewAction = useCallback(
    async (
      mediaId: string,
      state: "keep" | "delete" | "skipped",
      batchId?: string
    ) => {
      const currentItems = useMediaStore.getState().items
      const item = currentItems.find((i) => i.id === mediaId)
      if (item) {
        await useSessionStore
          .getState()
          .submitDecision(mediaId, state, item, "browse", batchId)
      }
    },
    []
  )

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredItems.length) {
        return new Set()
      }
      return new Set(filteredItems.map((i) => i.id))
    })
  }, [filteredItems])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBatchReviewAction = useCallback(
    async (state: "keep" | "delete") => {
      const batchId = `batch_browse_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      const updates = [...selectedIds].map((id) => ({
        mediaId: id,
        state,
      }))
      await useSessionStore
        .getState()
        .submitBatchDecisions(updates, "browse", batchId)
      setSelectedIds(new Set())
    },
    [selectedIds]
  )

  const handleUndo = useCallback(async () => {
    const store = useSessionStore.getState()
    const browseActions = store.undoStack.filter(
      (a) => a.newState.source === "browse"
    )
    if (browseActions.length === 0) return

    const lastAction = browseActions[browseActions.length - 1]
    const success = await store.undo("browse")
    if (success) {
      const item = useMediaStore
        .getState()
        .items.find((i) => i.id === lastAction.mediaId)
      toast.success("Reverted decision", {
        description: item
          ? `Reverted review state for ${item.name}`
          : undefined,
      })
    }
  }, [])

  const isModalOpenRef = useRef(false)
  useEffect(() => {
    isModalOpenRef.current =
      previewItem !== null || infoItem !== null || showCommitConfirm
  }, [previewItem, infoItem, showCommitConfirm])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true" ||
        isModalOpenRef.current
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        void handleUndo()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleUndo])

  const handleSetPreviewItem = useCallback(
    (item: MediaItem) => setPreviewItem(item),
    []
  )
  const handlePlayOpen = useCallback((item: MediaItem) => {
    setPreviewItem(item)
    setPreviewAutoPlay(true)
  }, [])
  const handleClosePreview = useCallback(() => {
    setPreviewItem(null)
    setPreviewAutoPlay(false)
  }, [])

  const handleSetInfoItem = useCallback(
    (item: MediaItem) => setInfoItem(item),
    []
  )
  const handleCloseInfo = useCallback(() => {
    setInfoItem(null)
  }, [])

  const handleContextMenu = useCallback(
    (item: MediaItem, e: React.MouseEvent) => {
      setActiveContextMenu({
        item,
        x: e.clientX,
        y: e.clientY,
      })
    },
    []
  )
  const handleCloseContextMenu = useCallback(() => {
    setActiveContextMenu(null)
  }, [])

  const handleOpenCommitConfirm = useCallback(() => {
    setShowCommitConfirm(true)
  }, [])
  const handleCloseCommitConfirm = useCallback(() => {
    setShowCommitConfirm(false)
  }, [])
  const handleConfirmCommit = useCallback(() => {
    const currentDecisions = useSessionStore.getState().decisions
    const deleteIds = Object.entries(currentDecisions)
      .filter(([, state]) => state === "delete")
      .map(([entryMediaId]) => entryMediaId)
    if (deleteIds.length > 0) {
      void useSessionStore
        .getState()
        .startTrashingInBackground(deleteIds, "Trashing files...")
    }
    setShowCommitConfirm(false)
  }, [])

  const onFindSimilarProp = ENABLE_AI_FEATURES ? handleFindSimilar : undefined

  if (!activeRootPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 font-sans text-xs text-muted-foreground select-none">
        <span>
          Please select a folder from the sidebar directory listing to begin.
        </span>
      </div>
    )
  }

  return (
    <PageContainer
      className="relative h-full w-full max-w-none flex-1 gap-0 p-0 px-0 py-0 md:p-0 md:px-0 md:py-0 md:gap-0 overflow-hidden select-none"
      maxWidth="full"
    >
      {/* Floating Browse Toolbar Overlay & Optional Commit Banner */}
      <div
        ref={toolbarContainerRef}
        className="pointer-events-none absolute top-3 inset-x-0 z-30 flex flex-col items-center gap-2 px-4"
      >
        <div className="pointer-events-auto max-w-full">
          <BrowseToolbar
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            filterReviewState={filterReviewState}
            onFilterReviewStateChange={setFilterReviewState}
            filterQuality={filterQuality}
            onFilterQualityChange={setFilterQuality}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            groupMode={groupMode}
            onGroupModeChange={setGroupMode}
            keptCount={keptCount}
            trashCount={trashCount}
          />
        </div>

        {/* Commit Banner inside To Delete view */}
        {filterReviewState === "trash" && deleteDetails.count > 0 && (
          <div className="pointer-events-auto max-w-2xl w-full">
            <BrowseCommitBanner
              count={deleteDetails.count}
              size={deleteDetails.size}
              isCommitting={isCommitting}
              onCommitClick={handleOpenCommitConfirm}
            />
          </div>
        )}
      </div>

      {/* Batch Operations Floating Bar (only shown if cards selected) */}
      {selectedIds.size > 0 && (
        <div className="pointer-events-none absolute bottom-4 inset-x-0 z-30 flex justify-center px-4">
          <div className="pointer-events-auto max-w-2xl w-full">
            <BrowseBatchBar
              selectedCount={selectedIds.size}
              totalFilteredCount={filteredItems.length}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onBatchReviewAction={handleBatchReviewAction}
            />
          </div>
        </div>
      )}

      {/* Main browser viewport panels */}
      <div className="relative h-full w-full min-h-0 flex-1">
        {isPending && (
          <div className="pointer-events-none absolute inset-0 z-20 bg-background/30 backdrop-blur-xs transition-opacity duration-150" />
        )}
        {layoutMode === "card" && groupMode === "normal" && (
          <div className="h-full w-full px-3">
            <MediaGrid
              items={deferredFilteredItems}
              selectedIds={selectedIds}
              onSelectToggle={handleSelectToggle}
              onPreviewOpen={handleSetPreviewItem}
              onInfoOpen={handleSetInfoItem}
              onReviewAction={handleReviewAction}
              columns={4}
              searchResultsMap={searchResultsMap}
              onFindSimilar={onFindSimilarProp}
              onPlayOpen={handlePlayOpen}
              onContextMenu={handleContextMenu}
              topOffset={topOffset}
            />
          </div>
        )}
        {layoutMode === "card" && groupMode === "date" && (
          <div className="h-full w-full px-3">
            <MediaTimeline
              items={deferredFilteredItems}
              selectedIds={selectedIds}
              onSelectToggle={handleSelectToggle}
              onPreviewOpen={handleSetPreviewItem}
              onInfoOpen={handleSetInfoItem}
              onReviewAction={handleReviewAction}
              onPlayOpen={handlePlayOpen}
              onContextMenu={handleContextMenu}
              topOffset={topOffset}
            />
          </div>
        )}
        {layoutMode === "list" && (
          <div
            className="h-full w-full px-4 pb-3"
            style={{ paddingTop: `${topOffset}px` }}
          >
            <MediaList
              items={deferredFilteredItems}
              selectedIds={selectedIds}
              onSelectToggle={handleSelectToggle}
              onPreviewOpen={handleSetPreviewItem}
              onReviewAction={handleReviewAction}
              onPlayOpen={handlePlayOpen}
              onContextMenu={handleContextMenu}
              isGrouped={groupMode === "date"}
            />
          </div>
        )}
      </div>

      {/* Singleton Context Menu */}
      <MediaContextMenu
        contextMenu={activeContextMenu}
        onClose={handleCloseContextMenu}
        onPreviewOpen={handleSetPreviewItem}
        onInfoOpen={handleSetInfoItem}
        onReviewAction={handleReviewAction}
        onFindSimilar={onFindSimilarProp}
        onFindSimilarVisual={handleFindSimilarVisual}
      />

      {/* Slide-over Preview dialog modal */}
      <MediaPreview
        item={previewItem}
        onClose={handleClosePreview}
        items={deferredFilteredItems}
        autoPlay={previewAutoPlay}
      />
      <MediaInfoDialog item={infoItem} onClose={handleCloseInfo} />

      {/* Midway Commit Confirmation Dialog */}
      <CommitConfirmDialog
        isOpen={showCommitConfirm}
        count={deleteDetails.count}
        size={deleteDetails.size}
        isCommitting={isCommitting}
        onClose={handleCloseCommitConfirm}
        onConfirm={handleConfirmCommit}
      />
    </PageContainer>
  )
}

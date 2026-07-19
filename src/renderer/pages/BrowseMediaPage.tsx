import React, { useState, useEffect } from "react"
import { useMediaStore } from "../stores/media-store"
import { useSessionStore } from "../stores/session-store"
import { useScanStore } from "../stores/scan-store"
import { useSettingsStore } from "../stores/settings-store"
import { FolderNotScanned } from "../components/media/FolderNotScanned"
import { MediaGrid } from "../components/media/MediaGrid"
import { MediaTimeline } from "../components/media/MediaTimeline"
import { MediaList } from "../components/media/MediaList"
import { MediaPreview } from "../components/media/MediaPreview"
import { MediaInfoDialog } from "../components/media/MediaInfoDialog"
import type { MediaItem } from "../../shared/types/media"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/ui/page-layout"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Grid,
  List,
  CheckCircle2,
  Trash2,
  InboxIcon,
  Clock,
  Bookmark,
  AlertCircle,
  ListX,
  Summary,
  CalendarClock,
} from "lucide-react"
import { formatBytes } from "../lib/format"
import { storage } from "../lib/storage"

export const BrowseMediaPage: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
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
  const getFilteredItems = useMediaStore((s) => s.getFilteredItems)

  const { settings } = useSettingsStore()

  const isScanned = React.useMemo(() => {
    if (!activeRootPath) return false
    if (activeRootPath === "all") {
      return settings.folders.roots.some((r) => r.scanned)
    }
    return !!settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned
  }, [activeRootPath, settings.folders.roots])

  const {
    initSession,
    submitDecision,
    commitDeletions,
    decisions,
    isCommitting,
  } = useSessionStore()

  const [layoutMode, setLayoutMode] = useState<"card" | "list">(
    () => (storage.get("browse_layout") as "card" | "list") || "card"
  )
  const [groupMode, setGroupMode] = useState<"normal" | "date">(
    () => (storage.get("browse_group") as "normal" | "date") || "normal"
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null)
  const [showCommitConfirm, setShowCommitConfirm] = useState(false)

  const deleteDetails = React.useMemo(() => {
    let count = 0
    let size = 0
    const itemMap = new Map(items.map((i) => [i.id, i]))
    for (const [mediaId, state] of Object.entries(decisions)) {
      if (state === "delete") {
        count++
        const item = itemMap.get(mediaId)
        if (item) {
          size += item.size
        }
      }
    }
    return { count, size }
  }, [decisions, items])

  // Initialize review session when activeRootPath changes or is loaded
  useEffect(() => {
    if (isScanning) return
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length)
    }
  }, [activeRootPath, items.length, isScanning, initSession])

  useEffect(() => {
    storage.set("browse_layout", layoutMode)
  }, [layoutMode])
  useEffect(() => {
    storage.set("browse_group", groupMode)
  }, [groupMode])

  const filteredItems = React.useMemo(() => {
    return getFilteredItems()
  }, [items, searchQuery, filterType, filterReviewState, filterQuality, sortBy])

  const handleSelectToggle = React.useCallback(
    (id: string, _e: React.MouseEvent) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    []
  )

  const handleReviewAction = React.useCallback(
    async (
      mediaId: string,
      state: "keep" | "delete" | "skipped",
      batchId?: string
    ) => {
      const currentItems = useMediaStore.getState().items
      const item = currentItems.find((i) => i.id === mediaId)
      if (item) {
        await submitDecision(mediaId, state, item, "browse", batchId)
        // Refresh items list local states
        item.reviewState = state
      }
    },
    [submitDecision]
  )

  const handleSelectAll = React.useCallback(() => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)))
    }
  }, [selectedIds.size, filteredItems])

  const handleBatchReviewAction = React.useCallback(
    async (state: "keep" | "delete" | "skipped") => {
      const batchId = `batch_browse_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      for (const id of selectedIds) {
        await handleReviewAction(id, state, batchId)
      }
      setSelectedIds(new Set())
    },
    [selectedIds, handleReviewAction]
  )

  const handleSetPreviewItem = React.useCallback(
    (item: MediaItem) => setPreviewItem(item),
    []
  )
  const handleSetInfoItem = React.useCallback(
    (item: MediaItem) => setInfoItem(item),
    []
  )

  if (!activeRootPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 font-sans text-xs text-muted-foreground select-none">
        <span>
          Please select a folder from the sidebar directory listing to begin.
        </span>
      </div>
    )
  }

  if (!isScanned) {
    return (
      <PageContainer className="h-full select-none" maxWidth="xl">
        <FolderNotScanned
          activeRootPath={activeRootPath}
          featureDescription="and access the catalog"
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="h-full select-none" maxWidth="full">
      {/* Filters & Toolbar Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-card/45 p-2.5 backdrop-blur-md">
        {/* Group 1: Tabs (Type & Review State) - stays in one line */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Tabs
            value={filterType}
            onValueChange={(val: string) => setFilterType(val as any)}
          >
            <TabsList className="h-8 rounded-lg border border-border bg-background p-0.5">
              <TabsTrigger
                value="all"
                className="h-7 rounded-md px-3 text-xs font-medium"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="photo"
                className="h-7 rounded-md px-3 text-xs font-medium"
              >
                Photos
              </TabsTrigger>
              <TabsTrigger
                value="video"
                className="h-7 rounded-md px-3 text-xs font-medium"
              >
                Videos
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Review State Tabs (All, Pending, Kept, To Delete) */}
          <Tabs
            value={filterReviewState}
            onValueChange={(val: string) => setFilterReviewState(val as any)}
          >
            <TabsList className="h-8 rounded-lg border border-border bg-background p-0.5">
              <TabsTrigger
                value="all"
                className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
                title="All Items"
              >
                <InboxIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">All</span>
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
                title="Pending Review"
              >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Pending</span>
              </TabsTrigger>
              <TabsTrigger
                value="kept"
                className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
                title="Marked to Keep"
              >
                <Bookmark className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Kept</span>
                {items.filter((i) => i.reviewState === "keep").length > 0 && (
                  <Badge
                    variant="outline"
                    className="flex h-4 min-w-4 items-center justify-center border-green-500/20 bg-green-500/10 px-1 text-xs text-green-600 dark:text-green-400"
                  >
                    {items.filter((i) => i.reviewState === "keep").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="trash"
                className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
                title="Marked to Delete"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">To Delete</span>
                {items.filter((i) => i.reviewState === "delete").length > 0 && (
                  <Badge
                    variant="outline"
                    className="flex h-4 min-w-4 items-center justify-center border-destructive/20 bg-destructive/10 px-1 text-xs text-destructive"
                  >
                    {items.filter((i) => i.reviewState === "delete").length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Group 2: Selects & Views (Quality, Sort, Layout & Grouping toggles) - stays in one line */}
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Quality & Feature Filters Dropdown Select */}
          <Select
            value={filterQuality}
            onValueChange={(val: any) => setFilterQuality(val)}
          >
            <SelectTrigger className="h-8 w-auto min-w-32 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent">
              <SelectValue placeholder="Quality Features" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quality Features</SelectItem>
              <SelectItem value="duplicates">Duplicates</SelectItem>
              <SelectItem value="blurry">Blurry Photos</SelectItem>
              <SelectItem value="screenshots">Screenshots</SelectItem>
              <SelectItem value="dark">Dark Photos</SelectItem>
              <SelectItem value="small">Low Resolution</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="h-8 w-auto max-w-40 min-w-28 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="score-desc">Highest Quality</SelectItem>
              <SelectItem value="score-asc">Lowest Quality</SelectItem>
              <SelectItem value="size-desc">Largest Size</SelectItem>
              <SelectItem value="size-asc">Smallest Size</SelectItem>
            </SelectContent>
          </Select>

          {/* Layout Mode Toggle: Card vs List */}
          <Tabs
            value={layoutMode}
            onValueChange={(val: string) => setLayoutMode(val as any)}
          >
            <TabsList className="h-8 rounded-lg border border-border bg-background p-0.5">
              <TabsTrigger
                value="card"
                className="flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                title="Card Layout"
              >
                <Grid className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                title="List Layout"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">List</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Grouping Mode Toggle: Normal vs Date */}
          <Tabs
            value={groupMode}
            onValueChange={(val: string) => setGroupMode(val as any)}
          >
            <TabsList className="h-8 rounded-lg border border-border bg-background p-0.5">
              <TabsTrigger
                value="normal"
                className="flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                title="Normal Sorted View"
              >
                <Summary className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Normal</span>
              </TabsTrigger>
              <TabsTrigger
                value="date"
                className="flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                title="Date Grouped View"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Date</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Commit Banner inside To Delete view */}
      {filterReviewState === "trash" && deleteDetails.count > 0 && (
        <div className="flex shrink-0 animate-in items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 font-sans text-xs duration-200 fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-medium text-destructive dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>
              You have <strong>{deleteDetails.count}</strong> files (
              {formatBytes(deleteDetails.size)}) marked for deletion.
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 cursor-pointer gap-1.5 px-4 font-semibold"
            onClick={() => setShowCommitConfirm(true)}
            disabled={isCommitting}
          >
            <ListX className="h-3.5 w-3.5" />
            Commit Deletions
          </Button>
        </div>
      )}

      {/* Batch Operations Floating Bar (only shown if cards selected) */}
      {selectedIds.size > 0 && (
        <div className="flex shrink-0 flex-col justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 font-sans text-xs sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3 font-medium text-foreground">
            <span>
              Selected: <strong>{selectedIds.size}</strong> items
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer rounded text-xs text-primary hover:bg-primary/10"
              onClick={handleSelectAll}
            >
              {selectedIds.size === filteredItems.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            <span className="text-muted-foreground/30">|</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 justify-center gap-1.5 border-green-500/20 bg-green-500/10 text-xs text-green-600 hover:bg-green-500/20 sm:flex-none"
              onClick={() => handleBatchReviewAction("keep")}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark to Keep
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 justify-center gap-1.5 border-destructive/20 bg-destructive/10 text-xs text-destructive hover:bg-destructive/20 sm:flex-none"
              onClick={() => handleBatchReviewAction("delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Mark to Delete
            </Button>
          </div>
        </div>
      )}

      {/* Main browser viewport panels */}
      <div className="relative min-h-0 flex-1">
        {layoutMode === "card" && groupMode === "normal" && (
          <MediaGrid
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onPreviewOpen={handleSetPreviewItem}
            onInfoOpen={handleSetInfoItem}
            onReviewAction={handleReviewAction}
            columns={4}
          />
        )}
        {layoutMode === "card" && groupMode === "date" && (
          <MediaTimeline
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onPreviewOpen={handleSetPreviewItem}
            onInfoOpen={handleSetInfoItem}
            onReviewAction={handleReviewAction}
          />
        )}
        {layoutMode === "list" && (
          <MediaList
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onPreviewOpen={handleSetPreviewItem}
            onReviewAction={handleReviewAction}
            isGrouped={groupMode === "date"}
          />
        )}
      </div>

      {/* Slide-over Preview dialog modal */}
      <MediaPreview
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        items={filteredItems}
        onItemChange={setPreviewItem}
      />
      <MediaInfoDialog item={infoItem} onClose={() => setInfoItem(null)} />

      {/* Midway Commit Confirmation Dialog */}
      {showCommitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 font-sans text-xs backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-foreground shadow-lg select-none">
            <div className="pb-4 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">
                Confirm Midway Deletion
              </h3>
              <p className="mt-1 text-xs leading-normal text-muted-foreground">
                You are about to permanently delete{" "}
                <strong>{deleteDetails.count}</strong> files from this folder,
                recovering <strong>{formatBytes(deleteDetails.size)}</strong>{" "}
                space.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                className="h-9 flex-1 text-xs"
                onClick={() => setShowCommitConfirm(false)}
                disabled={isCommitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-9 flex-1 text-xs"
                onClick={async () => {
                  const deleteIds = Object.entries(decisions)
                    .filter(([_, state]) => state === "delete")
                    .map(([mediaId]) => mediaId)
                  if (deleteIds.length > 0) {
                    await commitDeletions(deleteIds)
                  }
                  setShowCommitConfirm(false)
                }}
                disabled={isCommitting}
              >
                {isCommitting ? "Trashing..." : "Move to Trash"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

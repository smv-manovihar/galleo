import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
  useDeferredValue,
} from "react"
import { useSessionStore } from "../../stores/session-store"
import { CheckCircle2, Check, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatBytes } from "../../lib/format"
import type { MediaItem } from "../../../shared/types/media"
import type { DuplicateStrategy } from "../../../shared/types/settings"
import { useVirtualizer } from "@tanstack/react-virtual"
import { MediaPreview } from "../media/MediaPreview"
import { MediaInfoDialog } from "../media/MediaInfoDialog"
import { MediaContextMenu, type MediaContextMenuState } from "../media/MediaContextMenu"

import type { ExactDuplicateGroup } from "./exact-duplicates/types"
import { getDirPath } from "./exact-duplicates/types"
import { DuplicateAuditExactGroupCard } from "./exact-duplicates/DuplicateAuditExactGroupCard"
import { DuplicateAuditExactBottomBar } from "./exact-duplicates/DuplicateAuditExactBottomBar"
import { DuplicateAuditFolderRulesDialog } from "./exact-duplicates/DuplicateAuditFolderRulesDialog"

interface DuplicateAuditExactDuplicatesProps {
  exactDupsToDelete: MediaItem[]
  exactDupsToKeep: MediaItem[]
  duplicateGroups: MediaItem[][]
  strategy: DuplicateStrategy
  preferredKeepFolderPaths?: string[]
  preferredDeleteFolderPaths?: string[]
  onStrategyChange: (
    s: DuplicateStrategy,
    keepPaths?: string[],
    deletePaths?: string[]
  ) => void
}

export const DuplicateAuditExactDuplicates = React.memo<
  DuplicateAuditExactDuplicatesProps
>(({
  exactDupsToDelete,
  exactDupsToKeep,
  duplicateGroups,
  strategy,
  preferredKeepFolderPaths,
  preferredDeleteFolderPaths,
  onStrategyChange,
}) => {
  const startTrashingInBackground = useSessionStore(
    (s) => s.startTrashingInBackground
  )
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null)

  // Media Preview modal state
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [previewGroupItems, setPreviewGroupItems] = useState<
    MediaItem[] | undefined
  >(undefined)
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null)

  const handlePreviewItem = useCallback(
    (item: MediaItem, groupItems: MediaItem[]) => {
      setPreviewItem(item)
      setPreviewGroupItems(groupItems)
    },
    []
  )

  const handleClosePreview = useCallback(() => {
    setPreviewItem(null)
    setPreviewGroupItems(undefined)
  }, [])

  // Virtualizer scroll container ref (useRef eliminates initial mount re-render cycle)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [showOverridesOnly, setShowOverridesOnly] = useState(false)

  // Folder Rules Dialog state
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<MediaContextMenuState | null>(null)

  const handleContextMenu = useCallback(
    (item: MediaItem, e: React.MouseEvent) => {
      setContextMenu({ item, x: e.clientX, y: e.clientY })
    },
    []
  )

  // Per-group manual overrides: groupIdx -> chosen keep MediaItem ID
  const [overrides, setOverrides] = useState<Map<number, string>>(new Map())

  // Optimistic tracking for trashed items - subscribe only to boolean active state
  const [trashedIds, setTrashedIds] = useState<Set<string>>(new Set())
  const isTrashingActive = useSessionStore(
    (s) => Boolean(s.trashingProgress?.isActive)
  )

  useEffect(() => {
    if (!isTrashingActive) {
      setTrashedIds(new Set())
    }
  }, [isTrashingActive])

  // Pre-index keep IDs for O(1) group keep resolution
  const exactDupsToKeepIdSet = useMemo(
    () => new Set(exactDupsToKeep.map((k) => k.id)),
    [exactDupsToKeep]
  )

  // Compute folder statistics lazily only when folder rules dialog is open
  const { availableFolders, folderItemCounts } = useMemo(() => {
    if (!isFolderDialogOpen) {
      return { availableFolders: [] as string[], folderItemCounts: new Map<string, number>() }
    }
    const counts = new Map<string, number>()
    for (let gIdx = 0; gIdx < duplicateGroups.length; gIdx++) {
      const group = duplicateGroups[gIdx]
      for (let i = 0; i < group.length; i++) {
        const dir = getDirPath(group[i].path)
        counts.set(dir, (counts.get(dir) ?? 0) + 1)
      }
    }
    const folders = Array.from(counts.keys()).sort()
    return { availableFolders: folders, folderItemCounts: counts }
  }, [duplicateGroups, isFolderDialogOpen])

  // Resolve active duplicate groups and accumulate totals in a single unified pass
  const { resolvedGroups, totalDeleteCount, totalReclaimSize } = useMemo(() => {
    const result: ExactDuplicateGroup[] = []
    let totalDeleteCount = 0
    let totalReclaimSize = 0
    const hasOverrides = overrides.size > 0
    const hasTrashed = trashedIds.size > 0

    for (let idx = 0; idx < duplicateGroups.length; idx++) {
      const group = duplicateGroups[idx]

      // Fast path: No optimistic trashes and no manual overrides (typical initial render)
      if (!hasTrashed && !hasOverrides) {
        if (group.length < 2) continue

        let keep: MediaItem | undefined
        let bestCandidate: MediaItem | undefined

        for (let i = 0; i < group.length; i++) {
          const item = group[i]
          if (exactDupsToKeepIdSet.has(item.id)) {
            keep = item
            break
          }
          if (!bestCandidate && item.isBestInDuplicateGroup) {
            bestCandidate = item
          }
        }

        const selectedKeep = keep ?? bestCandidate ?? group[0]
        const deletes: MediaItem[] = []

        for (let i = 0; i < group.length; i++) {
          const item = group[i]
          if (item.id !== selectedKeep.id) {
            deletes.push(item)
            totalReclaimSize += item.size || 0
          }
        }

        if (deletes.length > 0) {
          totalDeleteCount += deletes.length
          result.push({ keep: selectedKeep, deletes, groupIdx: idx })
        }
        continue
      }

      // General path: handle trashed items and user overrides
      const visibleGroup =
        hasTrashed
          ? group.filter((item) => !trashedIds.has(item.id))
          : group

      if (visibleGroup.length < 2) continue

      const overrideKeepId = hasOverrides ? overrides.get(idx) : undefined

      const keep = overrideKeepId
        ? (visibleGroup.find((i) => i.id === overrideKeepId) ?? visibleGroup[0])
        : visibleGroup.find((i) => exactDupsToKeepIdSet.has(i.id)) ||
          visibleGroup.find((i) => i.isBestInDuplicateGroup) ||
          visibleGroup[0]

      const deletes: MediaItem[] = []
      for (let i = 0; i < visibleGroup.length; i++) {
        const item = visibleGroup[i]
        if (item.id !== keep.id) {
          deletes.push(item)
          totalReclaimSize += item.size || 0
        }
      }

      if (deletes.length > 0) {
        totalDeleteCount += deletes.length
        result.push({ keep, deletes, groupIdx: idx })
      }
    }

    return { resolvedGroups: result, totalDeleteCount, totalReclaimSize }
  }, [duplicateGroups, exactDupsToKeepIdSet, overrides, trashedIds])

  // Filter groups by search query and override status (with fast path for initial/unfiltered render)
  const filteredGroups = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase()

    if (!q && !showOverridesOnly) {
      return resolvedGroups
    }

    return resolvedGroups.filter((g) => {
      if (showOverridesOnly && !overrides.has(g.groupIdx)) {
        return false
      }

      if (!q) return true

      const keepMatches =
        g.keep.name.toLowerCase().includes(q) ||
        g.keep.path.toLowerCase().includes(q)

      if (keepMatches) return true

      return g.deletes.some(
        (d) =>
          d.name.toLowerCase().includes(q) || d.path.toLowerCase().includes(q)
      )
    })
  }, [resolvedGroups, deferredSearchQuery, showOverridesOnly, overrides])

  // Sizing estimate: header (38px) + (keep row + deletes) * 60px + margin (12px)
  const estimateItemSize = useCallback(
    (index: number) => {
      const group = filteredGroups[index]
      if (!group) return 160
      const rowCount = 1 + group.deletes.length
      return 38 + rowCount * 60 + 12
    },
    [filteredGroups]
  )

  const rowVirtualizer = useVirtualizer({
    count: filteredGroups.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: estimateItemSize,
    getItemKey: (index) => filteredGroups[index]?.groupIdx ?? index,
    overscan: 3,
  })

  // Callback to swap keep target in a group
  const handleSwapKeep = useCallback((groupIdx: number, newKeepId: string) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(groupIdx, newKeepId)
      return next
    })
  }, [])

  // Callback to reset a group's override
  const handleResetOverride = useCallback((groupIdx: number) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.delete(groupIdx)
      return next
    })
  }, [])

  // Review action callback for context menu (Keep / Delete promotion)
  const handleReviewAction = useCallback(
    (id: string, state: "keep" | "delete") => {
      for (let i = 0; i < resolvedGroups.length; i++) {
        const group = resolvedGroups[i]
        const isCurrentKeep = group.keep.id === id
        const isCurrentDelete = group.deletes.some((d) => d.id === id)

        if (isCurrentKeep || isCurrentDelete) {
          if (state === "keep" && !isCurrentKeep) {
            handleSwapKeep(group.groupIdx, id)
          } else if (state === "delete" && isCurrentKeep) {
            if (group.deletes.length > 0) {
              handleSwapKeep(group.groupIdx, group.deletes[0].id)
            }
          }
          break
        }
      }
    },
    [resolvedGroups, handleSwapKeep]
  )

  // Folder rules modal apply
  const handleApplyFolderRules = useCallback(
    (keepPaths: string[], deletePaths: string[]) => {
      onStrategyChange("folder_rules", keepPaths, deletePaths)
    },
    [onStrategyChange]
  )

  // Strategy change
  const handleStrategySelect = useCallback(
    (newStrategy: DuplicateStrategy) => {
      onStrategyChange(newStrategy)
    },
    [onStrategyChange]
  )

  const handleOpenFolderRules = useCallback(() => {
    setIsFolderDialogOpen(true)
  }, [])

  const handleToggleOverridesOnly = useCallback(() => {
    setShowOverridesOnly((prev) => !prev)
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchQuery("")
    setShowOverridesOnly(false)
  }, [])

  const handleResetContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleContextPreviewOpen = useCallback(
    (item: MediaItem) => {
      handlePreviewItem(item, [item])
    },
    [handlePreviewItem]
  )

  // Auto cleanup (Trash All)
  const handleAutoCleanup = useCallback(async () => {
    if (resolvedGroups.length === 0 || isCleaning) return

    setIsCleaning(true)
    setCleanSuccess(null)

    try {
      const store = useSessionStore.getState()
      const checkpoint = store.checkpoint
      if (!checkpoint) return

      const updatedDecisions = { ...store.decisions }
      const reviewsToUpdate: { mediaId: string; state: "keep" | "delete" }[] =
        []

      const resolvedKeepIds = new Set(resolvedGroups.map((g) => g.keep.id))
      const resolvedDeleteIds = new Set(
        resolvedGroups.flatMap((g) => g.deletes.map((d) => d.id))
      )

      for (const id of resolvedDeleteIds) {
        updatedDecisions[id] = "delete"
        reviewsToUpdate.push({ mediaId: id, state: "delete" })
      }
      for (const id of resolvedKeepIds) {
        updatedDecisions[id] = "keep"
        reviewsToUpdate.push({ mediaId: id, state: "keep" })
      }

      const updatedCheckpoint = {
        ...checkpoint,
        decisions: updatedDecisions,
        savedAt: new Date().toISOString(),
      }

      useSessionStore.setState({
        decisions: updatedDecisions,
        checkpoint: updatedCheckpoint,
      })

      await window.api.saveSessionCheckpoint(updatedCheckpoint)
      await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate)

      const specificIds = [...resolvedDeleteIds, ...resolvedKeepIds]
      const reclaimedSize = resolvedGroups.reduce(
        (acc, g) => acc + g.deletes.reduce((s, d) => s + (d.size || 0), 0),
        0
      )

      setTrashedIds(resolvedDeleteIds)
      setOverrides(new Map())

      setCleanSuccess(
        `Trashing ${resolvedDeleteIds.size} files in background (${formatBytes(reclaimedSize)} reclaimed).`
      )

      void startTrashingInBackground(specificIds, "Trashing exact duplicates...")
    } catch (e) {
      console.error("Auto cleanup failed:", e)
    } finally {
      setIsCleaning(false)
    }
  }, [resolvedGroups, isCleaning, startTrashingInBackground])

  // Empty state when all duplicates are resolved or folder has no duplicates
  if (exactDupsToDelete.length === 0 || resolvedGroups.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center select-none font-sans animate-in fade-in duration-300">
        <div className="w-full max-w-md space-y-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-2xs">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                Exact Duplicates Cleaned
              </h3>
              <p className="text-xs text-muted-foreground">
                No identical file copies remaining in this folder.
              </p>
            </div>

            {cleanSuccess ? (
              <div className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {cleanSuccess}
              </div>
            ) : (
              <div className="w-full rounded-lg border border-border/80 bg-muted/20 px-3.5 py-2.5 text-xs text-muted-foreground">
                All identical file copies have been processed or resolved. You can switch to the{" "}
                <strong className="font-semibold text-foreground">
                  Similar Media
                </strong>{" "}
                tab to review photos with visual differences.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col select-none">
      {/* Success Notification */}
      {cleanSuccess && (
        <div className="mt-14 mb-2 shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <Check className="size-4 shrink-0" />
            <span className="font-medium">{cleanSuccess}</span>
          </div>
        </div>
      )}

      {/* Virtualized Duplicate Groups List */}
      <div
        ref={scrollContainerRef}
        className={`relative min-h-0 flex-1 scrollbar-thin overflow-y-auto pr-2 pb-24 ${
          cleanSuccess ? "pt-2" : "pt-14"
        }`}
      >
        {filteredGroups.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <Search className="size-6 text-muted-foreground/60" />
            <p className="font-medium">No matching duplicate groups found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search query or clear the active filter
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="mt-2 h-7 text-xs"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const group = filteredGroups[virtualRow.index]
              if (!group) return null
              const hasOverride = overrides.has(group.groupIdx)

              return (
                <DuplicateAuditExactGroupCard
                  key={virtualRow.key}
                  index={virtualRow.index}
                  group={group}
                  hasOverride={hasOverride}
                  onSwapKeep={handleSwapKeep}
                  onResetOverride={handleResetOverride}
                  onPreviewItem={handlePreviewItem}
                  onContextMenu={handleContextMenu}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: "12px",
                  }}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <DuplicateAuditExactBottomBar
        strategy={strategy}
        onStrategyChange={handleStrategySelect}
        onOpenFolderRules={handleOpenFolderRules}
        keepFolderCount={preferredKeepFolderPaths?.length ?? 0}
        deleteFolderCount={preferredDeleteFolderPaths?.length ?? 0}
        totalDeleteCount={totalDeleteCount}
        totalReclaimSize={totalReclaimSize}
        isCleaning={isCleaning}
        onTrashAll={handleAutoCleanup}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showOverridesOnly={showOverridesOnly}
        onToggleOverridesOnly={handleToggleOverridesOnly}
        overridesCount={overrides.size}
        totalGroupsCount={resolvedGroups.length}
        filteredGroupsCount={filteredGroups.length}
      />

      {/* Folder Rules Configuration Dialog */}
      {isFolderDialogOpen && (
        <DuplicateAuditFolderRulesDialog
          open={isFolderDialogOpen}
          onOpenChange={setIsFolderDialogOpen}
          availableFolders={availableFolders}
          folderItemCounts={folderItemCounts}
          preferredKeepFolderPaths={preferredKeepFolderPaths}
          preferredDeleteFolderPaths={preferredDeleteFolderPaths}
          onApplyRules={handleApplyFolderRules}
        />
      )}

      {/* Context Menu on Right Click */}
      {contextMenu && (
        <MediaContextMenu
          contextMenu={contextMenu}
          onClose={handleResetContextMenu}
          onPreviewOpen={handleContextPreviewOpen}
          onInfoOpen={setInfoItem}
          onReviewAction={handleReviewAction}
        />
      )}

      {/* Media Info Dialog */}
      <MediaInfoDialog item={infoItem} onClose={() => setInfoItem(null)} />

      {/* Full Resolution Media Preview Modal */}
      {previewItem && (
        <MediaPreview
          item={previewItem}
          onClose={handleClosePreview}
          items={previewGroupItems}
          onItemChange={setPreviewItem}
          autoPlay={true}
        />
      )}
    </div>
  )
})

DuplicateAuditExactDuplicates.displayName = "DuplicateAuditExactDuplicates"


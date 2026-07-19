import React, { useMemo, useState, useCallback } from "react"
import type { MediaItem } from "../../../shared/types/media"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert,
  Sparkles,
  History,
  Undo2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { MediaPreview } from "../media/MediaPreview"
import { Progress } from "@/components/ui/progress"
import { useSessionStore } from "../../stores/session-store"
import { useMediaStore } from "../../stores/media-store"
import {
  DuplicateAuditHistoryDialog,
  type DuplicateAuditHistoryDialogItem,
} from "./DuplicateAuditHistoryDialog"
import { DuplicateAuditCard } from "./DuplicateAuditCard"

interface DuplicateAuditReviewProps {
  items: MediaItem[]
  onComplete?: () => void
  activeGroupIndex: number
  onGroupIndexChange: (index: number) => void
}

export const DuplicateAuditReview: React.FC<DuplicateAuditReviewProps> = ({
  items,
  onComplete,
  activeGroupIndex,
  onGroupIndexChange,
}) => {
  // Extract and group duplicates
  const duplicateGroups = useMemo(() => {
    const groups: Record<string, MediaItem[]> = {}
    for (const item of items) {
      if (item.isDuplicate && item.duplicateGroupId) {
        if (!groups[item.duplicateGroupId]) {
          groups[item.duplicateGroupId] = []
        }
        groups[item.duplicateGroupId].push(item)
      }
    }
    return Object.values(groups).filter((g) => g.length > 1)
  }, [items])

  const currentGroup =
    activeGroupIndex < duplicateGroups.length
      ? duplicateGroups[activeGroupIndex]
      : null

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)

  // Local undo stack — isolated from the swipe-review session store stack
  interface LocalUndoEntry {
    mediaId: string
    name: string
    previousState: "keep" | "delete" | "pending"
    batchId?: string
  }
  const [localUndoStack, setLocalUndoStack] = useState<LocalUndoEntry[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const [temporaryDecisions, setTemporaryDecisions] = useState<
    Record<string, "keep" | "delete">
  >({})
  const [isCurrentGroupCommitted, setIsCurrentGroupCommitted] = useState(false)

  // Dynamically resolve the best item in a similar media group based on quality/resolution/size
  const determineBestItem = useCallback((group: MediaItem[]) => {
    if (group.length === 0) return null
    let best = group[0]
    for (let k = 1; k < group.length; k++) {
      const item = group[k]
      const itemScore = item.quality?.compositeScore ?? 0
      const bestScore = best.quality?.compositeScore ?? 0

      if (itemScore > bestScore) {
        best = item
      } else if (itemScore === bestScore) {
        const itemRes = (item.width ?? 0) * (item.height ?? 0)
        const bestRes = (best.width ?? 0) * (best.height ?? 0)

        if (itemRes > bestRes) {
          best = item
        } else if (itemRes === bestRes) {
          if (item.size > best.size) {
            best = item
          }
        }
      }
    }
    return best
  }, [])

  // Calculate default recommendations or load committed decisions for the current group
  React.useEffect(() => {
    if (!currentGroup) {
      setTemporaryDecisions({})
      setIsCurrentGroupCommitted(false)
      return
    }

    const store = useSessionStore.getState()

    // Check if we already have committed decisions for this group in the session store
    const hasCommitted = currentGroup.some(
      (item) => store.decisions[item.id] !== undefined
    )

    if (hasCommitted) {
      setTemporaryDecisions({})
      setIsCurrentGroupCommitted(true)
    } else {
      const bestItem = determineBestItem(currentGroup) || currentGroup[0]
      const temps: Record<string, "keep" | "delete"> = {}
      for (const item of currentGroup) {
        temps[item.id] = item.id === bestItem.id ? "keep" : "delete"
      }
      setTemporaryDecisions(temps)
      setIsCurrentGroupCommitted(false)
    }
  }, [currentGroup, determineBestItem])

  const getItemReviewState = useCallback(
    (item: MediaItem) => {
      // 1. Check committed decisions first
      const committed = useSessionStore.getState().decisions[item.id]
      if (committed) return committed

      // 2. Fall back to temporary recommendations if it belongs to the current group
      if (currentGroup && currentGroup.some((i) => i.id === item.id)) {
        return temporaryDecisions[item.id] ?? "pending"
      }

      return item.reviewState ?? "pending"
    },
    [currentGroup, temporaryDecisions]
  )

  const checkpoint = useSessionStore((state) => state.checkpoint)
  const isInitializedRef = React.useRef(false)
  const lastFolderPathRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!checkpoint) return

    // Reset if folder path changes
    if (checkpoint.folderPath !== lastFolderPathRef.current) {
      isInitializedRef.current = false
      lastFolderPathRef.current = checkpoint.folderPath
      setLocalUndoStack([])
    }

    if (!isInitializedRef.current && items.length > 0) {
      const decisionKeys = Object.keys(checkpoint.decisions)
      if (decisionKeys.length > 0) {
        const initialStack: LocalUndoEntry[] = []
        for (const mediaId of decisionKeys) {
          const item = items.find((i) => i.id === mediaId)
          if (item) {
            initialStack.push({
              mediaId,
              name: item.name,
              previousState: "pending",
            })
          }
        }
        setLocalUndoStack(initialStack)
      }
      isInitializedRef.current = true
    }
  }, [checkpoint, items])

  // Map localUndoStack to standard HistoryDialogItem format
  const historyItems = useMemo<DuplicateAuditHistoryDialogItem[]>(() => {
    return localUndoStack.map((entry, idx) => {
      const item = items.find((i) => i.id === entry.mediaId)
      const currentDecision = useSessionStore.getState().decisions[
        entry.mediaId
      ] as "keep" | "delete" | "pending"
      return {
        id: `${entry.mediaId}-${idx}`,
        mediaId: entry.mediaId,
        name: entry.name,
        thumbnailPath: item?.thumbnailPath,
        path: item?.path ?? "",
        currentDecision: (currentDecision === "pending"
          ? "pending"
          : currentDecision) as any,
      }
    })
  }, [localUndoStack, items])

  const handleUndo = async () => {
    if (localUndoStack.length === 0) return

    let currentStack = [...localUndoStack]
    let entriesToRevert: LocalUndoEntry[] = []
    let targetIndex = -1

    // Loop to discard auto-recommendations of the current group if they are at the top of the stack
    while (currentStack.length > 0) {
      const lastEntry = currentStack[currentStack.length - 1]
      const batchId = lastEntry.batchId

      let currentBatch: LocalUndoEntry[] = []
      if (batchId) {
        let idx = currentStack.length - 1
        while (idx >= 0 && currentStack[idx].batchId === batchId) {
          currentBatch.push(currentStack[idx])
          idx--
        }
      } else {
        currentBatch = [lastEntry]
      }

      // Check if this batch belongs to the current active group and is an auto-recommendation
      const firstId = currentBatch[0].mediaId
      const groupIndex = duplicateGroups.findIndex((group) =>
        group.some((item) => item.id === firstId)
      )

      const isCurrentGroupAutoRecommend =
        groupIndex === activeGroupIndex &&
        batchId?.startsWith("auto_recommend_")

      if (isCurrentGroupAutoRecommend) {
        // Yes, it is the current group's auto-recommendation.
        // We revert it to pending, pop it from stack, and continue to find the previous user decision.
        entriesToRevert.push(...currentBatch)
        currentStack = currentStack.slice(0, -currentBatch.length)
      } else {
        // This is the actual decision we want to undo!
        entriesToRevert.push(...currentBatch)
        currentStack = currentStack.slice(0, -currentBatch.length)
        targetIndex = groupIndex
        break // Stop loop, we found the user action to undo
      }
    }

    if (entriesToRevert.length === 0) return

    // Revert the decisions in session store and DB
    const store = useSessionStore.getState()
    const checkpoint = store.checkpoint
    if (!checkpoint) return

    const updatedDecisions = { ...store.decisions }
    const reviewsToUpdate: { mediaId: string; state: any }[] = []

    for (const entry of entriesToRevert) {
      if (entry.previousState === "pending") {
        delete updatedDecisions[entry.mediaId]
      } else {
        updatedDecisions[entry.mediaId] = entry.previousState
      }
      reviewsToUpdate.push({
        mediaId: entry.mediaId,
        state: entry.previousState as any,
      })
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

    // Update media store so cards re-render
    const mediaStore = useMediaStore.getState()
    useMediaStore.setState({
      items: mediaStore.items.map((i) => {
        const entry = entriesToRevert.find((e) => e.mediaId === i.id)
        if (entry) {
          return {
            ...i,
            reviewState: (entry.previousState === "pending"
              ? "pending"
              : entry.previousState) as any,
          }
        }
        return i
      }),
    })

    // Navigate to the target group
    if (targetIndex !== -1) {
      // Navigate to the target group
      if (targetIndex !== activeGroupIndex) {
        onGroupIndexChange(targetIndex)
      }
    }

    setLocalUndoStack(currentStack)
  }

  const handleBulkChangeDecisions = useCallback(
    async (mediaIds: string[], newDecision: "keep" | "delete") => {
      const store = useSessionStore.getState()
      const checkpoint = store.checkpoint
      if (!checkpoint) return

      const updatedDecisions = { ...store.decisions }
      const newUndoEntries: LocalUndoEntry[] = []
      const batchId = `batch_${Date.now()}`
      const updatedGroups = new Set<string>()

      for (const mediaId of mediaIds) {
        const item = items.find((i) => i.id === mediaId)
        if (item) {
          const currentDecision = (store.decisions[mediaId] ?? "pending") as
            "keep" | "delete" | "pending"
          newUndoEntries.push({
            mediaId,
            name: item.name,
            previousState: currentDecision,
            batchId,
          })
          updatedDecisions[mediaId] = newDecision
          if (item.duplicateGroupId) {
            updatedGroups.add(item.duplicateGroupId)
          }
        }
      }

      setLocalUndoStack((prev) => [...prev, ...newUndoEntries])

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

      const reviewsToUpdate = mediaIds.map((mediaId) => ({
        mediaId,
        state: newDecision as any,
      }))
      await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate)

      const mediaStore = useMediaStore.getState()
      const mediaIdSet = new Set(mediaIds)
      useMediaStore.setState({
        items: mediaStore.items.map((i) =>
          mediaIdSet.has(i.id) ? { ...i, reviewState: newDecision } : i
        ),
      })
    },
    [items]
  )

  const handleSingleAction = useCallback(
    async (mediaId: string, newDecision: "keep" | "delete") => {
      await handleBulkChangeDecisions([mediaId], newDecision)
    },
    [handleBulkChangeDecisions]
  )

  const commitGroupDecisions = async (
    decisionsToCommit: Record<string, "keep" | "delete">,
    batchId: string
  ) => {
    const store = useSessionStore.getState()
    const checkpoint = store.checkpoint
    if (!checkpoint) return

    const updatedDecisions = { ...store.decisions }
    const newUndoEntries: LocalUndoEntry[] = []
    const reviewsToUpdate: { mediaId: string; state: "keep" | "delete" }[] = []

    for (const [mediaId, decision] of Object.entries(decisionsToCommit)) {
      const item = items.find((i) => i.id === mediaId)
      if (item) {
        const currentDecision = (store.decisions[mediaId] ?? "pending") as
          "keep" | "delete" | "pending"
        newUndoEntries.push({
          mediaId,
          name: item.name,
          previousState: currentDecision,
          batchId,
        })
        updatedDecisions[mediaId] = decision
        reviewsToUpdate.push({ mediaId, state: decision })
      }
    }

    setLocalUndoStack((prev) => [...prev, ...newUndoEntries])

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

    const mediaStore = useMediaStore.getState()
    useMediaStore.setState({
      items: mediaStore.items.map((i) => {
        if (decisionsToCommit[i.id]) {
          return {
            ...i,
            reviewState: decisionsToCommit[i.id],
          }
        }
        return i
      }),
    })

    setIsCurrentGroupCommitted(true)
  }

  const handleKeepBest = async () => {
    if (!currentGroup) return
    const batchId = `manual_keep_best_${Date.now()}`
    const bestItem = determineBestItem(currentGroup) || currentGroup[0]

    const newDecisions: Record<string, "keep" | "delete"> = {}
    for (const item of currentGroup) {
      newDecisions[item.id] = item.id === bestItem.id ? "keep" : "delete"
    }

    await commitGroupDecisions(newDecisions, batchId)
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1))
  }

  const handleKeepAll = async () => {
    if (!currentGroup) return
    const batchId = `manual_keep_all_${Date.now()}`

    const newDecisions: Record<string, "keep" | "delete"> = {}
    for (const item of currentGroup) {
      newDecisions[item.id] = "keep"
    }

    await commitGroupDecisions(newDecisions, batchId)
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1))
  }

  const handleDeleteAll = async () => {
    if (!currentGroup) return
    const batchId = `manual_delete_all_${Date.now()}`

    const newDecisions: Record<string, "keep" | "delete"> = {}
    for (const item of currentGroup) {
      newDecisions[item.id] = "delete"
    }

    await commitGroupDecisions(newDecisions, batchId)
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1))
  }

  const nextGroup = async () => {
    if (currentGroup && !isCurrentGroupCommitted) {
      const batchId = `auto_recommend_${Date.now()}`
      await commitGroupDecisions(temporaryDecisions, batchId)
    }
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1))
  }

  const prevGroup = async () => {
    if (currentGroup && !isCurrentGroupCommitted) {
      const batchId = `auto_recommend_${Date.now()}`
      await commitGroupDecisions(temporaryDecisions, batchId)
    }
    onGroupIndexChange(Math.max(0, activeGroupIndex - 1))
  }

  const handleToggleKeep = async (itemId: string) => {
    if (!currentGroup) return

    const item = currentGroup.find((i) => i.id === itemId)
    if (!item) return
    const currentDecision = getItemReviewState(item)
    const newDecision: "keep" | "delete" =
      currentDecision === "keep" ? "delete" : "keep"

    const newDecisions: Record<string, "keep" | "delete"> = {}
    for (const gItem of currentGroup) {
      if (gItem.id === itemId) {
        newDecisions[gItem.id] = newDecision
      } else {
        const existing = getItemReviewState(gItem)
        newDecisions[gItem.id] = (
          existing === "pending" ? "keep" : existing
        ) as "keep" | "delete"
      }
    }

    const batchId = `manual_toggle_${Date.now()}`
    await commitGroupDecisions(newDecisions, batchId)
  }

  const openPreview = (item: MediaItem, withAutoPlay = false) => {
    setAutoPlay(withAutoPlay)
    setPreviewItem(item)
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true" ||
        previewItem !== null ||
        isHistoryOpen
      ) {
        return
      }

      const key = e.key.toLowerCase()

      // Undo: z or Ctrl+Z
      if (key === "z") {
        e.preventDefault()
        handleUndo()
        return
      }

      // Group navigation: Left / Right arrows or H / L keys
      if (e.key === "ArrowLeft" || key === "h") {
        e.preventDefault()
        prevGroup()
        return
      }
      if (e.key === "ArrowRight" || key === "l") {
        e.preventDefault()
        nextGroup()
        return
      }

      // Keep All: k
      if (key === "k") {
        e.preventDefault()
        handleKeepAll()
        return
      }

      // Delete All: d
      if (key === "d") {
        e.preventDefault()
        handleDeleteAll()
        return
      }

      // Auto-Keep Best: b, Space or Enter
      if (key === "b" || e.key === " " || e.key === "Enter") {
        e.preventDefault()
        handleKeepBest()
        return
      }

      // Individual item toggle: 1, 2, 3, etc.
      if (currentGroup && /^[1-9]$/.test(e.key)) {
        const itemIndex = parseInt(e.key, 10) - 1
        if (itemIndex < currentGroup.length) {
          e.preventDefault()
          handleToggleKeep(currentGroup[itemIndex].id)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    currentGroup,
    previewItem,
    isHistoryOpen,
    handleUndo,
    prevGroup,
    nextGroup,
    handleKeepAll,
    handleDeleteAll,
    handleKeepBest,
    handleToggleKeep,
  ])

  React.useEffect(() => {
    if (!currentGroup && duplicateGroups.length > 0 && onComplete) {
      onComplete()
    }
  }, [currentGroup, duplicateGroups.length, onComplete])

  if (duplicateGroups.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 font-sans text-xs text-muted-foreground select-none">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <span>No duplicate groupings scanned in this directory.</span>
      </div>
    )
  }

  if (!currentGroup) {
    return null
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 font-sans text-xs select-none">
      {/* Progress */}
      <div className="flex -mt-3 shrink-0 items-center gap-3">
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          Group{" "}
          <span className="font-semibold text-foreground">
            {activeGroupIndex + 1}
          </span>{" "}
          of {duplicateGroups.length}
        </span>
        <Progress
          value={((activeGroupIndex + 1) / duplicateGroups.length) * 100}
          className="h-1 flex-1 bg-muted"
        />
        {onComplete && (
          <Button
            variant="outline"
            size="sm"
            onClick={onComplete}
            className="h-5 cursor-pointer px-2 text-3xs font-semibold hover:bg-accent"
          >
            View Summary
          </Button>
        )}
      </div>

      {/* Cards Grid */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="grid min-h-0 flex-1 gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(3, currentGroup.length)}, minmax(0, 1fr))`,
          }}
        >
          {currentGroup.map((item, idx) => {
            const dynamicBest = determineBestItem(currentGroup)
            const isBest = dynamicBest && item.id === dynamicBest.id
            const reviewState = getItemReviewState(item)
            return (
              <DuplicateAuditCard
                key={item.id}
                item={item}
                isBest={!!isBest}
                reviewState={reviewState}
                hotkeyIndex={idx + 1}
                onClick={() => handleToggleKeep(item.id)}
                onPreview={(withAutoPlay) => openPreview(item, withAutoPlay)}
              />
            )
          })}
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 rounded-lg border border-border bg-card/60 px-3 backdrop-blur-sm">
        {/* Left: Undo Controls */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleUndo}
                disabled={localUndoStack.length === 0}
              >
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Undo (Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsHistoryOpen(true)}
                disabled={localUndoStack.length === 0}
              >
                <History />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">History</TooltipContent>
          </Tooltip>
          <DuplicateAuditHistoryDialog
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            items={historyItems}
            onBulkAction={handleBulkChangeDecisions}
            onSingleAction={handleSingleAction}
          />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Center: Smart Actions */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructive" size="lg" onClick={handleDeleteAll}>
                Delete All
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete All (D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="lg" onClick={handleKeepAll}>
                Keep All
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Keep All (K)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="lg"
                className="gap-1.5"
                onClick={handleKeepBest}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Auto-Keep Best
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Auto-Keep Best (B, Space, or Enter)</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Right: Navigation */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={prevGroup}
                disabled={activeGroupIndex === 0}
              >
                <ChevronLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Previous Group (← or H)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={nextGroup}
                disabled={activeGroupIndex >= duplicateGroups.length}
              >
                <ChevronRight />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {activeGroupIndex === duplicateGroups.length - 1
                ? "Finish & View Summary"
                : "Next Group (→ or L)"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <MediaPreview
        item={previewItem}
        onClose={() => {
          setPreviewItem(null)
          setAutoPlay(false)
        }}
        items={currentGroup}
        onItemChange={(item) => setPreviewItem(item)}
        autoPlay={autoPlay}
      />
    </div>
  )
}

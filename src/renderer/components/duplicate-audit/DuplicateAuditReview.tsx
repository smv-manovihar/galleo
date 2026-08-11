import React, { useMemo, useState, useCallback } from "react"
import type { MediaItem } from "../../../shared/types/media"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right")
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null)
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
    return Object.keys(groups)
      .sort()
      .map((k) => groups[k])
      .filter((g) => g.length > 1)
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

  const decisions = useSessionStore((state) => state.decisions)
  const checkpoint = useSessionStore((state) => state.checkpoint)

  // Calculate default recommendations or load committed decisions for the current group
  const currentGroupId = currentGroup ? currentGroup.map((i) => i.id).join(",") : null
  const [prevGroupId, setPrevGroupId] = useState<string | null>(null)

  const isAllReviewed = useMemo(() => {
    if (duplicateGroups.length === 0) return false
    return duplicateGroups.every((group) =>
      group.every(
        (item) =>
          decisions[item.id] === "keep" || decisions[item.id] === "delete"
      )
    )
  }, [duplicateGroups, decisions])

  if (currentGroupId !== prevGroupId) {
    setPrevGroupId(currentGroupId)
    if (!currentGroup) {
      setTemporaryDecisions({})
      setIsCurrentGroupCommitted(false)
    } else {
      const hasCommitted = currentGroup.every(
        (item) =>
          decisions[item.id] === "keep" || decisions[item.id] === "delete"
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
    }
  }

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

  const [lastFolderPath, setLastFolderPath] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  if (checkpoint && checkpoint.folderPath !== lastFolderPath) {
    setLastFolderPath(checkpoint.folderPath)
    setIsInitialized(false)
    if (localUndoStack.length > 0) setLocalUndoStack([])
  }

  if (checkpoint && !isInitialized && items.length > 0) {
    setIsInitialized(true)
    // Seed from the persisted undoStack, scoped to duplicate-source actions only.
    // Using checkpoint.decisions would include culling/browse decisions (no source tag)
    // and cause cross-source entries to appear in the duplicate history dialog.
    const duplicateActions = checkpoint.undoStack.filter(
      (a) => a.newState.source === "duplicates"
    )
    if (duplicateActions.length > 0) {
      const initialStack: LocalUndoEntry[] = []
      for (const action of duplicateActions) {
        const item = items.find((i) => i.id === action.mediaId)
        if (item) {
          initialStack.push({
            mediaId: action.mediaId,
            name: item.name,
            previousState: "pending",
          })
        }
      }
      if (initialStack.length > 0) setLocalUndoStack(initialStack)
    }
  }

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
          : currentDecision) as "keep" | "delete" | "pending",
      }
    })
  }, [localUndoStack, items])

  const handleUndo = useCallback(async () => {
    if (localUndoStack.length === 0) return

    let currentStack = [...localUndoStack]
    const entriesToRevert: LocalUndoEntry[] = []
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
    const reviewsToUpdate: { mediaId: string; state: "keep" | "delete" | "pending" }[] = []

    for (const entry of entriesToRevert) {
      if (entry.previousState === "pending") {
        delete updatedDecisions[entry.mediaId]
      } else {
        updatedDecisions[entry.mediaId] = entry.previousState
      }
      reviewsToUpdate.push({
        mediaId: entry.mediaId,
        state: entry.previousState as "keep" | "delete" | "pending",
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
    useMediaStore.getState().setItems(
      mediaStore.items.map((i) => {
        const entry = entriesToRevert.find((e) => e.mediaId === i.id)
        if (entry) {
          return {
            ...i,
            reviewState: (entry.previousState === "pending"
              ? "pending"
              : entry.previousState) as "keep" | "delete" | "pending",
          }
        }
        return i
      })
    )

    // Navigate to the target group
    if (targetIndex !== -1) {
      // Navigate to the target group
      if (targetIndex !== activeGroupIndex) {
        onGroupIndexChange(targetIndex)
      }
    }

    setLocalUndoStack(currentStack)
  }, [
    localUndoStack,
    duplicateGroups,
    activeGroupIndex,
    onGroupIndexChange,
  ])

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
        state: newDecision as "keep" | "delete" | "pending",
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

  const commitGroupDecisions = useCallback(
    async (
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
    },
    [items]
  )

  const handleKeepBest = useCallback(async () => {
    if (!currentGroup) return
    setSlideDirection("right")
    const batchId = `manual_keep_best_${Date.now()}`
    const bestItem = determineBestItem(currentGroup) || currentGroup[0]

    const newDecisions: Record<string, "keep" | "delete"> = {}
    for (const item of currentGroup) {
      newDecisions[item.id] = item.id === bestItem.id ? "keep" : "delete"
    }

    await commitGroupDecisions(newDecisions, batchId)
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1))
  }, [
    currentGroup,
    determineBestItem,
    commitGroupDecisions,
    onGroupIndexChange,
    duplicateGroups.length,
    activeGroupIndex,
  ])

  const handleKeepAll = useCallback(async () => {
    if (!currentGroup) return
    setSlideDirection("right")
    const batchId = `manual_keep_all_${Date.now()}`

    const newDecisions: Record<string, "keep" | "delete"> = {}
    for (const item of currentGroup) {
      newDecisions[item.id] = "keep"
    }

    await commitGroupDecisions(newDecisions, batchId)
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1))
  }, [
    currentGroup,
    commitGroupDecisions,
    onGroupIndexChange,
    duplicateGroups.length,
    activeGroupIndex,
  ])

  const handleDeleteAll = useCallback(async () => {
    if (!currentGroup) return
    setSlideDirection("right")
    const batchId = `manual_delete_all_${Date.now()}`

    const newDecisions: Record<string, "keep" | "delete"> = {}
    for (const item of currentGroup) {
      newDecisions[item.id] = "delete"
    }

    await commitGroupDecisions(newDecisions, batchId)
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1))
  }, [
    currentGroup,
    commitGroupDecisions,
    onGroupIndexChange,
    duplicateGroups.length,
    activeGroupIndex,
  ])

  const nextGroup = useCallback(async () => {
    setSlideDirection("right")
    if (currentGroup && !isCurrentGroupCommitted) {
      const batchId = `auto_recommend_${Date.now()}`
      await commitGroupDecisions(temporaryDecisions, batchId)
    }
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1))
  }, [
    currentGroup,
    isCurrentGroupCommitted,
    temporaryDecisions,
    commitGroupDecisions,
    onGroupIndexChange,
    duplicateGroups.length,
    activeGroupIndex,
  ])

  const prevGroup = useCallback(async () => {
    setSlideDirection("left")
    if (currentGroup && !isCurrentGroupCommitted) {
      const batchId = `auto_recommend_${Date.now()}`
      await commitGroupDecisions(temporaryDecisions, batchId)
    }
    onGroupIndexChange(Math.max(0, activeGroupIndex - 1))
  }, [
    currentGroup,
    isCurrentGroupCommitted,
    temporaryDecisions,
    commitGroupDecisions,
    onGroupIndexChange,
    activeGroupIndex,
  ])

  const handleToggleKeep = useCallback(
    async (itemId: string) => {
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
    },
    [currentGroup, getItemReviewState, commitGroupDecisions]
  )

  const openPreview = useCallback((item: MediaItem, withAutoPlay = false) => {
    setAutoPlay(withAutoPlay)
    setPreviewItem(item)
  }, [])

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
      const isFocusMode = focusedCardIndex !== null
      const cols = 3

      // ── Focus mode ─────────────────────────────────────────────────────────
      if (isFocusMode && currentGroup) {
        const len = currentGroup.length

        // Exit focus mode: Esc or F
        if (e.key === "Escape" || key === "f") {
          e.preventDefault()
          setFocusedCardIndex(null)
          return
        }

        // Move left: ← / A — stay within the current row
        if (e.key === "ArrowLeft" || key === "a") {
          e.preventDefault()
          setFocusedCardIndex((prev) => {
            if (prev === null) return 0
            const row = Math.floor(prev / cols)
            return Math.max(row * cols, prev - 1)
          })
          return
        }

        // Move right: → / D — stay within the current row
        if (e.key === "ArrowRight" || key === "d") {
          e.preventDefault()
          setFocusedCardIndex((prev) => {
            if (prev === null) return 0
            const row = Math.floor(prev / cols)
            const rowEnd = Math.min(row * cols + cols - 1, len - 1)
            return Math.min(rowEnd, prev + 1)
          })
          return
        }

        // Move up: ↑ / W — same column, previous row
        if (e.key === "ArrowUp" || key === "w") {
          e.preventDefault()
          setFocusedCardIndex((prev) => {
            if (prev === null) return 0
            return Math.max(0, prev - cols)
          })
          return
        }

        // Move down: ↓ / S — same column, next row, clamped to last card
        if (e.key === "ArrowDown" || key === "s") {
          e.preventDefault()
          setFocusedCardIndex((prev) => {
            if (prev === null) return 0
            return Math.min(len - 1, prev + cols)
          })
          return
        }

        // Toggle focused card: Space / Enter
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault()
          handleToggleKeep(currentGroup[focusedCardIndex].id)
          return
        }

        // Undo: Ctrl+Z / Backspace
        if ((e.ctrlKey && key === "z") || e.key === "Backspace") {
          e.preventDefault()
          handleUndo()
          return
        }

        // Absorb other keys while in focus mode so they don't accidentally trigger global actions
        return
      }

      // ── Normal mode ────────────────────────────────────────────────────────

      // Enter focus mode: F
      if (key === "f" && currentGroup) {
        e.preventDefault()
        setFocusedCardIndex(0)
        return
      }

      // Undo: ↓ / S / Ctrl+Z / Backspace
      if (
        e.key === "ArrowDown" ||
        key === "s" ||
        (e.ctrlKey && key === "z") ||
        e.key === "Backspace"
      ) {
        e.preventDefault()
        handleUndo()
        return
      }

      // Preview best: ↑ / W
      if (e.key === "ArrowUp" || key === "w") {
        e.preventDefault()
        if (currentGroup) {
          const best = determineBestItem(currentGroup)
          if (best) openPreview(best)
        }
        return
      }

      // Previous group: ← / A
      if (e.key === "ArrowLeft" || key === "a") {
        e.preventDefault()
        prevGroup()
        return
      }

      // Next group: → / D
      if (e.key === "ArrowRight" || key === "d") {
        e.preventDefault()
        nextGroup()
        return
      }

      // Auto-Keep Best: Space / Enter
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        handleKeepBest()
        return
      }

      // Keep All: C
      if (key === "c") {
        e.preventDefault()
        handleKeepAll()
        return
      }

      // Delete All: Del / X
      if (e.key === "Delete" || key === "x") {
        e.preventDefault()
        handleDeleteAll()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    currentGroup,
    focusedCardIndex,
    previewItem,
    isHistoryOpen,
    handleUndo,
    prevGroup,
    nextGroup,
    handleKeepAll,
    handleDeleteAll,
    handleKeepBest,
    handleToggleKeep,
    determineBestItem,
    openPreview,
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
        {onComplete && isAllReviewed && (
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
      <div className="flex min-h-0 flex-1 flex-col overflow-visible">
        <div
          key={activeGroupIndex}
          className={cn(
            "grid min-h-0 flex-1 gap-3 p-1.5 overflow-y-auto duration-200 ease-out animate-in fade-in-0",
            slideDirection === "right"
              ? "slide-in-from-right-6"
              : "slide-in-from-left-6"
          )}
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
                isFocused={focusedCardIndex === idx}
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
            <TooltipContent side="top">Undo (↓ / S / Ctrl+Z / Backspace)</TooltipContent>
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
            <TooltipContent side="top">Delete All (Del / X)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="lg" onClick={handleKeepAll}>
                Keep All
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Keep All (C)</TooltipContent>
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
            <TooltipContent side="top">Auto-Keep Best (Space / Enter)</TooltipContent>
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
            <TooltipContent side="top">Previous Group (← / A)</TooltipContent>
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
                : "Next Group (→ / D)"}
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

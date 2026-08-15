import React, { useMemo, useState, useCallback, useEffect } from "react"
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
import { MediaInfoDialog } from "../media/MediaInfoDialog"
import { Progress } from "@/components/ui/progress"
import { useSessionStore } from "../../stores/session-store"
import {
  DuplicateAuditHistoryDialog,
  type DuplicateAuditHistoryDialogItem,
} from "./DuplicateAuditHistoryDialog"
import { DuplicateAuditCard } from "./DuplicateAuditCard"

interface DuplicateAuditSimilarMediaProps {
  items: MediaItem[]
  onComplete?: () => void
  activeGroupIndex: number
  onGroupIndexChange: (
    indexOrUpdater: number | ((prev: number) => number)
  ) => void
}

export const DuplicateAuditSimilarMedia: React.FC<
  DuplicateAuditSimilarMediaProps
> = ({
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
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)

  const decisions = useSessionStore((state) => state.decisions)
  const undoStack = useSessionStore((state) => state.undoStack)

  const duplicateUndoStack = useMemo(
    () => undoStack.filter((a) => a.newState.source === "duplicates"),
    [undoStack]
  )

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

  // Stable id string — used as render-phase dep to detect group changes
  const currentGroupId = useMemo(
    () => (currentGroup ? currentGroup.map((i) => i.id).join(",") : null),
    [currentGroup]
  )

  const isAllReviewed = useMemo(() => {
    if (duplicateGroups.length === 0) return false
    return duplicateGroups.every((group) =>
      group.every(
        (item) =>
          decisions[item.id] === "keep" || decisions[item.id] === "delete"
      )
    )
  }, [duplicateGroups, decisions])

  // Render-phase derived state: when the active group changes, re-initialise
  // the local decision scratch-pad. React immediately discards the current
  // render and re-runs with the new state — no DOM frame is painted in between.
  // (useEffect with setState is blocked by react-hooks/set-state-in-effect.)
  const [prevGroupId, setPrevGroupId] = useState<string | null>(null)
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

  // Map duplicateUndoStack directly to HistoryDialog format
  const historyItems = useMemo<DuplicateAuditHistoryDialogItem[]>(() => {
    return duplicateUndoStack.map((action, idx) => {
      const item = items.find((i) => i.id === action.mediaId)
      const currentDecision = (decisions[action.mediaId] ?? "pending") as
        | "keep"
        | "delete"
        | "pending"
      return {
        id: `${action.id}-${idx}`,
        mediaId: action.mediaId,
        name: item?.name ?? action.mediaId,
        thumbnailPath: item?.thumbnailPath,
        path: item?.path ?? "",
        currentDecision,
      }
    })
  }, [duplicateUndoStack, items, decisions])

  const handleUndo = useCallback(async () => {
    const store = useSessionStore.getState()
    const dupActions = store.undoStack.filter(
      (a) => a.newState.source === "duplicates"
    )
    if (dupActions.length === 0) return

    // Find the target group index associated with the most recent duplicate action
    const lastAction = dupActions[dupActions.length - 1]
    const targetGroupIndex = duplicateGroups.findIndex((group) =>
      group.some((item) => item.id === lastAction.mediaId)
    )

    const success = await store.undo("duplicates")
    if (
      success &&
      targetGroupIndex !== -1 &&
      targetGroupIndex !== activeGroupIndex
    ) {
      onGroupIndexChange(targetGroupIndex)
    }
  }, [duplicateGroups, activeGroupIndex, onGroupIndexChange])

  const commitGroupDecisions = useCallback(
    async (
      decisionsToCommit: Record<string, "keep" | "delete">,
      batchId: string
    ) => {
      const store = useSessionStore.getState()
      const updates = Object.entries(decisionsToCommit).map(
        ([mediaId, decision]) => {
          const currentDecision = (store.decisions[mediaId] ?? "pending") as
            | "keep"
            | "delete"
            | "pending"
          return {
            mediaId,
            state: decision,
            prevState: currentDecision,
          }
        }
      )

      await store.submitBatchDecisions(updates, "duplicates", batchId)
      setIsCurrentGroupCommitted(true)
    },
    []
  )

  const handleBulkChangeDecisions = useCallback(
    async (mediaIds: string[], newDecision: "keep" | "delete") => {
      const store = useSessionStore.getState()
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const updates = mediaIds.map((mediaId) => {
        const currentDecision = (store.decisions[mediaId] ?? "pending") as
          | "keep"
          | "delete"
          | "pending"
        return {
          mediaId,
          state: newDecision,
          prevState: currentDecision,
        }
      })

      await store.submitBatchDecisions(updates, "duplicates", batchId)
    },
    []
  )

  const handleSingleAction = useCallback(
    async (mediaId: string, newDecision: "keep" | "delete") => {
      await handleBulkChangeDecisions([mediaId], newDecision)
    },
    [handleBulkChangeDecisions]
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
    onGroupIndexChange((prev) =>
      Math.min(duplicateGroups.length, prev + 1)
    )
  }, [
    currentGroup,
    determineBestItem,
    commitGroupDecisions,
    onGroupIndexChange,
    duplicateGroups.length,
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
    onGroupIndexChange((prev) =>
      Math.min(duplicateGroups.length, prev + 1)
    )
  }, [
    currentGroup,
    commitGroupDecisions,
    onGroupIndexChange,
    duplicateGroups.length,
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
    onGroupIndexChange((prev) =>
      Math.min(duplicateGroups.length, prev + 1)
    )
  }, [
    currentGroup,
    commitGroupDecisions,
    onGroupIndexChange,
    duplicateGroups.length,
  ])

  const nextGroup = useCallback(async () => {
    setSlideDirection("right")
    if (currentGroup && !isCurrentGroupCommitted) {
      const batchId = `auto_recommend_${Date.now()}`
      await commitGroupDecisions(temporaryDecisions, batchId)
    }
    onGroupIndexChange((prev) =>
      Math.min(duplicateGroups.length, prev + 1)
    )
  }, [
    currentGroup,
    isCurrentGroupCommitted,
    temporaryDecisions,
    commitGroupDecisions,
    onGroupIndexChange,
    duplicateGroups.length,
  ])

  const prevGroup = useCallback(async () => {
    setSlideDirection("left")
    if (currentGroup && !isCurrentGroupCommitted) {
      const batchId = `auto_recommend_${Date.now()}`
      await commitGroupDecisions(temporaryDecisions, batchId)
    }
    onGroupIndexChange((prev) => Math.max(0, prev - 1))
  }, [
    currentGroup,
    isCurrentGroupCommitted,
    temporaryDecisions,
    commitGroupDecisions,
    onGroupIndexChange,
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

  useEffect(() => {
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

  useEffect(() => {
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
            className="h-5 cursor-pointer px-2 text-xs font-semibold hover:bg-accent"
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
            "grid min-h-0 flex-1 gap-3 p-2 overflow-y-auto duration-200 ease-out animate-in fade-in-0",
            slideDirection === "right"
              ? "slide-in-from-right-6"
              : "slide-in-from-left-6"
          )}
          style={{
            gridTemplateColumns: `repeat(${Math.min(3, currentGroup.length)}, minmax(0, 1fr))`,
          }}
        >
          {(() => {
            // Hoist outside .map() — determineBestItem is O(N) and calling
            // it inside the loop makes the block O(N²) per render.
            const dynamicBest = determineBestItem(currentGroup)
            return currentGroup.map((item, idx) => {
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
                  onInfoOpen={(item) => setInfoItem(item)}
                  onReviewAction={(id, state) => {
                    const currentState = getItemReviewState(item)
                    if (currentState !== state) {
                      handleToggleKeep(id)
                    }
                  }}
                />
              )
            })
          })()}
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 rounded-lg border border-border bg-card/60 px-3 backdrop-blur-sm">
        {/* Left: Undo Controls */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleUndo}
                disabled={duplicateUndoStack.length === 0}
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
                disabled={duplicateUndoStack.length === 0}
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
                className="gap-2"
                onClick={handleKeepBest}
              >
                <Sparkles className="size-4" />
                Auto-Keep Best
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Auto-Keep Best (Space / Enter)</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Right: Navigation */}
        <div className="flex items-center gap-2">
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

      <MediaInfoDialog
        item={infoItem}
        onClose={() => setInfoItem(null)}
      />
    </div>
  )
}

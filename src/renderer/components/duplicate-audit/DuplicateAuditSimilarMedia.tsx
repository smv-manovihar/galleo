import React, { useMemo, useState, useCallback, useEffect, useRef } from "react"
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
  Rewind,
  FastForward,
  Trash2,
  Bookmark,
} from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { MediaPreview } from "../media/MediaPreview"
import { MediaInfoDialog } from "../media/MediaInfoDialog"
import {
  MediaContextMenu,
  type MediaContextMenuState,
} from "../media/MediaContextMenu"
import { useSessionStore } from "../../stores/session-store"
import {
  DuplicateAuditHistoryDialog,
  type DuplicateAuditHistoryDialogItem,
} from "./DuplicateAuditHistoryDialog"
import { DuplicateAuditCard } from "./DuplicateAuditCard"
import { DuplicateAuditProgressSeeker } from "./DuplicateAuditProgressSeeker"

interface DuplicateAuditSimilarMediaProps {
  groups?: MediaItem[][]
  items?: MediaItem[]
  onComplete?: () => void
  activeGroupIndex: number
  onGroupIndexChange: (
    indexOrUpdater: number | ((prev: number) => number)
  ) => void
}

function getItemAspectRatioClass(item: MediaItem): string {
  let w = item.width
  let h = item.height

  if (!w || !h || w <= 0 || h <= 0) {
    return "aspect-4/3"
  }

  if (item.orientation === 90 || item.orientation === 270) {
    const temp = w
    w = h
    h = temp
  }

  const ratio = w / h

  if (ratio >= 0.9 && ratio <= 1.1) {
    return "aspect-square"
  }
  if (ratio > 1.1) {
    return "aspect-4/3"
  }
  return "aspect-3/4"
}

function compareMediaQuality(a: MediaItem, b: MediaItem): number {
  const scoreA = a.quality?.compositeScore ?? 0
  const scoreB = b.quality?.compositeScore ?? 0
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

  return (b.dateTarget || b.dateAdded || "").localeCompare(a.dateTarget || a.dateAdded || "")
}

export const DuplicateAuditSimilarMedia = React.memo<
  DuplicateAuditSimilarMediaProps
>(({
  groups: groupsProp,
  items,
  onComplete,
  activeGroupIndex,
  onGroupIndexChange,
}) => {
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right")
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null)

  // Extract and group duplicates, sorting items in each group from best to worst
  const duplicateGroups = useMemo(() => {
    let rawGroups: MediaItem[][]
    if (groupsProp && groupsProp.length > 0) {
      rawGroups = groupsProp
    } else {
      const groups: Record<string, MediaItem[]> = {}
      for (const item of items ?? []) {
        if (item.isDuplicate && item.duplicateGroupId) {
          if (!groups[item.duplicateGroupId]) {
            groups[item.duplicateGroupId] = []
          }
          groups[item.duplicateGroupId].push(item)
        }
      }
      rawGroups = Object.keys(groups)
        .sort((a, b) => {
          const countDiff = groups[b].length - groups[a].length
          if (countDiff !== 0) return countDiff
          const sizeB = groups[b].reduce((sum, item) => sum + item.size, 0)
          const sizeA = groups[a].reduce((sum, item) => sum + item.size, 0)
          if (sizeB !== sizeA) return sizeB - sizeA
          return a.localeCompare(b)
        })
        .map((k) => groups[k])
        .filter((g) => g.length > 1)
    }

    return rawGroups.map((group) => [...group].sort(compareMediaQuality))
  }, [groupsProp, items])

  const currentGroup =
    activeGroupIndex < duplicateGroups.length
      ? duplicateGroups[activeGroupIndex]
      : null

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const [activeContextMenu, setActiveContextMenu] =
    useState<MediaContextMenuState | null>(null)

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

  const decisions = useSessionStore((state) => state.decisions)
  const undoStack = useSessionStore((state) => state.undoStack)

  const duplicateUndoStack = useMemo(
    () => undoStack.filter((a) => a.newState.source === "duplicates"),
    [undoStack]
  )

  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isFilterUnreviewedOnly, setIsFilterUnreviewedOnly] = useState(false)

  const currentGroupBest = useMemo(() => {
    if (!currentGroup || currentGroup.length === 0) return null
    return currentGroup[0]
  }, [currentGroup])

  const isCurrentGroupDecided = useMemo(() => {
    if (!currentGroup || currentGroup.length === 0) return true
    for (let i = 0; i < currentGroup.length; i++) {
      const dec = decisions[currentGroup[i].id]
      if (dec !== "keep" && dec !== "delete") {
        return false
      }
    }
    return true
  }, [currentGroup, decisions])

  const getItemReviewState = useCallback(
    (item: MediaItem): "keep" | "delete" | "pending" => {
      const committed = decisions[item.id]
      if (committed === "keep" || committed === "delete") return committed
      if (item.reviewState === "keep" || item.reviewState === "delete") return item.reviewState
      if (currentGroupBest) {
        return item.id === currentGroupBest.id ? "keep" : "delete"
      }
      return "pending"
    },
    [decisions, currentGroupBest]
  )

  // Single-pass bitset calculation for group decision tracking
  const { totalDecidedCount, decidedArray } = useMemo(() => {
    let count = 0
    const total = duplicateGroups.length
    const arr = new Uint8Array(total)

    for (let i = 0; i < total; i++) {
      const g = duplicateGroups[i]
      let isDecided = g.length > 0
      for (let j = 0; j < g.length; j++) {
        const dec = decisions[g[j].id]
        if (dec !== "keep" && dec !== "delete") {
          isDecided = false
          break
        }
      }
      if (isDecided) {
        arr[i] = 1
        count++
      }
    }

    return { totalDecidedCount: count, decidedArray: arr }
  }, [duplicateGroups, decisions])

  const isAllReviewed = totalDecidedCount === duplicateGroups.length && duplicateGroups.length > 0

  const unreviewedIndices = useMemo(() => {
    if (!isFilterUnreviewedOnly) return []
    const indices: number[] = []
    for (let i = 0; i < decidedArray.length; i++) {
      if (decidedArray[i] === 0) {
        indices.push(i)
      }
    }
    return indices
  }, [isFilterUnreviewedOnly, decidedArray])

  // Defer history calculation until history dialog is opened
  const historyItems = useMemo<DuplicateAuditHistoryDialogItem[]>(() => {
    if (!isHistoryOpen || duplicateUndoStack.length === 0) return []

    const idMap = new Map<string, MediaItem>()
    const itemsList = items && items.length > 0 ? items : duplicateGroups.flat()
    for (let i = 0; i < itemsList.length; i++) {
      idMap.set(itemsList[i].id, itemsList[i])
    }

    return duplicateUndoStack.map((action, idx) => {
      const item = idMap.get(action.mediaId)
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
        mediaItem: item,
      }
    })
  }, [isHistoryOpen, duplicateUndoStack, items, duplicateGroups, decisions])

  const handleUndo = useCallback(async () => {
    const store = useSessionStore.getState()
    const dupActions = store.undoStack.filter(
      (a) => a.newState.source === "duplicates"
    )
    if (dupActions.length === 0) return

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

  const ensureCurrentGroupCommitted = useCallback(async () => {
    if (!currentGroup || currentGroup.length === 0 || isCurrentGroupDecided) return
    const bestId = currentGroupBest?.id ?? currentGroup[0].id
    const batchId = `auto_recommend_${Date.now()}`
    const store = useSessionStore.getState()
    const updates = currentGroup.map((item) => {
      const state: "keep" | "delete" = item.id === bestId ? "keep" : "delete"
      const prevState = (store.decisions[item.id] ?? "pending") as "keep" | "delete" | "pending"
      return { mediaId: item.id, state, prevState }
    })
    await store.submitBatchDecisions(updates, "duplicates", batchId)
  }, [currentGroup, isCurrentGroupDecided, currentGroupBest])

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
    if (!currentGroup || currentGroup.length === 0) return
    setSlideDirection("right")
    const bestId = currentGroupBest?.id ?? currentGroup[0].id
    const batchId = `manual_keep_best_${Date.now()}`
    const store = useSessionStore.getState()
    const updates = currentGroup.map((item) => ({
      mediaId: item.id,
      state: (item.id === bestId ? "keep" : "delete") as "keep" | "delete",
      prevState: (store.decisions[item.id] ?? "pending") as "keep" | "delete" | "pending",
    }))
    await store.submitBatchDecisions(updates, "duplicates", batchId)
    onGroupIndexChange((prev) => Math.min(duplicateGroups.length, prev + 1))
  }, [currentGroup, currentGroupBest, onGroupIndexChange, duplicateGroups.length])

  const handleKeepAll = useCallback(async () => {
    if (!currentGroup || currentGroup.length === 0) return
    setSlideDirection("right")
    const batchId = `manual_keep_all_${Date.now()}`
    const store = useSessionStore.getState()
    const updates = currentGroup.map((item) => ({
      mediaId: item.id,
      state: "keep" as "keep" | "delete",
      prevState: (store.decisions[item.id] ?? "pending") as "keep" | "delete" | "pending",
    }))
    await store.submitBatchDecisions(updates, "duplicates", batchId)
    onGroupIndexChange((prev) => Math.min(duplicateGroups.length, prev + 1))
  }, [currentGroup, onGroupIndexChange, duplicateGroups.length])

  const handleDeleteAll = useCallback(async () => {
    if (!currentGroup || currentGroup.length === 0) return
    setSlideDirection("right")
    const batchId = `manual_delete_all_${Date.now()}`
    const store = useSessionStore.getState()
    const updates = currentGroup.map((item) => ({
      mediaId: item.id,
      state: "delete" as "keep" | "delete",
      prevState: (store.decisions[item.id] ?? "pending") as "keep" | "delete" | "pending",
    }))
    await store.submitBatchDecisions(updates, "duplicates", batchId)
    onGroupIndexChange((prev) => Math.min(duplicateGroups.length, prev + 1))
  }, [currentGroup, onGroupIndexChange, duplicateGroups.length])

  const jumpToNextPending = useCallback(async () => {
    if (duplicateGroups.length === 0) return
    await ensureCurrentGroupCommitted()

    // 1. Search forward from activeGroupIndex + 1
    for (let i = activeGroupIndex + 1; i < decidedArray.length; i++) {
      if (decidedArray[i] === 0) {
        setSlideDirection("right")
        onGroupIndexChange(i)
        return
      }
    }

    // 2. Wrap around from 0 to activeGroupIndex
    for (let i = 0; i < activeGroupIndex; i++) {
      if (decidedArray[i] === 0) {
        setSlideDirection("right")
        onGroupIndexChange(i)
        return
      }
    }
  }, [
    duplicateGroups.length,
    ensureCurrentGroupCommitted,
    activeGroupIndex,
    decidedArray,
    onGroupIndexChange,
  ])

  const jumpToPrevPending = useCallback(async () => {
    if (duplicateGroups.length === 0) return
    await ensureCurrentGroupCommitted()

    // 1. Search backward from activeGroupIndex - 1
    for (let i = activeGroupIndex - 1; i >= 0; i--) {
      if (decidedArray[i] === 0) {
        setSlideDirection("left")
        onGroupIndexChange(i)
        return
      }
    }

    // 2. Wrap around from end down to activeGroupIndex
    for (let i = decidedArray.length - 1; i > activeGroupIndex; i--) {
      if (decidedArray[i] === 0) {
        setSlideDirection("left")
        onGroupIndexChange(i)
        return
      }
    }
  }, [
    duplicateGroups.length,
    ensureCurrentGroupCommitted,
    activeGroupIndex,
    decidedArray,
    onGroupIndexChange,
  ])

  const nextGroup = useCallback(async () => {
    setSlideDirection("right")
    await ensureCurrentGroupCommitted()

    if (isFilterUnreviewedOnly && unreviewedIndices.length > 0) {
      const nextIdx = unreviewedIndices.find((idx) => idx > activeGroupIndex)
      if (nextIdx !== undefined) {
        onGroupIndexChange(nextIdx)
        return
      }
      onGroupIndexChange(unreviewedIndices[0])
      return
    }

    onGroupIndexChange((prev) =>
      Math.min(duplicateGroups.length, prev + 1)
    )
  }, [
    ensureCurrentGroupCommitted,
    isFilterUnreviewedOnly,
    unreviewedIndices,
    activeGroupIndex,
    onGroupIndexChange,
    duplicateGroups.length,
  ])

  const prevGroup = useCallback(async () => {
    setSlideDirection("left")
    await ensureCurrentGroupCommitted()

    if (isFilterUnreviewedOnly && unreviewedIndices.length > 0) {
      const prevIdx = [...unreviewedIndices]
        .reverse()
        .find((idx) => idx < activeGroupIndex)
      if (prevIdx !== undefined) {
        onGroupIndexChange(prevIdx)
        return
      }
      onGroupIndexChange(unreviewedIndices[unreviewedIndices.length - 1])
      return
    }

    onGroupIndexChange((prev) => Math.max(0, prev - 1))
  }, [
    ensureCurrentGroupCommitted,
    isFilterUnreviewedOnly,
    unreviewedIndices,
    activeGroupIndex,
    onGroupIndexChange,
  ])

  const handleToggleKeep = useCallback(
    async (itemId: string) => {
      if (!currentGroup) return

      const store = useSessionStore.getState()
      const currentDecisions = store.decisions
      const bestId = currentGroupBest?.id ?? currentGroup[0].id

      const targetItem = currentGroup.find((i) => i.id === itemId)
      if (!targetItem) return

      const existingDec = currentDecisions[itemId]
      const currentItemDecision: "keep" | "delete" =
        existingDec === "keep" || existingDec === "delete"
          ? existingDec
          : targetItem.reviewState === "keep" || targetItem.reviewState === "delete"
            ? targetItem.reviewState
            : itemId === bestId
              ? "keep"
              : "delete"

      const newTargetDecision: "keep" | "delete" =
        currentItemDecision === "keep" ? "delete" : "keep"

      const batchId = `manual_toggle_${Date.now()}`
      const updates = currentGroup.map((gItem) => {
        const isTarget = gItem.id === itemId
        const existing = currentDecisions[gItem.id]
        const state: "keep" | "delete" = isTarget
          ? newTargetDecision
          : existing === "keep" || existing === "delete"
            ? existing
            : gItem.reviewState === "keep" || gItem.reviewState === "delete"
              ? gItem.reviewState
              : gItem.id === bestId
                ? "keep"
                : "delete"
        const prevState = (currentDecisions[gItem.id] ?? "pending") as
          | "keep"
          | "delete"
          | "pending"
        return { mediaId: gItem.id, state, prevState }
      })

      await store.submitBatchDecisions(updates, "duplicates", batchId)
    },
    [currentGroup, currentGroupBest]
  )

  const openPreview = useCallback((item: MediaItem, withAutoPlay = false) => {
    setAutoPlay(withAutoPlay)
    setPreviewItem(item)
  }, [])

  // Stable ref for keyboard events to eliminate listener churn
  const keydownStateRef = useRef({
    currentGroup,
    focusedCardIndex,
    previewItem,
    infoItem,
    isHistoryOpen,
    duplicateUndoStackLength: duplicateUndoStack.length,
    setIsHistoryOpen,
    currentGroupBest,
    handleUndo,
    jumpToNextPending,
    jumpToPrevPending,
    prevGroup,
    nextGroup,
    handleKeepAll,
    handleDeleteAll,
    handleKeepBest,
    handleToggleKeep,
    openPreview,
  })

  useEffect(() => {
    keydownStateRef.current = {
      currentGroup,
      focusedCardIndex,
      previewItem,
      infoItem,
      isHistoryOpen,
      duplicateUndoStackLength: duplicateUndoStack.length,
      setIsHistoryOpen,
      currentGroupBest,
      handleUndo,
      jumpToNextPending,
      jumpToPrevPending,
      prevGroup,
      nextGroup,
      handleKeepAll,
      handleDeleteAll,
      handleKeepBest,
      handleToggleKeep,
      openPreview,
    }
  }, [
    currentGroup,
    focusedCardIndex,
    previewItem,
    infoItem,
    isHistoryOpen,
    duplicateUndoStack.length,
    setIsHistoryOpen,
    currentGroupBest,
    handleUndo,
    jumpToNextPending,
    jumpToPrevPending,
    prevGroup,
    nextGroup,
    handleKeepAll,
    handleDeleteAll,
    handleKeepBest,
    handleToggleKeep,
    openPreview,
  ])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = keydownStateRef.current
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true" ||
        state.previewItem !== null ||
        state.infoItem !== null ||
        state.isHistoryOpen
      ) {
        return
      }

      const key = e.key.toLowerCase()
      const isFocusMode = state.focusedCardIndex !== null
      const cols = 3

      // ── Focus mode ─────────────────────────────────────────────────────────
      if (isFocusMode && state.currentGroup) {
        const len = state.currentGroup.length

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
          if (state.currentGroup[state.focusedCardIndex!]) {
            void state.handleToggleKeep(state.currentGroup[state.focusedCardIndex!].id)
          }
          return
        }

        // Undo: Ctrl+Z / Backspace
        if ((e.ctrlKey && key === "z") || e.key === "Backspace") {
          e.preventDefault()
          void state.handleUndo()
          return
        }

        return
      }

      // ── Normal mode ────────────────────────────────────────────────────────

      // Enter focus mode: F
      if (key === "f" && state.currentGroup) {
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
        void state.handleUndo()
        return
      }

      // Preview best: ↑ / W
      if (e.key === "ArrowUp" || key === "w") {
        e.preventDefault()
        if (state.currentGroupBest) {
          state.openPreview(state.currentGroupBest)
        }
        return
      }

      // Previous group: ← / A
      if (e.key === "ArrowLeft" || key === "a") {
        e.preventDefault()
        void state.prevGroup()
        return
      }

      // Jump to previous unreviewed: Shift+Tab / Shift+N / P
      if ((e.shiftKey && (e.key === "Tab" || key === "n")) || key === "p") {
        e.preventDefault()
        void state.jumpToPrevPending()
        return
      }

      // Jump to next unreviewed: Tab / N
      if (e.key === "Tab" || key === "n") {
        e.preventDefault()
        void state.jumpToNextPending()
        return
      }

      // Next group: → / D
      if (e.key === "ArrowRight" || key === "d") {
        e.preventDefault()
        void state.nextGroup()
        return
      }

      // Auto-Keep Best: Space / Enter
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        void state.handleKeepBest()
        return
      }

      // Keep All: C
      if (key === "c") {
        e.preventDefault()
        void state.handleKeepAll()
        return
      }

      // Delete All: Del / X
      if (e.key === "Delete" || key === "x") {
        e.preventDefault()
        void state.handleDeleteAll()
        return
      }

      // History: H
      if (key === "h" && state.duplicateUndoStackLength > 0) {
        e.preventDefault()
        state.setIsHistoryOpen((prev) => !prev)
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!currentGroup && duplicateGroups.length > 0 && onComplete) {
      onComplete()
    }
  }, [currentGroup, duplicateGroups.length, onComplete])

  const handleReviewAction = useCallback(
    async (id: string, state: "keep" | "delete") => {
      if (!currentGroup) return
      const currentDecision = useSessionStore.getState().decisions[id]
      if (currentDecision !== state) {
        await handleToggleKeep(id)
      }
    },
    [currentGroup, handleToggleKeep]
  )

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

  const groupLength = currentGroup.length
  const isSingleRowLayout = groupLength <= 3

  const gridLayoutClass =
    groupLength === 1
      ? "grid-cols-1 grid-rows-1 h-full"
      : groupLength === 2
        ? "grid-cols-2 grid-rows-1 h-full"
        : "grid-cols-1 sm:grid-cols-3 grid-rows-1 h-full"

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col font-sans text-xs select-none pt-14">
      {/* Progress Seeker */}
      <div className="shrink-0">
        <DuplicateAuditProgressSeeker
          groups={duplicateGroups}
          activeGroupIndex={activeGroupIndex}
          decisions={decisions}
          onSeek={(idx) => onGroupIndexChange(idx)}
          onComplete={onComplete}
          isAllReviewed={isAllReviewed}
          isFilterUnreviewedOnly={isFilterUnreviewedOnly}
          onToggleFilterUnreviewedOnly={setIsFilterUnreviewedOnly}
        />
      </div>

      {/* Cards Grid */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          isSingleRowLayout ? "pb-17 overflow-hidden" : "overflow-y-auto"
        )}
      >
        <div
          key={activeGroupIndex}
          className={cn(
            "grid gap-3 p-2 duration-200 ease-out animate-in fade-in-0",
            isSingleRowLayout
              ? cn("min-h-0 flex-1", gridLayoutClass)
              : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 content-start items-start pb-24",
            slideDirection === "right"
              ? "slide-in-from-right-6"
              : "slide-in-from-left-6"
          )}
        >
          {currentGroup.map((item, idx) => {
            const isBest = currentGroupBest && item.id === currentGroupBest.id
            const reviewState = getItemReviewState(item)
            return (
              <DuplicateAuditCard
                key={item.id}
                item={item}
                isBest={!!isBest}
                reviewState={reviewState}
                isFocused={focusedCardIndex === idx}
                className={
                  isSingleRowLayout
                    ? "h-full min-h-0 w-full min-w-0"
                    : cn("w-full min-w-0", getItemAspectRatioClass(item))
                }
                onClick={handleToggleKeep}
                onPreview={openPreview}
                onContextMenu={handleContextMenu}
              />
            )
          })}
        </div>
      </div>

      {/* Floating Control Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex h-11 items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-2.5 shadow-xl backdrop-blur-xl ring-1 ring-foreground/5">
          {/* Left: Undo Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleUndo}
                  disabled={duplicateUndoStack.length === 0}
                >
                  <Undo2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Undo (↓ / S / Ctrl+Z / Backspace)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setIsHistoryOpen(true)}
                  disabled={duplicateUndoStack.length === 0}
                >
                  <History className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">History (H)</TooltipContent>
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
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDeleteAll}
                  className="cursor-pointer gap-1.5 px-2.5 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/15"
                >
                  <Trash2 className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Delete All</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="sm:hidden">Delete All (Del / X)</span>
                <span className="hidden sm:inline">Del / X</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleKeepAll}
                  className="cursor-pointer gap-1.5 px-2.5 sm:px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/15"
                >
                  <Bookmark className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Keep All</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="sm:hidden">Keep All (C)</span>
                <span className="hidden sm:inline">C</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="lg"
                  className="cursor-pointer gap-1.5 px-2.5 sm:px-3"
                  onClick={handleKeepBest}
                >
                  <Sparkles className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Auto-Keep Best</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="sm:hidden">Auto-Keep Best (Space / Enter)</span>
                <span className="hidden sm:inline">Space / Enter</span>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-border" />

          {/* Right: Navigation */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-primary hover:text-primary/80 hover:bg-primary/10 cursor-pointer"
                  onClick={jumpToPrevPending}
                  disabled={duplicateGroups.length === 0 || totalDecidedCount === duplicateGroups.length}
                >
                  <Rewind className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Jump to previous unreviewed (Shift+Tab / P)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={prevGroup}
                  disabled={activeGroupIndex === 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Previous Group (← / A)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={nextGroup}
                  disabled={activeGroupIndex >= duplicateGroups.length}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {activeGroupIndex === duplicateGroups.length - 1
                  ? "Finish & View Summary"
                  : "Next Group (→ / D)"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-primary hover:text-primary/80 hover:bg-primary/10 cursor-pointer"
                  onClick={jumpToNextPending}
                  disabled={duplicateGroups.length === 0 || totalDecidedCount === duplicateGroups.length}
                >
                  <FastForward className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Jump to next unreviewed (Tab / N)</TooltipContent>
            </Tooltip>
          </div>
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

      <MediaContextMenu
        contextMenu={activeContextMenu}
        onClose={handleCloseContextMenu}
        onPreviewOpen={(item) => openPreview(item, false)}
        onInfoOpen={setInfoItem}
        onReviewAction={handleReviewAction}
      />
    </div>
  )
})

DuplicateAuditSimilarMedia.displayName = "DuplicateAuditSimilarMedia"



import React, { useEffect, useState, useRef, useMemo } from "react"
import { useSessionStore } from "../../stores/session-store"
import type { MediaItem } from "../../../shared/types/media"
import { MediaCullingProgress } from "./MediaCullingProgress"
import { MediaCullingCard } from "./MediaCullingCard"
import { MediaCullingControls } from "./MediaCullingControls"
import { MediaPreview } from "../media/MediaPreview"

interface MediaCullingModeProps {
  items: MediaItem[]
  onComplete: () => void
  onlyShowFlagged: boolean
  onOnlyShowFlaggedChange: (checked: boolean) => void
}

/** How many stacked cards visible behind the top card */
const DECK_SIZE = 3

/** Inline Hamming distance on hex pHash strings (renderer cannot import from main). */
function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity
  const NIBBLE = new Uint8Array([0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4])
  let d = 0
  for (let i = 0; i < a.length; i++) {
    d += NIBBLE[parseInt(a[i], 16) ^ parseInt(b[i], 16)]
  }
  return d
}

/**
 * Greedy nearest-neighbor sort: re-orders items so that each consecutive pair
 * has the smallest possible Hamming distance. Items without a hash are appended
 * at the end in their original relative order. This creates a smooth visual
 * gradient through the queue — no threshold, no hard groups.
 */
function sortBySimilarity(items: MediaItem[]): MediaItem[] {
  const hashed = items.filter((i) => !!i.hash)
  const unhashed = items.filter((i) => !i.hash)
  if (hashed.length === 0) return items

  const visited = new Uint8Array(hashed.length)
  const result: MediaItem[] = []

  let currentIdx = 0
  visited[currentIdx] = 1
  result.push(hashed[currentIdx])

  for (let step = 1; step < hashed.length; step++) {
    const currentHash = hashed[currentIdx].hash!
    let bestIdx = -1
    let bestDist = Infinity
    for (let j = 0; j < hashed.length; j++) {
      if (visited[j]) continue
      const dist = hammingDistance(currentHash, hashed[j].hash!)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = j
      }
    }
    currentIdx = bestIdx
    visited[currentIdx] = 1
    result.push(hashed[currentIdx])
  }

  return [...result, ...unhashed]
}

export const MediaCullingMode: React.FC<MediaCullingModeProps> = ({
  items,
  onComplete,
  onlyShowFlagged,
  onOnlyShowFlaggedChange,
}) => {
  const { submitDecision, undo, undoStack, decisions } = useSessionStore()

  const [swipeClass, setSwipeClass] = useState<
    "slide-left" | "slide-right" | ""
  >("")
  const [showPreview, setShowPreview] = useState(false)
  const [restoringItem, setRestoringItem] = useState<{
    id: string
    direction: "left" | "right"
  } | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const videoPlayerRef = useRef<any>(null)
  const [recentlyUndoneIds, setRecentlyUndoneIds] = useState<string[]>([])
  const pendingActionRef = useRef<{
    timeoutId: ReturnType<typeof setTimeout>
    targetId: string
    state: "keep" | "delete"
    item: MediaItem
  } | null>(null)

  const prevUnreviewedCountRef = useRef(0)

  const filteredItems = useMemo(() => {
    const base = onlyShowFlagged
      ? items.filter(
          (item) =>
            item.isDuplicate ||
            (item.quality !== undefined &&
              (item.quality.isBlurry ||
                item.quality.isDark ||
                item.quality.isScreenshot ||
                item.quality.isSmall))
        )
      : items
    return sortBySimilarity(base)
  }, [items, onlyShowFlagged])

  const unreviewedItems = useMemo(() => {
    const pending = filteredItems.filter(
      (item) =>
        decisions[item.id] === undefined &&
        (!item.reviewState || item.reviewState === "pending")
    )
    const undoneSet = new Set(recentlyUndoneIds)
    const undoneItemsOrdered = recentlyUndoneIds
      .map((id) => pending.find((item) => item.id === id))
      .filter((item): item is MediaItem => !!item)
    const otherPending = pending.filter((item) => !undoneSet.has(item.id))
    return [...undoneItemsOrdered, ...otherPending]
  }, [filteredItems, decisions, recentlyUndoneIds])

  const lastReviewedItem = useMemo(() => {
    const cullingActions = undoStack.filter(
      (a) => a.newState.source === "culling"
    )
    if (cullingActions.length > 0) {
      const lastAction = cullingActions[cullingActions.length - 1]
      const found = filteredItems.find((i) => i.id === lastAction.mediaId)
      if (found) return found
    }
    return filteredItems.length > 0
      ? filteredItems[filteredItems.length - 1]
      : items[items.length - 1] || null
  }, [undoStack, items, filteredItems])

  const currentItem =
    unreviewedItems.length > 0 ? unreviewedItems[0] : lastReviewedItem

  useEffect(() => {
    setIsVideoPlaying(false)
  }, [currentItem?.id])

  useEffect(() => {
    if (restoringItem) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setRestoringItem(null)
        })
      })
      return () => cancelAnimationFrame(id)
    }
  }, [restoringItem])

  // Deck: current + next few for stacked visuals
  const deckItems = useMemo(() => {
    if (unreviewedItems.length > 0) {
      return unreviewedItems.slice(0, DECK_SIZE)
    }
    return lastReviewedItem ? [lastReviewedItem] : []
  }, [unreviewedItems, lastReviewedItem])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === "z" || e.key === "ArrowDown" || (e.ctrlKey && key === "z")) {
        e.preventDefault()
        await handleUndo()
        return
      }

      if (!currentItem || swipeClass !== "") return

      if (key === "d" || e.key === "ArrowLeft") {
        e.preventDefault()
        await handleAction("delete")
      } else if (key === "k" || e.key === "ArrowRight") {
        e.preventDefault()
        await handleAction("keep")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentItem, swipeClass, undoStack])

  const handleAction = async (state: "keep" | "delete") => {
    if (!currentItem) return

    const isLastItem = unreviewedItems.length <= 1

    // If there's a pending swipe timer running, commit it immediately before starting new action
    if (pendingActionRef.current) {
      clearTimeout(pendingActionRef.current.timeoutId)
      const pending = pendingActionRef.current
      pendingActionRef.current = null
      await submitDecision(
        pending.targetId,
        pending.state,
        pending.item,
        "culling"
      )
      setRecentlyUndoneIds((prev) =>
        prev.filter((id) => id !== pending.targetId)
      )
    }

    if (state === "keep") {
      setSwipeClass("slide-right")
    } else {
      setSwipeClass("slide-left")
    }

    const targetId = currentItem.id
    const targetItem = currentItem

    const timeoutId = setTimeout(async () => {
      pendingActionRef.current = null
      await submitDecision(targetId, state, targetItem, "culling")
      setRecentlyUndoneIds((prev) => prev.filter((id) => id !== targetId))
      setSwipeClass("")
      if (isLastItem) {
        onComplete()
      }
    }, 400)

    pendingActionRef.current = { timeoutId, targetId, state, item: targetItem }
  }

  const handleUndo = async () => {
    // 1. If a card swipe animation is currently pending, cancel it immediately!
    if (pendingActionRef.current) {
      clearTimeout(pendingActionRef.current.timeoutId)
      pendingActionRef.current = null
      setSwipeClass("")
      return
    }

    // 2. Otherwise pop the last committed action from sessionStore undoStack
    const cullingActions = undoStack.filter(
      (a) => a.newState.source === "culling"
    )
    if (cullingActions.length === 0) return

    // Determine which direction the card should slide back from
    const lastAction = cullingActions[cullingActions.length - 1]
    const direction = lastAction.type === "mark-keep" ? "right" : "left"

    setSwipeClass("")

    const success = await undo("culling")
    if (success) {
      setRestoringItem({ id: lastAction.mediaId, direction })
      setRecentlyUndoneIds((prev) => [lastAction.mediaId, ...prev])
    }
  }

  /** Override the decisions for past actions without undoing the stack position */
  const handleBulkChangeDecisions = async (
    mediaIds: string[],
    newDecision: "keep" | "delete"
  ) => {
    const store = useSessionStore.getState()
    const checkpoint = store.checkpoint
    if (!checkpoint) return

    const decisions = { ...store.decisions }
    const mediaIdSet = new Set(mediaIds)

    const updatedUndoStack = store.undoStack.map((a) => {
      if (mediaIdSet.has(a.mediaId)) {
        decisions[a.mediaId] = newDecision
        return {
          ...a,
          type:
            newDecision === "keep"
              ? ("mark-keep" as const)
              : ("mark-delete" as const),
          newState: { ...a.newState, reviewState: newDecision },
        }
      }
      return a
    })

    const updatedCheckpoint = {
      ...checkpoint,
      decisions,
      savedAt: new Date().toISOString(),
    }

    useSessionStore.setState({
      decisions,
      checkpoint: { ...updatedCheckpoint, undoStack: updatedUndoStack },
      undoStack: updatedUndoStack,
    })

    await window.api.saveSessionCheckpoint({
      ...updatedCheckpoint,
      undoStack: updatedUndoStack,
    })

    const reviewsToUpdate = mediaIds.map((mediaId) => ({
      mediaId,
      state: newDecision,
    }))
    await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate)
    setRecentlyUndoneIds((prev) => prev.filter((id) => !mediaIdSet.has(id)))
  }

  // Initialize ref with initial count of unreviewed items upon mounting
  useEffect(() => {
    prevUnreviewedCountRef.current = unreviewedItems.length
  }, [])

  useEffect(() => {
    // Only auto-complete if the count transitioned from > 0 to 0
    if (
      prevUnreviewedCountRef.current > 0 &&
      unreviewedItems.length === 0 &&
      items.length > 0
    ) {
      onComplete()
    }
    prevUnreviewedCountRef.current = unreviewedItems.length
  }, [unreviewedItems.length, items.length, onComplete])

  const progress = useMemo(() => {
    const cullingDecidedIds = new Set<string>()
    const lastSourceMap = new Map<string, string>()
    for (const action of undoStack) {
      const source = action.newState.source
      if (source) {
        lastSourceMap.set(action.mediaId, source)
      }
    }

    for (const [mediaId, decision] of Object.entries(decisions)) {
      if (decision && lastSourceMap.get(mediaId) === "culling") {
        cullingDecidedIds.add(mediaId)
      }
    }

    const cullingItems = items.filter((item) => {
      const hasDecision =
        decisions[item.id] !== undefined || item.reviewState !== "pending"
      if (!hasDecision) return true
      return cullingDecidedIds.has(item.id)
    })

    const total = cullingItems.length
    const reviewed = cullingItems.filter((item) =>
      cullingDecidedIds.has(item.id)
    ).length
    const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0

    return { reviewed, total, percentage }
  }, [items, decisions, undoStack])

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden px-6 pt-4 pb-6 font-sans text-xs select-none md:pb-8">
      <MediaCullingProgress
        reviewed={progress.reviewed}
        total={progress.total}
        percentage={progress.percentage}
        onlyShowFlagged={onlyShowFlagged}
        onOnlyShowFlaggedChange={onOnlyShowFlaggedChange}
        onViewSummary={onComplete}
      />

      {/* Swipeable Card Deck Viewport (Layered OVER controls) */}
      <div
        className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center py-2"
        style={{ overflow: "visible" }}
      >
        {[...deckItems].reverse().map((item, reverseIdx) => {
          const deckIndex = deckItems.length - 1 - reverseIdx
          const isTopCard = deckIndex === 0

          return (
            <MediaCullingCard
              key={item.id}
              item={item}
              deckIndex={deckIndex}
              isTopCard={isTopCard}
              swipeClass={isTopCard ? swipeClass : undefined}
              restoringDirection={
                restoringItem?.id === item.id ? restoringItem.direction : null
              }
              isVideoPlaying={isVideoPlaying}
              videoPlayerRef={videoPlayerRef}
              onDoubleClick={() => setShowPreview(true)}
              onFullscreen={() => setShowPreview(true)}
              onPlayStateChange={setIsVideoPlaying}
              onSwipeComplete={async (action) => {
                const isLastItem = unreviewedItems.length <= 1
                await submitDecision(item.id, action, item, "culling")
                setRecentlyUndoneIds((prev) =>
                  prev.filter((id) => id !== item.id)
                )
                if (isLastItem) {
                  onComplete()
                }
              }}
            />
          )
        })}
      </div>

      <MediaCullingControls
        undoStack={undoStack}
        allItems={items}
        onUndo={handleUndo}
        onDelete={() => handleAction("delete")}
        onKeep={() => handleAction("keep")}
        onBulkChangeDecisions={handleBulkChangeDecisions}
      />

      <MediaPreview
        item={showPreview ? currentItem : null}
        onClose={() => setShowPreview(false)}
      />
    </div>
  )
}

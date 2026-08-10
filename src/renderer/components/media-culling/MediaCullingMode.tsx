import React, { useEffect, useState, useRef, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { useSessionStore } from "../../stores/session-store"
import type { MediaItem } from "../../../shared/types/media"
import { MediaCullingProgress } from "./MediaCullingProgress"
import { MediaCullingCard } from "./MediaCullingCard"
import { MediaCullingControls } from "./MediaCullingControls"
import { MediaPreview } from "../media/MediaPreview"
import { getSimilaritySortedItems } from "../../lib/similarity"

interface MediaCullingModeProps {
  items: MediaItem[]
  onComplete: () => void
  onlyShowFlagged: boolean
  onOnlyShowFlaggedChange: (checked: boolean) => void
}

/** How many stacked cards visible behind the top card */
const DECK_SIZE = 3

export const MediaCullingMode: React.FC<MediaCullingModeProps> = ({
  items,
  onComplete,
  onlyShowFlagged,
  onOnlyShowFlaggedChange,
}) => {
  const { submitDecision, undo, undoStack, decisions, bulkChangeDecisions } = useSessionStore()

  const [swipeClass, setSwipeClass] = useState<
    "slide-left" | "slide-right" | ""
  >("")
  const [showPreview, setShowPreview] = useState(false)
  const [restoringItem, setRestoringItem] = useState<{
    id: string
    direction: "left" | "right"
  } | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null)

  const [animatingOutId, setAnimatingOutId] = useState<string | null>(null)
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isProcessing, setIsProcessing] = useState(true)
  const [sortedItems, setSortedItems] = useState<MediaItem[]>([])

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      if (!active) return
      const sorted = getSimilaritySortedItems(items)
      React.startTransition(() => {
        setSortedItems(sorted)
        setIsProcessing(false)
      })
    }, 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [items])

  const filteredItems = useMemo(() => {
    if (onlyShowFlagged) {
      return sortedItems.filter(
        (item) =>
          item.isDuplicate ||
          (item.quality !== undefined &&
            (item.quality.compositeScore < 50 ||
              item.quality.isBlurry ||
              item.quality.isDark ||
              item.quality.isScreenshot ||
              item.quality.isSmall))
      )
    }
    return sortedItems
  }, [sortedItems, onlyShowFlagged])

  const unreviewedItems = useMemo(() =>
    filteredItems.filter((item) => decisions[item.id] === undefined),
    [filteredItems, decisions]
  )

  const currentItem = unreviewedItems.length > 0 ? unreviewedItems[0] : null

  /** Commits a decision immediately to the store and triggers visual exit animation. */
  const commitAction = (item: MediaItem, state: "keep" | "delete") => {
    setIsVideoPlaying(false)

    // Snap any in-progress animation immediately so the deck doesn't stall
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
      setAnimatingOutId(null)
      setSwipeClass("")
    }

    const isLastItem = unreviewedItems.length <= 1

    // Commit to store immediately — unreviewedItems updates on next render
    void submitDecision(item.id, state, item, "culling")

    // Visual exit animation (purely presentational)
    setAnimatingOutId(item.id)
    setSwipeClass(state === "keep" ? "slide-right" : "slide-left")

    animationTimerRef.current = setTimeout(() => {
      animationTimerRef.current = null
      setAnimatingOutId(null)
      setSwipeClass("")
      if (isLastItem) onComplete()
    }, 300)
  }

  const handleAction = (state: "keep" | "delete") => {
    const item = unreviewedItems[0]
    if (!item) return
    commitAction(item, state)
  }

  const handleUndo = async () => {
    setIsVideoPlaying(false)

    if (animationTimerRef.current) {
      // Decision was already committed — cancel animation and undo it
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
      setAnimatingOutId(null)
      setSwipeClass("")
      await undo("culling")
      return
    }

    const cullingActions = undoStack.filter(
      (a) => a.newState.source === "culling"
    )
    if (cullingActions.length === 0) return

    const lastAction = cullingActions[cullingActions.length - 1]
    const direction = lastAction.type === "mark-keep" ? "right" : "left"

    const success = await undo("culling")
    if (success) {
      setRestoringItem({ id: lastAction.mediaId, direction })
    }
  }

  const handleKeyDownRef = useRef<(e: KeyboardEvent) => Promise<void> | void>(() => {})

  useEffect(() => {
    if (restoringItem) {
      const timer = setTimeout(() => {
        setRestoringItem(null)
      }, 40)
      return () => clearTimeout(timer)
    }
  }, [restoringItem])

  // Cleanup animation timer on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current)
      }
    }
  }, [])

  // Deck: current + next few for stacked visuals. Inject animating-out card at front.
  const deckItems = useMemo(() => {
    if (animatingOutId) {
      const animatingItem = sortedItems.find((i) => i.id === animatingOutId)
      if (animatingItem) {
        return [animatingItem, ...unreviewedItems.slice(0, DECK_SIZE - 1)]
      }
    }
    return unreviewedItems.slice(0, DECK_SIZE)
  }, [unreviewedItems, animatingOutId, sortedItems])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Undo: ↓ / S / Ctrl+Z / Backspace
      if (
        e.key === "ArrowDown" ||
        key === "s" ||
        (e.ctrlKey && key === "z") ||
        e.key === "Backspace"
      ) {
        e.preventDefault()
        await handleUndo()
        return
      }

      if (!currentItem) return

      // Preview: ↑ / W
      if (e.key === "ArrowUp" || key === "w") {
        e.preventDefault()
        setShowPreview(true)
        return
      }

      if (e.key === "ArrowLeft" || key === "a" || e.key === "Delete") {
        e.preventDefault()
        handleAction("delete")
        return
      }

      // Keep: → / D / Enter
      if (e.key === "ArrowRight" || key === "d" || e.key === "Enter") {
        e.preventDefault()
        handleAction("keep")
        return
      }
    }

    handleKeyDownRef.current = handleKeyDown
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyDownRef.current(e)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])


  const progress = useMemo(() => {
    const total = filteredItems.length
    const reviewed = filteredItems.filter(
      (item) => decisions[item.id] !== undefined
    ).length
    const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0
    return { reviewed, total, percentage }
  }, [filteredItems, decisions])

  // Auto-complete when all items reviewed (guard against firing during animation)
  const prevUnreviewedCountRef = useRef(unreviewedItems.length)
  useEffect(() => {
    if (
      prevUnreviewedCountRef.current > 0 &&
      unreviewedItems.length === 0 &&
      items.length > 0 &&
      animatingOutId === null
    ) {
      onComplete()
    }
    prevUnreviewedCountRef.current = unreviewedItems.length
  }, [unreviewedItems.length, items.length, onComplete, animatingOutId])

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

      {/* Swipeable Card Deck Viewport */}
      <div
        className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center py-2"
        style={{ overflow: "visible" }}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground animate-pulse">
            <div className="relative flex h-64 w-80 max-w-full items-center justify-center rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md shadow-inner">
              <Loader2 className="h-7 w-7 animate-spin text-primary/70" />
            </div>
            <span className="text-2xs font-medium tracking-wide text-muted-foreground/80">
              Preparing media deck...
            </span>
          </div>
        ) : (
          [...deckItems].reverse().map((item, reverseIdx) => {
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
                onSwipeComplete={(action) => commitAction(item, action)}
              />
            )
          })
        )}
      </div>

      <MediaCullingControls
        undoStack={undoStack}
        allItems={items}
        onUndo={handleUndo}
        onDelete={() => handleAction("delete")}
        onKeep={() => handleAction("keep")}
        onBulkChangeDecisions={bulkChangeDecisions}
      />

      <MediaPreview
        item={showPreview ? currentItem : null}
        onClose={() => setShowPreview(false)}
      />
    </div>
  )
}

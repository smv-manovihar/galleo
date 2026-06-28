import React, { useEffect, useState, useRef, useMemo } from "react"
import { useSessionStore } from "../../stores/session-store"
import type { MediaItem } from "../../../shared/types/media"
import { Check } from "lucide-react"
import { ReviewProgress } from "./ReviewProgress"
import { ReviewCard } from "./ReviewCard"
import { ReviewControls } from "./ReviewControls"
import { MediaPreview } from "../media/MediaPreview"

interface ReviewModeProps {
  items: MediaItem[]
  onComplete: () => void
}

/** How many stacked cards visible behind the top card */
const DECK_SIZE = 3
const CARD_WIDTH = 568

export const ReviewMode: React.FC<ReviewModeProps> = ({
  items,
  onComplete,
}) => {
  const { submitDecision, undo, undoStack } = useSessionStore()
  const decisions = useSessionStore(state => state.decisions)

  const [swipeClass, setSwipeClass] = useState<
    "slide-left" | "slide-right" | ""
  >("")
  const [showPreview, setShowPreview] = useState(false)
  const [restoringDirection, setRestoringDirection] = useState<
    "left" | "right" | null
  >(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const videoPlayerRef = useRef<any>(null)

  const unreviewedItems = useMemo(() => {
    return items.filter(item => decisions[item.id] === undefined && item.reviewState === 'pending');
  }, [items, decisions]);

  const initialUnreviewedCount = useRef<number | null>(null)
  const lastItemsRef = useRef<MediaItem[]>(items)

  if (initialUnreviewedCount.current === null || lastItemsRef.current !== items) {
    initialUnreviewedCount.current = unreviewedItems.length
    lastItemsRef.current = items
  }

  const currentItem = unreviewedItems.length > 0 ? unreviewedItems[0] : null

  useEffect(() => {
    setIsVideoPlaying(false)
  }, [currentItem?.id])

  useEffect(() => {
    if (restoringDirection) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setRestoringDirection(null)
        })
      })
      return () => cancelAnimationFrame(id)
    }
  }, [restoringDirection])

  // Pointer dragging states
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Deck: current + next few for stacked visuals
  const deckItems = useMemo(() => {
    return unreviewedItems.slice(0, DECK_SIZE)
  }, [unreviewedItems])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!currentItem || swipeClass !== "") return

      const key = e.key.toLowerCase()
      if (key === "z" || (e.ctrlKey && key === "z")) {
        e.preventDefault()
        await handleUndo()
        return
      }

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
  }, [currentItem, swipeClass])

  const handleAction = async (state: "keep" | "delete") => {
    if (!currentItem) return

    if (state === "keep") {
      setSwipeClass("slide-right")
    } else {
      setSwipeClass("slide-left")
    }

    setTimeout(async () => {
      await submitDecision(currentItem.id, state, currentItem)
      setSwipeClass("")
      setDragOffset({ x: 0, y: 0 })
    }, 400)
  }

  const handleUndo = async () => {
    if (undoStack.length === 0) return

    // Determine which direction the card should slide back from
    const lastAction = undoStack[undoStack.length - 1]
    const direction = lastAction.type === "mark-keep" ? "right" : "left"

    setSwipeClass("")
    setDragOffset({ x: 0, y: 0 })
    setRestoringDirection(direction)

    await undo()
  }

  /** Override the decisions for past actions without undoing the stack position */
  const handleBulkChangeDecisions = async (mediaIds: string[], newDecision: "keep" | "delete") => {
    const store = useSessionStore.getState()
    const checkpoint = store.checkpoint
    if (!checkpoint) return

    const decisions = { ...store.decisions }
    const mediaIdSet = new Set(mediaIds)

    const updatedUndoStack = store.undoStack.map(a => {
      if (mediaIdSet.has(a.mediaId)) {
        decisions[a.mediaId] = newDecision
        return {
          ...a,
          type: newDecision === "keep" ? ("mark-keep" as const) : ("mark-delete" as const),
          newState: { reviewState: newDecision },
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

    await window.api.saveSessionCheckpoint({ ...updatedCheckpoint, undoStack: updatedUndoStack })
    
    const reviewsToUpdate = mediaIds.map(mediaId => ({ mediaId, state: newDecision }))
    await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate)
  }

  // Pointer drag gesture refs
  const pointerIdRef = useRef<number>(-1)
  const hasCapturedRef = useRef<boolean>(false)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || swipeClass !== "") return

    const target = e.target as HTMLElement
    if (
      target.closest("button") ||
      target.closest(".slider") ||
      target.closest('[role="slider"]') ||
      target.closest('[data-slot="slider"]')
    ) {
      return
    }

    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setDragOffset({ x: 0, y: 0 })
    pointerIdRef.current = e.pointerId
    hasCapturedRef.current = false
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    if (!hasCapturedRef.current && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
      try {
        e.currentTarget.setPointerCapture(pointerIdRef.current)
      } catch (err) {
        // Ignore capture errors
      }
      hasCapturedRef.current = true
    }

    if (hasCapturedRef.current) {
      setDragOffset({ x: dx, y: dy })
    }
  }

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)

    if (hasCapturedRef.current) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current)
      } catch (err) {
        // Ignore
      }

      const thresholdX = 120

      if (dragOffset.x > thresholdX) {
        await handleAction("keep")
      } else if (dragOffset.x < -thresholdX) {
        await handleAction("delete")
      } else {
        setDragOffset({ x: 0, y: 0 })
      }
    }
    hasCapturedRef.current = false
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    if (hasCapturedRef.current) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current)
      } catch (err) {
        // Ignore
      }
    }
    setDragOffset({ x: 0, y: 0 })
    hasCapturedRef.current = false
  }

  useEffect(() => {
    if (items.length > 0 && unreviewedItems.length === 0) {
      onComplete()
    }
  }, [unreviewedItems.length, items.length, onComplete])

  if (!currentItem) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 font-sans text-xs select-none">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10 text-green-500">
          <Check className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h4 className="font-heading text-sm font-bold text-foreground">
            All files reviewed!
          </h4>
          <p className="mt-1 text-muted-foreground">
            Click below to commit marked deletions or clear results.
          </p>
        </div>
      </div>
    )
  }

  const progress = {
    reviewed: Math.max(0, (initialUnreviewedCount.current ?? unreviewedItems.length) - unreviewedItems.length),
    total: initialUnreviewedCount.current ?? unreviewedItems.length,
    percentage: (initialUnreviewedCount.current ?? unreviewedItems.length) > 0 
      ? Math.round((Math.max(0, (initialUnreviewedCount.current ?? unreviewedItems.length) - unreviewedItems.length) / (initialUnreviewedCount.current ?? unreviewedItems.length)) * 100) 
      : 0
  };

  // Stamp overlay direction opacity calculations
  const thresholdX = 120
  let keepOpacity = 0
  let deleteOpacity = 0

  if (isDragging) {
    if (dragOffset.x > 20) {
      keepOpacity = Math.min((dragOffset.x - 20) / (thresholdX - 20), 1)
    } else if (dragOffset.x < -20) {
      deleteOpacity = Math.min(
        (Math.abs(dragOffset.x) - 20) / (thresholdX - 20),
        1
      )
    }
  }

  /** Style for each card in the deck stack */
  const getCardStyle = (deckIndex: number): React.CSSProperties => {
    if (deckIndex === 0) {
      // Top card — responds to drag/swipe
      if (isDragging) {
        return {
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.06}deg)`,
          transition: "none",
          cursor: "grabbing",
        }
      }
      if (restoringDirection === "left") {
        return {
          transform: "translate(-150%, 60px) rotate(-25deg)",
          transition: "none",
          opacity: 0,
        }
      }
      if (restoringDirection === "right") {
        return {
          transform: "translate(150%, 60px) rotate(25deg)",
          transition: "none",
          opacity: 0,
        }
      }
      if (swipeClass === "slide-left") {
        return {
          transform: "translate(-150%, 60px) rotate(-25deg)",
          transition:
            "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
          opacity: 0,
        }
      }
      if (swipeClass === "slide-right") {
        return {
          transform: "translate(150%, 60px) rotate(25deg)",
          transition:
            "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
          opacity: 0,
        }
      }
      return {
        transform: "translate(0, 0) rotate(0deg) scale(1)",
        transition:
          "transform 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease",
        cursor: "grab",
      }
    }

    // Background deck cards — slightly smaller and offset upward to peek out from the top
    const SCALE_STEP = 0.04
    const scale = 1 - deckIndex * SCALE_STEP

    // Calculate translateY such that each card peeks out exactly 12px from the top
    const cardHeight = CARD_WIDTH * 1.25
    const peekSize = 12
    const translateY = deckIndex * (-cardHeight / 2 * SCALE_STEP - peekSize)

    const opacity = 1 - deckIndex * 0.35

    let filter = "none"
    if (deckIndex === 1) {
      filter = "brightness(0.45) contrast(0.9) saturate(0.6)"
    } else if (deckIndex === 2) {
      filter = "brightness(0.3) contrast(0.8) saturate(0.4)"
    }

    return {
      transform: `translateY(${translateY}px) scale(${scale})`,
      transition:
        "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), filter 400ms cubic-bezier(0.4, 0, 0.2, 1)",
      pointerEvents: "none" as const,
      opacity: opacity,
      filter: filter,
    }
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col gap-4 font-sans text-xs select-none"
    >
      <ReviewProgress
        reviewed={progress.reviewed}
        total={progress.total}
        percentage={progress.percentage}
      />

      {/* Swipeable Card Deck Viewport */}
      <div
        className="relative flex min-h-0 w-full flex-1 items-center justify-center"
        style={{ overflow: "visible" }}
      >
        {[...deckItems].reverse().map((item, reverseIdx) => {
          const deckIndex = deckItems.length - 1 - reverseIdx
          const isTopCard = deckIndex === 0

          return (
            <ReviewCard
              key={item.id}
              item={item}
              deckIndex={deckIndex}
              style={getCardStyle(deckIndex)}
              isTopCard={isTopCard}
              keepOpacity={keepOpacity}
              deleteOpacity={deleteOpacity}
              isVideoPlaying={isVideoPlaying}
              videoPlayerRef={videoPlayerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onDoubleClick={() => setShowPreview(true)}
              onFullscreen={() => setShowPreview(true)}
              onPlayStateChange={setIsVideoPlaying}
            />
          )
        })}
      </div>

      <ReviewControls
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

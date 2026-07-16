import React, { useEffect, useState, useRef, useMemo } from "react"
import { useSessionStore } from "../../stores/session-store"
import type { MediaItem } from "../../../shared/types/media"
import { CheckCircle2 } from "lucide-react"
import { MediaCullingProgress } from "./MediaCullingProgress"
import { MediaCullingCard } from "./MediaCullingCard"
import { MediaCullingControls } from "./MediaCullingControls"
import { MediaPreview } from "../media/MediaPreview"
import { Button } from "@/components/ui/button"

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


  const unreviewedItems = useMemo(() => {
    const pending = items.filter(item => decisions[item.id] === undefined && item.reviewState === 'pending');
    const undoneSet = new Set(recentlyUndoneIds);
    const undoneItemsOrdered = recentlyUndoneIds
      .map(id => pending.find(item => item.id === id))
      .filter((item): item is MediaItem => !!item);
    const otherPending = pending.filter(item => !undoneSet.has(item.id));
    return [...undoneItemsOrdered, ...otherPending];
  }, [items, decisions, recentlyUndoneIds]);

  const currentItem = unreviewedItems.length > 0 ? unreviewedItems[0] : null

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

    const targetId = currentItem.id;
    setTimeout(async () => {
      await submitDecision(targetId, state, currentItem, 'culling')
      setRecentlyUndoneIds(prev => prev.filter(id => id !== targetId))
      setSwipeClass("")
    }, 400)
  }

  const handleUndo = async () => {
    const cullingActions = undoStack.filter(a => a.newState.source === 'culling');
    if (cullingActions.length === 0) return

    // Determine which direction the card should slide back from
    const lastAction = cullingActions[cullingActions.length - 1]
    const direction = lastAction.type === "mark-keep" ? "right" : "left"

    setSwipeClass("")

    const success = await undo('culling')
    if (success) {
      setRestoringItem({ id: lastAction.mediaId, direction })
      setRecentlyUndoneIds(prev => [lastAction.mediaId, ...prev])
    }
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

    await window.api.saveSessionCheckpoint({ ...updatedCheckpoint, undoStack: updatedUndoStack })
    
    const reviewsToUpdate = mediaIds.map(mediaId => ({ mediaId, state: newDecision }))
    await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate)
    setRecentlyUndoneIds(prev => prev.filter(id => !mediaIdSet.has(id)))
  }

  useEffect(() => {
    if (items.length > 0 && unreviewedItems.length === 0) {
      onComplete()
    }
  }, [unreviewedItems.length, items.length, onComplete])

  if (!currentItem) {
    const keptCount = Object.values(decisions).filter(s => s === 'keep').length;
    const deletedCount = Object.values(decisions).filter(s => s === 'delete').length;

    return (
      <div className="flex h-full flex-col items-center justify-center font-sans select-none px-8 animate-in fade-in duration-400">
        <div className="w-full max-w-sm border border-border bg-card rounded-2xl shadow-sm p-8 flex flex-col items-center gap-6 text-center">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>

          {/* Copy */}
          <div className="space-y-1.5">
            <h3 className="font-heading text-sm font-bold text-foreground tracking-tight">Culling complete</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
              Every file has been reviewed. Head to the summary to commit your decisions.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 w-full text-xs">
            <div className="rounded-xl border border-green-500/15 bg-green-500/5 py-3 text-center">
              <div className="font-heading font-bold text-lg text-green-600 dark:text-green-400 tabular-nums">{keptCount}</div>
              <div className="text-2xs text-green-600/60 dark:text-green-400/60 font-semibold uppercase tracking-wider mt-0.5">Kept</div>
            </div>
            <div className="rounded-xl border border-destructive/15 bg-destructive/5 py-3 text-center">
              <div className="font-heading font-bold text-lg text-destructive tabular-nums">{deletedCount}</div>
              <div className="text-2xs text-destructive/60 font-semibold uppercase tracking-wider mt-0.5">To Delete</div>
            </div>
          </div>

          {/* CTA */}
          <Button
            size="sm"
            className="w-full h-9 text-xs gap-1.5 cursor-pointer"
            onClick={onComplete}
          >
            View Summary
          </Button>
        </div>
      </div>
    )
  }

  const progress = useMemo(() => {
    const cullingDecidedIds = new Set<string>();
    const lastSourceMap = new Map<string, string>();
    for (const action of undoStack) {
      const source = action.newState.source;
      if (source) {
        lastSourceMap.set(action.mediaId, source);
      }
    }

    for (const [mediaId, decision] of Object.entries(decisions)) {
      if (decision && lastSourceMap.get(mediaId) === 'culling') {
        cullingDecidedIds.add(mediaId);
      }
    }

    const cullingItems = items.filter(item => {
      const hasDecision = decisions[item.id] !== undefined || item.reviewState !== 'pending';
      if (!hasDecision) return true;
      return cullingDecidedIds.has(item.id);
    });

    const total = cullingItems.length;
    const reviewed = cullingItems.filter(item => cullingDecidedIds.has(item.id)).length;
    const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    return { reviewed, total, percentage };
  }, [items, decisions, undoStack]);

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col gap-4 font-sans text-xs select-none"
    >
      <MediaCullingProgress
        reviewed={progress.reviewed}
        total={progress.total}
        percentage={progress.percentage}
        onlyShowFlagged={onlyShowFlagged}
        onOnlyShowFlaggedChange={onOnlyShowFlaggedChange}
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
                await submitDecision(item.id, action, item, 'culling')
                setRecentlyUndoneIds(prev => prev.filter(id => id !== item.id))
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

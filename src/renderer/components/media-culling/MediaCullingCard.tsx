import React, { useState, useRef, useEffect } from "react"
import type { MediaItem } from "../../../shared/types/media"
import type { VideoPlayerRef } from "../media/VideoPlayer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bookmark,
  Trash2,
  Maximize,
} from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { formatBytes } from "../../lib/format"
import { VideoPlayer } from "../media/VideoPlayer"
import { QualityScoreBadge } from "../media/QualityScoreBadge"

interface MediaCullingCardProps {
  item: MediaItem
  deckIndex: number
  isTopCard: boolean
  swipeClass?: "slide-left" | "slide-right" | ""
  restoringDirection?: "left" | "right" | null
  isVideoPlaying: boolean
  videoPlayerRef?: React.Ref<VideoPlayerRef>
  onDoubleClick?: () => void
  onFullscreen?: () => void
  onPlayStateChange?: (playing: boolean) => void
  onSwipeComplete?: (action: "keep" | "delete") => void
}

interface MediaCullingCardInnerProps {
  item: MediaItem
  deckIndex: number
  isTopCard: boolean
  isVideoPlaying: boolean
  videoPlayerRef?: React.Ref<VideoPlayerRef>
  onFullscreen?: () => void
  onPlayStateChange?: (playing: boolean) => void
  keepOverlayRef: React.RefObject<HTMLDivElement | null>
  deleteOverlayRef: React.RefObject<HTMLDivElement | null>
}

const MediaCullingCardInner: React.FC<MediaCullingCardInnerProps> = React.memo(
  ({
    item,
    deckIndex,
    isTopCard,
    isVideoPlaying,
    videoPlayerRef,
    onFullscreen,
    onPlayStateChange,
    keepOverlayRef,
    deleteOverlayRef,
  }) => {
    const itemIsVideo = item.mediaType === "video"
    const safeSrc = `media:///${(item.thumbnailPath || item.path).replace(/\\/g, "/")}`

    return (
      <Card className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/60 p-0 py-0 shadow-xl select-none">
        <CardContent className="relative flex min-h-0 w-full flex-1 flex-col justify-end bg-black p-0">
          {deckIndex <= 1 ? (
            isTopCard && itemIsVideo ? (
              <VideoPlayer
                ref={videoPlayerRef}
                src={item.path}
                mediaId={item.id}
                rotation={item.orientation ?? 0}
                poster={item.thumbnailPath}
                className="absolute! inset-0 h-full w-full"
                hideFullscreen={false}
                onPlayStateChange={onPlayStateChange}
                fillContainer={true}
              />
            ) : (
              <img
                src={safeSrc}
                alt={item.name}
                style={
                  item.orientation
                    ? { transform: `rotate(${item.orientation}deg)` }
                    : undefined
                }
                className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none"
              />
            )
          ) : (
            <div className="absolute inset-0 h-full w-full bg-muted/20" />
          )}

          {isTopCard && item.quality && (
            <div className="absolute top-3 left-3 z-30 flex gap-2">
              <QualityScoreBadge item={item} side="bottom" />

              {item.quality.isBlurry && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/20 bg-yellow-500/10 text-xs text-yellow-500 backdrop-blur"
                >
                  Blurry
                </Badge>
              )}
              {item.quality.isDark && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/20 bg-yellow-500/10 text-xs text-yellow-500 backdrop-blur"
                >
                  Dark
                </Badge>
              )}
            </div>
          )}

          {isTopCard && (
            <div className="absolute top-3 right-3 z-20">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white shadow-sm transition-opacity hover:bg-black/60"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFullscreen?.()
                    }}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Preview Details</TooltipContent>
              </Tooltip>
            </div>
          )}

          {isTopCard && (
            <div
              ref={keepOverlayRef}
              className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl opacity-0 transition-opacity duration-150"
            >
              <div className="absolute inset-0 bg-linear-to-l from-green-500/40 via-green-500/10 to-transparent" />
              <div className="absolute top-1/2 right-4 flex -translate-y-1/2 flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30">
                  <Bookmark className="h-8 w-8 fill-white text-white" />
                </div>
                <span className="font-heading text-xs font-black tracking-widest text-white uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  Keep
                </span>
              </div>
            </div>
          )}

          {isTopCard && (
            <div
              ref={deleteOverlayRef}
              className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl opacity-0 transition-opacity duration-150"
            >
              <div className="absolute inset-0 bg-linear-to-r from-red-500/40 via-red-500/10 to-transparent" />
              <div className="absolute top-1/2 left-4 flex -translate-y-1/2 flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30">
                  <Trash2 className="h-8 w-8 fill-white text-white" />
                </div>
                <span className="font-heading text-xs font-black tracking-widest text-white uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  Delete
                </span>
              </div>
            </div>
          )}

          {deckIndex <= 1 && (
            <div
              className={`pointer-events-none z-25 transition-opacity duration-300 ${
                isTopCard && !(isVideoPlaying && itemIsVideo)
                  ? "opacity-100"
                  : "opacity-0"
              } ${
                itemIsVideo
                  ? "absolute inset-x-4 bottom-16 flex flex-col rounded-xl border border-white/10 bg-black/60 p-3 text-white backdrop-blur-md"
                  : "absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-black/85 via-black/45 to-transparent p-4 pb-3 text-white"
              }`}
            >
              <span className="truncate font-heading text-sm font-bold">
                {item.name}
              </span>
              <div className="mt-1 flex items-center gap-3 text-xs opacity-75">
                <span>{formatBytes(item.size)}</span>
                {item.width && item.height && (
                  <span>
                    • {item.width} x {item.height}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
MediaCullingCardInner.displayName = "MediaCullingCardInner"

export const MediaCullingCard: React.FC<MediaCullingCardProps> = ({
  item,
  deckIndex,
  isTopCard,
  swipeClass = "",
  restoringDirection = null,
  isVideoPlaying,
  videoPlayerRef,
  onDoubleClick,
  onFullscreen,
  onPlayStateChange,
  onSwipeComplete,
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const keepOverlayRef = useRef<HTMLDivElement>(null)
  const deleteOverlayRef = useRef<HTMLDivElement>(null)

  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  const pointerIdRef = useRef<number>(-1)
  const hasCapturedRef = useRef<boolean>(false)
  const [swipeOutAction, setSwipeOutAction] = useState<
    "keep" | "delete" | null
  >(null)

  const [prevItemId, setPrevItemId] = useState(item.id)
  if (item.id !== prevItemId) {
    setPrevItemId(item.id)
    if (swipeOutAction !== null) setSwipeOutAction(null)
  }

  useEffect(() => {
    hasCapturedRef.current = false
    pointerIdRef.current = -1
    if (isDraggingRef.current) return

    isDraggingRef.current = false
    dragOffsetRef.current = { x: 0, y: 0 }
    if (keepOverlayRef.current) keepOverlayRef.current.style.opacity = "0"
    if (deleteOverlayRef.current) deleteOverlayRef.current.style.opacity = "0"

    if (cardRef.current && isTopCard) {
      if (restoringDirection === "left") {
        cardRef.current.style.transform = "translate(-150%, 60px) rotate(-25deg)"
        cardRef.current.style.transition = "none"
        cardRef.current.style.opacity = "0"
      } else if (restoringDirection === "right") {
        cardRef.current.style.transform = "translate(150%, 60px) rotate(25deg)"
        cardRef.current.style.transition = "none"
        cardRef.current.style.opacity = "0"
      } else if (swipeClass === "slide-left") {
        cardRef.current.style.transform = "translate(-150%, 60px) rotate(-25deg)"
        cardRef.current.style.transition =
          "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease"
        cardRef.current.style.opacity = "0"
      } else if (swipeClass === "slide-right") {
        cardRef.current.style.transform = "translate(150%, 60px) rotate(25deg)"
        cardRef.current.style.transition =
          "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease"
        cardRef.current.style.opacity = "0"
      } else if (swipeOutAction === "keep") {
        cardRef.current.style.transform = "translate(150%, 60px) rotate(25deg)"
        cardRef.current.style.transition =
          "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease"
        cardRef.current.style.opacity = "0"
      } else if (swipeOutAction === "delete") {
        cardRef.current.style.transform = "translate(-150%, 60px) rotate(-25deg)"
        cardRef.current.style.transition =
          "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease"
        cardRef.current.style.opacity = "0"
      } else {
        cardRef.current.style.transform = "translate(0, 0) rotate(0deg) scale(1)"
        cardRef.current.style.transition =
          "transform 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease"
        cardRef.current.style.opacity = "1"
        cardRef.current.style.cursor = "grab"
      }
    }
  }, [item.id, isTopCard, restoringDirection, swipeClass, swipeOutAction])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTopCard || swipeClass !== "" || swipeOutAction !== null) return

    const target = e.target as HTMLElement
    if (
      target.closest("button") ||
      target.closest(".slider") ||
      target.closest('[role="slider"]') ||
      target.closest('[data-slot="slider"]') ||
      target.closest(".interactive-badge")
    ) {
      return
    }

    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    dragOffsetRef.current = { x: 0, y: 0 }
    pointerIdRef.current = e.pointerId
    hasCapturedRef.current = false
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y

    if (!hasCapturedRef.current && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
      try {
        e.currentTarget.setPointerCapture(pointerIdRef.current)
      } catch {
        // Ignore pointer capture error
      }
      hasCapturedRef.current = true
    }

    if (hasCapturedRef.current) {
      dragOffsetRef.current = { x: dx, y: dy }
      if (cardRef.current) {
        cardRef.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.06}deg)`
        cardRef.current.style.transition = "none"
        cardRef.current.style.cursor = "grabbing"
      }
      const thresholdX = 120
      let keepOp = 0
      let delOp = 0
      if (dx > 20) {
        keepOp = Math.min((dx - 20) / (thresholdX - 20), 1)
      } else if (dx < -20) {
        delOp = Math.min((Math.abs(dx) - 20) / (thresholdX - 20), 1)
      }
      if (keepOverlayRef.current) keepOverlayRef.current.style.opacity = String(keepOp)
      if (deleteOverlayRef.current) deleteOverlayRef.current.style.opacity = String(delOp)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    if (hasCapturedRef.current) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current)
      } catch {
        // Ignore pointer release error
      }

      const dx = dragOffsetRef.current.x
      const thresholdX = 120

      if (dx > thresholdX) {
        if (cardRef.current) {
          cardRef.current.style.transform = "translate(150%, 60px) rotate(25deg)"
          cardRef.current.style.transition =
            "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease"
          cardRef.current.style.opacity = "0"
          cardRef.current.style.cursor = "grabbing"
        }
        if (keepOverlayRef.current) keepOverlayRef.current.style.opacity = "1"
        setSwipeOutAction("keep")
        setTimeout(() => {
          onSwipeComplete?.("keep")
        }, 350)
      } else if (dx < -thresholdX) {
        if (cardRef.current) {
          cardRef.current.style.transform = "translate(-150%, 60px) rotate(-25deg)"
          cardRef.current.style.transition =
            "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease"
          cardRef.current.style.opacity = "0"
          cardRef.current.style.cursor = "grabbing"
        }
        if (deleteOverlayRef.current) deleteOverlayRef.current.style.opacity = "1"
        setSwipeOutAction("delete")
        setTimeout(() => {
          onSwipeComplete?.("delete")
        }, 350)
      } else {
        if (cardRef.current) {
          cardRef.current.style.transform = "translate(0, 0) rotate(0deg) scale(1)"
          cardRef.current.style.transition =
            "transform 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease"
          cardRef.current.style.cursor = "grab"
        }
        if (keepOverlayRef.current) keepOverlayRef.current.style.opacity = "0"
        if (deleteOverlayRef.current) deleteOverlayRef.current.style.opacity = "0"
      }
    }
    hasCapturedRef.current = false
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    if (hasCapturedRef.current) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current)
      } catch {
        // Ignore pointer release error
      }
    }
    if (cardRef.current) {
      cardRef.current.style.transform = "translate(0, 0) rotate(0deg) scale(1)"
      cardRef.current.style.transition = "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)"
    }
    if (keepOverlayRef.current) keepOverlayRef.current.style.opacity = "0"
    if (deleteOverlayRef.current) deleteOverlayRef.current.style.opacity = "0"
    hasCapturedRef.current = false
  }

  let cardStyle: React.CSSProperties

  if (isTopCard) {
    if (swipeOutAction === "keep") {
      cardStyle = {
        transform: "translate(150%, 60px) rotate(25deg)",
        transition:
          "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease",
        opacity: 0,
        cursor: "grabbing",
      }
    } else if (swipeOutAction === "delete") {
      cardStyle = {
        transform: "translate(-150%, 60px) rotate(-25deg)",
        transition:
          "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease",
        opacity: 0,
        cursor: "grabbing",
      }
    } else if (restoringDirection === "left") {
      cardStyle = {
        transform: "translate(-150%, 60px) rotate(-25deg)",
        transition: "none",
        opacity: 0,
      }
    } else if (restoringDirection === "right") {
      cardStyle = {
        transform: "translate(150%, 60px) rotate(25deg)",
        transition: "none",
        opacity: 0,
      }
    } else if (swipeClass === "slide-left") {
      cardStyle = {
        transform: "translate(-150%, 60px) rotate(-25deg)",
        transition:
          "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
        opacity: 0,
      }
    } else if (swipeClass === "slide-right") {
      cardStyle = {
        transform: "translate(150%, 60px) rotate(25deg)",
        transition:
          "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
        opacity: 0,
      }
    } else {
      cardStyle = {
        transform: "translate(0, 0) rotate(0deg) scale(1)",
        transition:
          "transform 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease",
        cursor: "grab",
      }
    }
  } else {
    const CARD_WIDTH = 568
    const SCALE_STEP = 0.04
    const scale = 1 - deckIndex * SCALE_STEP
    const cardHeight = CARD_WIDTH * 1.25
    const peekSize = 12
    const translateY = deckIndex * ((-cardHeight / 2) * SCALE_STEP - peekSize)
    const opacity = 1 - deckIndex * 0.35
    let filter = "none"
    if (deckIndex === 1) {
      filter = "brightness(0.45) contrast(0.9) saturate(0.6)"
    } else if (deckIndex === 2) {
      filter = "brightness(0.3) contrast(0.8) saturate(0.4)"
    }
    cardStyle = {
      transform: `translateY(${translateY}px) scale(${scale})`,
      transition:
        "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), filter 400ms cubic-bezier(0.4, 0, 0.2, 1)",
      pointerEvents: "none",
      opacity: opacity,
      filter: filter,
    }
  }

  return (
    <div
      key={item.id}
      ref={cardRef}
      style={{
        position: "absolute",
        width: "100%",
        maxWidth: "min(568px, 100%)",
        height: "100%",
        maxHeight: "100%",
        aspectRatio: "4/5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
        userSelect: "none",
        ...cardStyle,
      }}
      className="select-none"
      {...(isTopCard
        ? {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerCancel,
            onDoubleClick,
          }
        : {})}
    >
      <MediaCullingCardInner
        item={item}
        deckIndex={deckIndex}
        isTopCard={isTopCard}
        isVideoPlaying={isVideoPlaying}
        videoPlayerRef={videoPlayerRef}
        onFullscreen={onFullscreen}
        onPlayStateChange={onPlayStateChange}
        keepOverlayRef={keepOverlayRef}
        deleteOverlayRef={deleteOverlayRef}
      />
    </div>
  )
}

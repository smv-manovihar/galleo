import React, { useState, useRef, useEffect } from "react"
import type { MediaItem } from "../../../shared/types/media"
import { useSettingsStore } from "../../stores/settings-store"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Bookmark, 
  Trash2, 
  Maximize, 
  AlertTriangle, 
  Monitor, 
  Sun, 
  Zap, 
  Info,
  Check
} from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { formatBytes } from "../../lib/format"
import { VideoPlayer } from "../media/VideoPlayer"

interface MediaCullingCardProps {
  item: MediaItem
  deckIndex: number
  isTopCard: boolean
  swipeClass?: "slide-left" | "slide-right" | ""
  restoringDirection?: "left" | "right" | null
  isVideoPlaying: boolean
  videoPlayerRef?: React.Ref<any>
  onDoubleClick?: () => void
  onFullscreen?: () => void
  onPlayStateChange?: (playing: boolean) => void
  onSwipeComplete?: (action: "keep" | "delete") => void
}

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
  const { settings } = useSettingsStore()
  const itemIsVideo = item.mediaType === "video"
  const safeSrc = `media:///${item.path.replace(/\\/g, "/")}`

  const blurThreshold = settings?.quality?.blurThreshold ?? 30
  const darknessThreshold = settings?.quality?.darknessThreshold ?? 50

  const getQualityGrade = (score: number) => {
    if (score >= 85) return { label: "Excellent", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
    if (score >= 70) return { label: "Good", color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" }
    if (score >= 50) return { label: "Fair", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" }
    return { label: "Poor (Flagged)", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20" }
  }

  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [swipeOutAction, setSwipeOutAction] = useState<"keep" | "delete" | null>(null)

  const pointerIdRef = useRef<number>(-1)
  const hasCapturedRef = useRef<boolean>(false)

  useEffect(() => {
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
    setSwipeOutAction(null)
    hasCapturedRef.current = false
    pointerIdRef.current = -1
  }, [item.id])

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
      } catch (err) {}
      hasCapturedRef.current = true
    }

    if (hasCapturedRef.current) {
      setDragOffset({ x: dx, y: dy })
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)

    if (hasCapturedRef.current) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current)
      } catch (err) {}

      const thresholdX = 120

      if (dragOffset.x > thresholdX) {
        setSwipeOutAction("keep")
        setTimeout(() => {
          onSwipeComplete?.("keep")
        }, 350)
      } else if (dragOffset.x < -thresholdX) {
        setSwipeOutAction("delete")
        setTimeout(() => {
          onSwipeComplete?.("delete")
        }, 350)
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
      } catch (err) {}
    }
    setDragOffset({ x: 0, y: 0 })
    hasCapturedRef.current = false
  }

  let cardStyle: React.CSSProperties = {}

  if (isTopCard) {
    if (isDragging) {
      cardStyle = {
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.06}deg)`,
        transition: "none",
        cursor: "grabbing",
      }
    } else if (swipeOutAction === "keep") {
      cardStyle = {
        transform: "translate(150%, 60px) rotate(25deg)",
        transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease",
        opacity: 0,
        cursor: "grabbing",
      }
    } else if (swipeOutAction === "delete") {
      cardStyle = {
        transform: "translate(-150%, 60px) rotate(-25deg)",
        transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease",
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
        transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
        opacity: 0,
      }
    } else if (swipeClass === "slide-right") {
      cardStyle = {
        transform: "translate(150%, 60px) rotate(25deg)",
        transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
        opacity: 0,
      }
    } else {
      cardStyle = {
        transform: "translate(0, 0) rotate(0deg) scale(1)",
        transition: "transform 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease",
        cursor: "grab",
      }
    }
  } else {
    const CARD_WIDTH = 568
    const SCALE_STEP = 0.04
    const scale = 1 - deckIndex * SCALE_STEP
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
    cardStyle = {
      transform: `translateY(${translateY}px) scale(${scale})`,
      transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), filter 400ms cubic-bezier(0.4, 0, 0.2, 1)",
      pointerEvents: "none",
      opacity: opacity,
      filter: filter,
    }
  }

  const thresholdX = 120
  let computedKeepOpacity = 0
  let computedDeleteOpacity = 0

  if (isDragging) {
    if (dragOffset.x > 20) {
      computedKeepOpacity = Math.min((dragOffset.x - 20) / (thresholdX - 20), 1)
    } else if (dragOffset.x < -20) {
      computedDeleteOpacity = Math.min((Math.abs(dragOffset.x) - 20) / (thresholdX - 20), 1)
    }
  } else if (swipeOutAction === "keep" || swipeClass === "slide-right") {
    computedKeepOpacity = 1
  } else if (swipeOutAction === "delete" || swipeClass === "slide-left") {
    computedDeleteOpacity = 1
  }

  return (
    <div
      key={item.id}
      style={{
        position: "absolute",
        width: "568px",
        maxWidth: "100%",
        height: "100%",
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
      <Card
        className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/60 p-0 py-0 shadow-xl select-none"
        style={{ maxHeight: "100%" }}
      >
        <CardContent
          className="relative flex min-h-0 w-full flex-1 flex-col justify-end bg-black p-0 max-h-full"
          style={{ aspectRatio: "4/5" }}
        >
          {deckIndex <= 1 ? (
            itemIsVideo ? (
              <VideoPlayer
                ref={isTopCard ? videoPlayerRef : undefined}
                src={item.path}
                poster={item.thumbnailPath}
                className="absolute! inset-0 h-full w-full"
                hideFullscreen={false}
                onPlayStateChange={isTopCard ? onPlayStateChange : undefined}
                fillContainer={true}
              />
            ) : (
              <img
                src={safeSrc}
                alt={item.name}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none"
              />
            )
          ) : (
            <div className="absolute inset-0 h-full w-full bg-muted/20" />
          )}

          {isTopCard && item.quality && (
            <div className="absolute top-3 left-3 z-30 flex gap-2">
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <div className="interactive-badge cursor-help">
                    <Badge
                      variant={item.quality.compositeScore < 50 ? "destructive" : "secondary"}
                      className="bg-background/90 text-2xs font-extrabold backdrop-blur shadow-sm flex items-center gap-1 cursor-help hover:bg-background/95 transition-colors border border-border"
                    >
                      <Info className="w-3 h-3 text-muted-foreground" />
                      Quality Score: {item.quality.compositeScore}
                    </Badge>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent 
                  side="right" 
                  className="interactive-badge p-4 w-72 bg-card/95 border border-border shadow-xl backdrop-blur-md rounded-xl select-none font-sans text-xs space-y-3 z-50 pointer-events-auto text-foreground"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-bold text-foreground">Quality Analytics</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getQualityGrade(item.quality.compositeScore).color}`}>
                      {getQualityGrade(item.quality.compositeScore).label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Focus / Sharpness Metric */}
                    <div className="flex items-start justify-between gap-1.5 text-2xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Zap className={`w-3.5 h-3.5 ${item.quality.isBlurry ? 'text-amber-500' : 'text-emerald-500'}`} />
                        <span>Focus & Sharpness</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">Score: {item.quality.blurScore}</div>
                        <div className="text-[10px] text-muted-foreground">Threshold: {blurThreshold}</div>
                      </div>
                    </div>
                    <div className="pl-5">
                      {item.quality.isBlurry ? (
                        <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> Blurry Photo (Flagged Defect)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3 shrink-0" /> Sharp & Focused
                        </span>
                      )}
                    </div>

                    {/* Lighting / Exposure Metric */}
                    <div className="flex items-start justify-between gap-1.5 text-2xs pt-1 border-t border-border/30">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Sun className={`w-3.5 h-3.5 ${item.quality.isDark ? 'text-rose-400' : 'text-amber-400'}`} />
                        <span>Lighting & Exposure</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">Value: {Math.round(item.quality.brightness)}</div>
                        <div className="text-[10px] text-muted-foreground">Threshold: {darknessThreshold}</div>
                      </div>
                    </div>
                    <div className="pl-5">
                      {item.quality.isDark ? (
                        <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> Under-exposed / Dark (Flagged Defect)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3 shrink-0" /> Well Exposed
                        </span>
                      )}
                    </div>

                    {/* Resolution Metric */}
                    <div className="flex items-start justify-between gap-1.5 text-2xs pt-1 border-t border-border/30">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Maximize className={`w-3.5 h-3.5 ${item.quality.isSmall ? 'text-rose-500' : 'text-blue-500'}`} />
                        <span>Resolution check</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          {item.width && item.height ? `${item.width} × ${item.height}` : 'N/A'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.width && item.height ? `${((item.width * item.height) / 1000000).toFixed(1)} MP` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="pl-5">
                      {item.quality.isSmall ? (
                        <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> Low Resolution / Small File
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3 shrink-0" /> High Resolution Pass
                        </span>
                      )}
                    </div>

                    {/* Screenshot / Clutter Check */}
                    {item.quality.isScreenshot && (
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-border/30 text-2xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Monitor className="w-3.5 h-3.5 text-purple-400" />
                          <span>File Type Check</span>
                        </div>
                        <div className="pl-5 text-[10px] text-amber-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" /> Screenshot (Likely Clutter)
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-muted-foreground/80 border-t border-border/60 pt-2 leading-relaxed">
                    * Scores below 50 are automatically marked for cleanup. Adjust culling standards in Settings.
                  </div>
                </HoverCardContent>
              </HoverCard>

              {item.quality.isBlurry && (
                <Badge variant="outline" className="border-yellow-500/20 bg-yellow-500/10 text-[0.5625rem] text-yellow-500 backdrop-blur">
                  Blurry
                </Badge>
              )}
              {item.quality.isDark && (
                <Badge variant="outline" className="border-yellow-500/20 bg-yellow-500/10 text-[0.5625rem] text-yellow-500 backdrop-blur">
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

          {isTopCard && computedKeepOpacity > 0 && (
            <div
              className="pointer-events-none absolute inset-0 z-30 rounded-2xl overflow-hidden"
              style={{ opacity: computedKeepOpacity }}
            >
              <div className="absolute inset-0 bg-linear-to-l from-green-500/40 via-green-500/10 to-transparent" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30">
                  <Bookmark className="h-8 w-8 text-white fill-white" />
                </div>
                <span className="font-heading text-xs font-black tracking-widest text-white uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  Keep
                </span>
              </div>
            </div>
          )}

          {isTopCard && computedDeleteOpacity > 0 && (
            <div
              className="pointer-events-none absolute inset-0 z-30 rounded-2xl overflow-hidden"
              style={{ opacity: computedDeleteOpacity }}
            >
              <div className="absolute inset-0 bg-linear-to-r from-red-500/40 via-red-500/10 to-transparent" />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30">
                  <Trash2 className="h-8 w-8 text-white fill-white" />
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
                isTopCard && !(isVideoPlaying && itemIsVideo) ? "opacity-100" : "opacity-0"
              } ${
                itemIsVideo
                  ? "absolute inset-x-4 bottom-16 flex flex-col rounded-xl border border-white/10 bg-black/60 p-3 text-white backdrop-blur-md"
                  : "absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-black/85 via-black/45 to-transparent p-4 pb-3 text-white"
              }`}
            >
              <span className="truncate font-heading text-sm font-bold">{item.name}</span>
              <div className="mt-1 flex items-center gap-3 text-2xs opacity-75">
                <span>{formatBytes(item.size)}</span>
                {item.width && item.height && (
                  <span>• {item.width} x {item.height}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

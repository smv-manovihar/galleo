import React, { useState, useEffect, useRef, useCallback } from "react"
import type { MediaItem } from "../../../shared/types/media"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { VideoPlayer, type VideoPlayerRef } from "./VideoPlayer"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMediaStore } from "../../stores/media-store"
import { useUIStore } from "../../stores/ui-store"
import { MediaPreviewHeader } from "./preview/MediaPreviewHeader"
import { MediaPropertiesPanel } from "./preview/MediaPropertiesPanel"
import { ZoomControls } from "./preview/ZoomControls"
import { ImagePreviewViewport } from "./preview/ImagePreviewViewport"

export interface MediaPreviewProps {
  item: MediaItem | null
  onClose: () => void
  items?: MediaItem[]
  onItemChange?: (item: MediaItem) => void
  autoPlay?: boolean
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  item: propItem,
  onClose,
  items,
  onItemChange,
  autoPlay = false,
}) => {
  // 1. State
  const showMetaPanel = useUIStore((s) => s.previewMetaPanelOpen)
  const toggleMetaPanel = useUIStore((s) => s.togglePreviewMetaPanel)
  const enableAnimations = useUIStore((s) => s.previewTransitionAnimation)
  const toggleAnimations = useUIStore((s) => s.togglePreviewTransitionAnimation)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [navigatedItem, setNavigatedItem] = useState<MediaItem | null>(null)
  const [prevPropId, setPrevPropId] = useState<string | undefined>(propItem?.id)
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null)
  const [overrideRotation, setOverrideRotation] = useState<{
    id: string
    rotation: number
  } | null>(null)

  // Sync internal navigated item when parent changes propItem
  if (propItem?.id !== prevPropId) {
    setPrevPropId(propItem?.id)
    setNavigatedItem(null)
  }

  const item = navigatedItem ?? propItem
  const isVideo = item?.mediaType === "video"
  const rotation =
    overrideRotation && item && overrideRotation.id === item.id
      ? overrideRotation.rotation
      : (item?.orientation ?? 0)

  // 2. Refs
  const previewRef = useRef<HTMLDivElement>(null)
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null)
  const transformElRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const positionRef = useRef({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const scaleListenersRef = useRef<Set<(scale: number) => void>>(new Set())
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 3. Zoom & Pan Transform Logic (Direct DOM updates)
  const registerScaleListener = useCallback((listener: (scale: number) => void) => {
    scaleListenersRef.current.add(listener)
    listener(scaleRef.current)
    return () => {
      scaleListenersRef.current.delete(listener)
    }
  }, [])

  const updateTransform = useCallback((animated = false) => {
    const el = transformElRef.current
    if (!el) return
    const s = scaleRef.current
    const pos = positionRef.current
    const panning = isPanningRef.current

    if (s > 1) {
      el.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${s})`
      el.style.transitionDuration = panning || !animated ? "0s" : "0.15s"
      el.style.cursor = panning ? "grabbing" : "grab"
    } else {
      el.style.transform = ""
      el.style.transitionDuration = animated ? "0.15s" : "0s"
      el.style.cursor = "default"
    }
  }, [])

const MIN_SCALE = 1
const MAX_SCALE = 6

  const setScaleValue = useCallback(
    (newScale: number, animated = true) => {
      scaleRef.current = newScale
      if (newScale === 1) {
        positionRef.current = { x: 0, y: 0 }
      }
      updateTransform(animated)
      scaleListenersRef.current.forEach((fn) => fn(newScale))
    },
    [updateTransform]
  )

  const handleZoomIn = useCallback(() => {
    setScaleValue(Math.min(scaleRef.current + 0.5, MAX_SCALE), true)
  }, [setScaleValue])

  const handleZoomOut = useCallback(() => {
    setScaleValue(Math.max(scaleRef.current - 0.5, MIN_SCALE), true)
  }, [setScaleValue])

  const handleSetScale = useCallback(
    (newScale: number) => {
      const clamped = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE))
      setScaleValue(clamped, true)
    },
    [setScaleValue]
  )

  const handleZoomReset = useCallback(() => {
    setScaleValue(1, true)
  }, [setScaleValue])

  // Reset zoom on item change
  useEffect(() => {
    scaleRef.current = 1
    positionRef.current = { x: 0, y: 0 }
    isPanningRef.current = false
    if (transformElRef.current) {
      transformElRef.current.style.transform = ""
      transformElRef.current.style.cursor = "default"
    }
    scaleListenersRef.current.forEach((fn) => fn(1))
  }, [item?.id])

  // 4. Auto-hide controls in fullscreen
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)

    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 2000)
    }
  }, [isFullscreen])

  useEffect(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 2000)
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [isFullscreen])

  // Sync fullscreenchange
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // 5. Rotation Logic
  const handleRotate = useCallback(
    (newRot: number) => {
      if (!item) return
      const norm = ((newRot % 360) + 360) % 360
      setOverrideRotation({ id: item.id, rotation: newRot })
      useMediaStore.getState().updateItemOrientation(item.id, norm)
    },
    [item]
  )

  const handleRotateLeft = useCallback(() => {
    handleRotate(rotation - 90)
  }, [rotation, handleRotate])

  const handleRotateRight = useCallback(() => {
    handleRotate(rotation + 90)
  }, [rotation, handleRotate])

  const handleRotateReset = useCallback(() => {
    const nearestZero = Math.round(rotation / 360) * 360
    handleRotate(nearestZero)
  }, [rotation, handleRotate])

  // 6. Navigation
  const currentIndex = items && item ? items.findIndex((i) => i.id === item.id) : -1
  const hasPrevious = currentIndex > 0
  const hasNext = items ? currentIndex < items.length - 1 : false

  const handlePrevious = useCallback(() => {
    if (items && hasPrevious) {
      const prevItem = items[currentIndex - 1]
      setSlideDirection("left")
      setNavigatedItem(prevItem)
      onItemChange?.(prevItem)
    }
  }, [items, hasPrevious, currentIndex, onItemChange])

  const handleNext = useCallback(() => {
    if (items && hasNext) {
      const nextItem = items[currentIndex + 1]
      setSlideDirection("right")
      setNavigatedItem(nextItem)
      onItemChange?.(nextItem)
    }
  }, [items, hasNext, currentIndex, onItemChange])

  const toggleFullscreen = useCallback(async () => {
    if (isVideo && videoPlayerRef.current) {
      await videoPlayerRef.current.requestFullscreen()
      return
    }

    if (!previewRef.current) return
    try {
      if (!document.fullscreenElement) {
        await previewRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err)
    }
  }, [isVideo])

  // 7. Stable Keyboard Shortcut Listener via Ref
  const navActionsRef = useRef({
    item,
    items,
    onClose,
    hasPrevious,
    hasNext,
    handlePrevious,
    handleNext,
    toggleFullscreen,
    handleRotateLeft,
    handleRotateRight,
    toggleMetaPanel,
    toggleAnimations,
  })

  useEffect(() => {
    navActionsRef.current = {
      item,
      items,
      onClose,
      hasPrevious,
      hasNext,
      handlePrevious,
      handleNext,
      toggleFullscreen,
      handleRotateLeft,
      handleRotateRight,
      toggleMetaPanel,
      toggleAnimations,
    }
  }, [
    item,
    items,
    onClose,
    hasPrevious,
    hasNext,
    handlePrevious,
    handleNext,
    toggleFullscreen,
    handleRotateLeft,
    handleRotateRight,
    toggleMetaPanel,
    toggleAnimations,
  ])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return
      }

      if (document.activeElement?.closest(".group\\/video")) {
        return
      }

      const key = e.key.toLowerCase()
      const actions = navActionsRef.current

      // Close preview: Q, Z, or Escape
      if (e.key === "Escape" || key === "q" || key === "z") {
        e.preventDefault()
        actions.onClose()
        return
      }

      // Toggle properties info: I
      if (key === "i") {
        e.preventDefault()
        actions.toggleMetaPanel()
        return
      }

      // Toggle transition animation / compare mode: T
      if (key === "t") {
        e.preventDefault()
        actions.toggleAnimations()
        return
      }

      // Toggle fullscreen: F
      if (key === "f") {
        e.preventDefault()
        void actions.toggleFullscreen()
        return
      }

      // Rotation shortcuts: Ctrl/Cmd + Left/Right
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") {
        e.preventDefault()
        actions.handleRotateLeft()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") {
        e.preventDefault()
        actions.handleRotateRight()
        return
      }

      // Navigation: Left / Right arrows or A / D
      if (actions.items) {
        if (e.key === "ArrowLeft" || key === "a") {
          if (actions.hasPrevious) {
            e.preventDefault()
            actions.handlePrevious()
          }
        } else if (e.key === "ArrowRight" || key === "d") {
          if (actions.hasNext) {
            e.preventDefault()
            actions.handleNext()
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // 8. Pointer & Wheel Handlers for Zoom / Pan
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isVideo) return

      const target = e.target as HTMLElement
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest(".slider") ||
        target.closest('[role="slider"]') ||
        target.closest('[data-slot="slider"]') ||
        target.closest('[data-slot="popover"]') ||
        target.closest('[data-slot="dialog"]')
      ) {
        return
      }

      const zoomStep = 0.1
      let newScale = scaleRef.current + (e.deltaY < 0 ? zoomStep : -zoomStep)
      newScale = Math.round(newScale * 10) / 10
      newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE))
      setScaleValue(newScale, true)
    },
    [isVideo, setScaleValue]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isVideo) return

      const target = e.target as HTMLElement
      if (
        target.closest("button") ||
        target.closest(".slider") ||
        target.closest('[role="slider"]') ||
        target.closest('[data-slot="slider"]') ||
        target.closest('[data-slot="popover"]') ||
        target.closest('[data-slot="popover-content"]') ||
        target.closest('[data-slot="dialog"]')
      ) {
        return
      }

      if (scaleRef.current <= 1) return
      e.preventDefault()
      isPanningRef.current = true
      panStartRef.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      updateTransform(false)
    },
    [isVideo, updateTransform]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isVideo || !isPanningRef.current) return
      positionRef.current = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      }
      updateTransform(false)
    },
    [isVideo, updateTransform]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isVideo || !isPanningRef.current) return
      isPanningRef.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Ignore pointer capture release error
      }
      updateTransform(false)
    },
    [isVideo, updateTransform]
  )

  // Pause video on unmount
  useEffect(() => {
    const player = videoPlayerRef.current
    return () => {
      if (player?.pause) {
        try {
          player.pause()
        } catch {
          // Ignore pause error during unmount
        }
      }
    }
  }, [])

  if (!item) return null

  const safeSrc = `media:///${item.path.replace(/\\/g, "/")}`

  return (
    <Dialog
      open={propItem !== null}
      onOpenChange={(open: boolean) => !open && onClose()}
    >
      <DialogContent
        width="full"
        height="full"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex h-[90vh] w-[94vw] max-w-7xl flex-col gap-0 overflow-hidden border-border bg-card/95 p-0 font-sans text-foreground backdrop-blur-md"
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-card text-foreground">
          {/* Modal Header */}
          <MediaPreviewHeader
            name={item.name}
            path={item.path}
            isFullscreen={isFullscreen}
            showMetaPanel={showMetaPanel}
            isVideo={isVideo}
            hasMultipleItems={Boolean(items && items.length > 1)}
            enableAnimations={enableAnimations}
            toggleFullscreen={toggleFullscreen}
            toggleMetaPanel={toggleMetaPanel}
            toggleAnimations={toggleAnimations}
            onClose={onClose}
          />

          {/* Modal Main Content Workspace */}
          <div className="relative flex min-h-0 flex-1">
            {/* Main Media Preview Area */}
            <div
              ref={previewRef}
              className="relative flex h-full flex-1 items-center justify-center overflow-hidden bg-black p-4 select-none"
              onWheel={(e) => {
                handleWheel(e)
                resetControlsTimeout()
              }}
              onPointerDown={(e) => {
                handlePointerDown(e)
                resetControlsTimeout()
              }}
              onPointerMove={(e) => {
                handlePointerMove(e)
                resetControlsTimeout()
              }}
              onPointerUp={(e) => {
                handlePointerUp(e)
                resetControlsTimeout()
              }}
              onPointerCancel={handlePointerUp}
              onMouseMove={resetControlsTimeout}
            >
              <div
                key={item.id}
                className={`relative flex h-full w-full max-h-full max-w-full items-center justify-center overflow-hidden ${
                  enableAnimations
                    ? slideDirection === "right"
                      ? "animate-in fade-in-0 slide-in-from-right-8 duration-150 ease-out"
                      : slideDirection === "left"
                        ? "animate-in fade-in-0 slide-in-from-left-8 duration-150 ease-out"
                        : "animate-in fade-in-0 duration-150"
                    : ""
                }`}
              >
                {isVideo ? (
                  <div className="flex h-full w-full max-h-full max-w-full items-center justify-center overflow-hidden">
                    <VideoPlayer
                      ref={videoPlayerRef}
                      transformRef={transformElRef}
                      src={safeSrc}
                      mediaId={item.id}
                      rotation={rotation}
                      poster={
                        item.thumbnailPath
                          ? `media:///${item.thumbnailPath.replace(/\\/g, "/")}`
                          : undefined
                      }
                      className="h-full w-full"
                      hideFullscreen={false}
                      autoPlay={autoPlay}
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      onZoomReset={handleZoomReset}
                      onSetScale={handleSetScale}
                      onRotateLeft={handleRotateLeft}
                      onRotateRight={handleRotateRight}
                      onRotateReset={handleRotateReset}
                      registerScaleListener={registerScaleListener}
                    />
                  </div>
                ) : (
                  <ImagePreviewViewport
                    src={safeSrc}
                    alt={item.name}
                    rotation={rotation}
                    itemWidth={item.width}
                    itemHeight={item.height}
                    transformRef={transformElRef}
                  />
                )}
              </div>

              {/* Controls Toolbar (Zoom + Rotation) */}
              {(!isVideo || !isFullscreen) && (
                <ZoomControls
                  isFullscreen={isFullscreen}
                  showControls={showControls}
                  toggleFullscreen={toggleFullscreen}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onZoomReset={handleZoomReset}
                  onSetScale={handleSetScale}
                  onRotateLeft={handleRotateLeft}
                  onRotateRight={handleRotateRight}
                  rotation={rotation}
                  onRotateReset={handleRotateReset}
                  registerScaleListener={registerScaleListener}
                />
              )}

              {/* Previous Button */}
              {items && hasPrevious && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute top-1/2 left-4 z-30 h-10 w-10 rounded-full border border-white/10 bg-black/40 text-white hover:bg-black/60 cursor-pointer ${!isFullscreen || showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePrevious()
                      }}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Previous File (Left Arrow / A)</TooltipContent>
                </Tooltip>
              )}

              {/* Next Button */}
              {items && hasNext && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute top-1/2 right-4 z-30 h-10 w-10 rounded-full border border-white/10 bg-black/40 text-white hover:bg-black/60 cursor-pointer ${!isFullscreen || showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNext()
                      }}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Next File (Right Arrow / D)</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Properties Details Side Panel */}
            {showMetaPanel && <MediaPropertiesPanel item={item} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

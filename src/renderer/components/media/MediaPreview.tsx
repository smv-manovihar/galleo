import React, { useState, useEffect, useRef, useCallback } from "react"
import type { MediaItem } from "../../../shared/types/media"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { VideoPlayer, type VideoPlayerRef } from "./VideoPlayer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Info,
  Calendar,
  FileImage,
  FolderOpen,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { formatBytes, formatDate } from "../../lib/format"
import { getFileManagerName } from "../../lib/os"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ZoomControlsProps {
  isFullscreen: boolean
  showControls: boolean
  toggleFullscreen: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  registerScaleListener: (listener: (scale: number) => void) => () => void
}

const ZoomControls: React.FC<ZoomControlsProps> = React.memo(
  ({
    isFullscreen,
    showControls,
    toggleFullscreen,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    registerScaleListener,
  }) => {
    const [scale, setScale] = useState(1)

    useEffect(() => {
      return registerScaleListener(setScale)
    }, [registerScaleListener])

    return (
      <div
        className={`absolute top-4 right-4 z-30 flex gap-1 rounded-lg border border-white/10 bg-black/60 p-1 backdrop-blur-xs transition-opacity duration-300 ${!isFullscreen || showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {isFullscreen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
                onClick={toggleFullscreen}
              >
                <Minimize className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Exit Fullscreen</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
              onClick={onZoomOut}
              disabled={scale <= 1}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Zoom Out</TooltipContent>
        </Tooltip>
        <span className="flex min-w-11 items-center justify-center px-2 font-mono text-2xs text-white">
          {Math.round(scale * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
              onClick={onZoomIn}
              disabled={scale >= 4}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Zoom In</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer rounded-md text-2xs font-semibold text-white hover:bg-white/10"
              onClick={onZoomReset}
              disabled={scale === 1}
            >
              1:1
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Reset Zoom</TooltipContent>
        </Tooltip>
      </div>
    )
  }
)
ZoomControls.displayName = "ZoomControls"

interface MediaPreviewProps {
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
  const [showMetaPanel, setShowMetaPanel] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const scaleRef = useRef(1)
  const positionRef = useRef({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const transformElRef = useRef<HTMLDivElement>(null)
  const scaleListenersRef = useRef<Set<(scale: number) => void>>(new Set())

  const registerScaleListener = useCallback(
    (listener: (scale: number) => void) => {
      scaleListenersRef.current.add(listener)
      listener(scaleRef.current)
      return () => {
        scaleListenersRef.current.delete(listener)
      }
    },
    []
  )

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

  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [activeItem, setActiveItem] = useState<MediaItem | null>(propItem)
  const [prevPropItem, setPrevPropItem] = useState<MediaItem | null>(propItem)

  if (propItem !== prevPropItem) {
    setPrevPropItem(propItem)
    setActiveItem(propItem)
  }

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

  const item = activeItem || propItem

  const currentIndex =
    items && item ? items.findIndex((i) => i.id === item.id) : -1
  const hasPrevious = currentIndex > 0
  const hasNext = items ? currentIndex < items.length - 1 : false

  const handlePrevious = useCallback(() => {
    if (items && hasPrevious) {
      const prevItem = items[currentIndex - 1]
      setActiveItem(prevItem)
      onItemChange?.(prevItem)
    }
  }, [items, hasPrevious, currentIndex, onItemChange])

  const handleNext = useCallback(() => {
    if (items && hasNext) {
      const nextItem = items[currentIndex + 1]
      setActiveItem(nextItem)
      onItemChange?.(nextItem)
    }
  }, [items, hasNext, currentIndex, onItemChange])

  useEffect(() => {
    if (!item || !items || !onItemChange) return

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

      // If the active element is inside the video player, let the VideoPlayer handle keys for seeking/volume controls
      if (document.activeElement?.closest(".group\\/video")) {
        return
      }

      if (e.key === "ArrowLeft") {
        if (hasPrevious) {
          e.preventDefault()
          handlePrevious()
        }
      } else if (e.key === "ArrowRight") {
        if (hasNext) {
          e.preventDefault()
          handleNext()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    item,
    items,
    onItemChange,
    hasPrevious,
    hasNext,
    handlePrevious,
    handleNext,
  ])

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

  // Sync native fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Reset zoom whenever item changes
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

  const toggleFullscreen = useCallback(async () => {
    if (item?.mediaType === "video" && videoPlayerRef.current) {
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
  }, [item?.mediaType])

  const handleZoomIn = useCallback(() => {
    setScaleValue(Math.min(scaleRef.current + 0.5, 4), true)
  }, [setScaleValue])

  const handleZoomOut = useCallback(() => {
    setScaleValue(Math.max(scaleRef.current - 0.5, 1), true)
  }, [setScaleValue])

  const handleZoomReset = useCallback(() => {
    setScaleValue(1, true)
  }, [setScaleValue])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const target = e.target as HTMLElement
      if (
        target.closest("button") ||
        target.closest(".slider") ||
        target.closest('[role="slider"]') ||
        target.closest('[data-slot="slider"]')
      ) {
        return
      }

      const zoomFactor = 0.1
      let newScale =
        scaleRef.current + (e.deltaY < 0 ? zoomFactor : -zoomFactor)
      newScale = Math.max(1, Math.min(newScale, 4))
      setScaleValue(newScale, true)
    },
    [setScaleValue]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (
        target.closest("button") ||
        target.closest("video") ||
        target.closest(".slider") ||
        target.closest('[role="slider"]') ||
        target.closest('[data-slot="slider"]')
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
      updateTransform(false)
    },
    [updateTransform]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return
      positionRef.current = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      }
      updateTransform(false)
    },
    [updateTransform]
  )

  const handlePointerUp = useCallback(() => {
    if (!isPanningRef.current) return
    isPanningRef.current = false
    updateTransform(false)
  }, [updateTransform])

  if (!item) return null

  const isVideo = item.mediaType === "video"
  const hasQuality = item.quality !== undefined

  // Format dates
  const targetDate = formatDate(item.dateTarget)
  const sourceLabels: Record<string, string> = {
    exif: "EXIF",
    filename: "Filename",
    filesystem: "File System",
  }
  const resolvedSourceLabel = sourceLabels[item.dateTargetSource] || "Resolved"
  const exifDate = item.dateOriginal ? formatDate(item.dateOriginal) : "None"
  const inferredDate = item.dateInferred
    ? formatDate(item.dateInferred)
    : item.dateTargetSource === "filename"
      ? formatDate(item.dateTarget)
      : "None"
  const fsDate = formatDate(item.dateFileSystem)

  const safeSrc = `media:///${item.path.replace(/\\/g, "/")}`

  const handleOpenFolder = async () => {
    await window.api.showFile(item.path)
  }

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
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border p-4">
            <div className="min-w-0 pr-4">
              <DialogTitle className="truncate text-sm leading-none font-semibold">
                {item.name}
              </DialogTitle>
              <DialogDescription className="mt-1 truncate text-2xs text-muted-foreground">
                {item.path}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 shrink-0 rounded-lg border-border hover:bg-accent ${isFullscreen ? "border-primary/45 bg-accent text-primary" : ""}`}
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 shrink-0 rounded-lg border-border hover:bg-accent ${showMetaPanel ? "border-primary/45 bg-accent text-primary" : ""}`}
                    onClick={() => setShowMetaPanel(!showMetaPanel)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Toggle Properties Info
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg border-border hover:bg-accent"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Close Preview</TooltipContent>
              </Tooltip>
            </div>
          </DialogHeader>

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
              onPointerUp={() => {
                handlePointerUp()
                resetControlsTimeout()
              }}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onMouseMove={resetControlsTimeout}
            >
              <div
                ref={transformElRef}
                className="pointer-events-none flex h-full w-full items-center justify-center transition-transform ease-out"
              >
                <div className="pointer-events-auto flex h-full w-full max-h-full max-w-full items-center justify-center">
                  {isVideo ? (
                    <VideoPlayer
                      ref={videoPlayerRef}
                      src={safeSrc}
                      poster={
                        item.thumbnailPath
                          ? `media:///${item.thumbnailPath.replace(/\\/g, "/")}`
                          : undefined
                      }
                      className="max-h-full max-w-full"
                      hideFullscreen={false}
                      autoPlay={autoPlay}
                    />
                  ) : (
                    <img
                      src={safeSrc}
                      alt={item.name}
                      className="pointer-events-none max-h-full max-w-full object-contain shadow-lg select-none"
                    />
                  )}
                </div>
              </div>

              {/* Zoom Controls */}
              <ZoomControls
                isFullscreen={isFullscreen}
                showControls={showControls}
                toggleFullscreen={toggleFullscreen}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onZoomReset={handleZoomReset}
                registerScaleListener={registerScaleListener}
              />

              {/* Previous Button */}
              {items && hasPrevious && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute top-1/2 left-4 z-30 h-10 w-10 rounded-full border border-white/10 bg-black/40 text-white hover:bg-black/60 ${!isFullscreen || showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePrevious()
                  }}
                  title="Previous File (Left Arrow)"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {/* Next Button */}
              {items && hasNext && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute top-1/2 right-4 z-30 h-10 w-10 rounded-full border border-white/10 bg-black/40 text-white hover:bg-black/60 ${!isFullscreen || showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNext()
                  }}
                  title="Next File (Right Arrow)"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </div>

            {/* Properties Details Side Panel */}
            {showMetaPanel && (
              <div className="flex w-80 shrink-0 scrollbar-thin flex-col gap-4 overflow-y-auto border-r-0 border-l border-border bg-muted/10 p-5 font-sans text-xs select-none">
                <h4 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
                  <FileImage className="h-4 w-4 text-primary" />
                  Properties Info
                </h4>

                {/* Basic file attributes */}
                <div className="space-y-2 border-b border-border pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Parent Folder</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="max-w-44 cursor-pointer overflow-hidden text-right text-xs font-medium text-foreground"
                          onClick={handleOpenFolder}
                        >
                          <div className="inline-block whitespace-nowrap animate-marquee-pingpong">
                            {item.path.substring(
                              0,
                              Math.max(item.path.lastIndexOf("/"), item.path.lastIndexOf("\\"))
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs break-all select-text">
                        {item.path.substring(
                          0,
                          Math.max(item.path.lastIndexOf("/"), item.path.lastIndexOf("\\"))
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Size</span>
                    <span className="font-medium text-foreground">
                      {formatBytes(item.size)}
                    </span>
                  </div>
                  {item.width && item.height && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions</span>
                      <span className="font-medium text-foreground">
                        {item.width} x {item.height}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extension</span>
                    <span className="font-medium text-foreground uppercase">
                      {item.extension}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-3 border-b border-border pb-4">
                  <h5 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    Dates
                  </h5>

                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Resolved Date ({resolvedSourceLabel})
                    </span>
                    <span className="max-w-44 truncate font-bold text-primary">
                      {targetDate}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> EXIF Date
                    </span>
                    <span className="max-w-44 truncate font-medium text-foreground">
                      {exifDate}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> Filename Inferred Date
                    </span>
                    <span className="max-w-44 truncate font-medium text-foreground">
                      {inferredDate}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> File System Created
                    </span>
                    <span className="max-w-44 truncate font-medium text-foreground">
                      {fsDate}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> File System Updated
                    </span>
                    <span className="max-w-44 truncate font-medium text-foreground">
                      {item.dateModified ? formatDate(item.dateModified) : "None"}
                    </span>
                  </div>
                </div>

                {/* Quality details */}
                {hasQuality && (
                  <div className="space-y-3">
                    <h5 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                      Quality Score Indicators
                    </h5>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Composite Score
                      </span>
                      <Badge
                        variant={
                          item.quality!.compositeScore < 50
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-2xs font-bold"
                      >
                        {item.quality!.compositeScore} / 100
                      </Badge>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blur Check</span>
                      <span
                        className={`font-semibold ${item.quality!.isBlurry ? "text-destructive" : "text-green-500"}`}
                      >
                        {item.quality!.isBlurry ? "Blurry" : "Sharp"} (
                        {item.quality!.blurScore})
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Exposure Check
                      </span>
                      <span
                        className={`font-semibold ${item.quality!.isDark ? "text-destructive" : "text-green-500"}`}
                      >
                        {item.quality!.isDark
                          ? "Dark / Underexposed"
                          : "Normal Exposure"}{" "}
                        ({item.quality!.brightness})
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Screenshot Flag
                      </span>
                      <span className="font-semibold text-foreground">
                        {item.quality!.isScreenshot ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action utilities */}
                <div className="mt-auto border-t border-border pt-4">
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl border-border text-xs"
                    onClick={handleOpenFolder}
                  >
                    <FolderOpen className="h-4 w-4" />
                    Show in {getFileManagerName()}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

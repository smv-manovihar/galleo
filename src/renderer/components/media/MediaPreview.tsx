import React, { useState, useEffect, useRef, useCallback } from "react"
import type { MediaItem } from "../../../shared/types/media"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { VideoPlayer } from "./VideoPlayer"
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
  const videoPlayerRef = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [activeItem, setActiveItem] = useState<MediaItem | null>(null)

  useEffect(() => {
    if (propItem) {
      setActiveItem(propItem)
    }
  }, [propItem])

  const item = propItem || activeItem

  const currentIndex =
    items && item ? items.findIndex((i) => i.id === item.id) : -1
  const hasPrevious = currentIndex > 0
  const hasNext = items ? currentIndex < items.length - 1 : false

  const handlePrevious = useCallback(() => {
    if (items && hasPrevious && onItemChange) {
      onItemChange(items[currentIndex - 1])
    }
  }, [items, hasPrevious, onItemChange, currentIndex])

  const handleNext = useCallback(() => {
    if (items && hasNext && onItemChange) {
      onItemChange(items[currentIndex + 1])
    }
  }, [items, hasNext, onItemChange, currentIndex])

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
    resetControlsTimeout()
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [isFullscreen, resetControlsTimeout])

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
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [propItem?.id])

  const toggleFullscreen = async () => {
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
  }

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4))
  }

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1)
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handleZoomReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent) => {
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
    let newScale = scale + (e.deltaY < 0 ? zoomFactor : -zoomFactor)
    newScale = Math.max(1, Math.min(newScale, 4))

    if (newScale === 1) {
      setPosition({ x: 0, y: 0 })
    }
    setScale(newScale)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
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

    if (scale <= 1) return
    e.preventDefault()
    setIsPanning(true)
    setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return
    setPosition({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    })
  }

  const handlePointerUp = () => {
    setIsPanning(false)
  }

  if (!item) return null

  const isVideo = item.mediaType === "video"
  const hasQuality = item.quality !== undefined

  // Format dates
  const exifDate = item.dateOriginal ? formatDate(item.dateOriginal) : "None"
  const inferredDate = item.dateInferred
    ? formatDate(item.dateInferred)
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
        width="5xl"
        height="2xl"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex flex-col gap-0 overflow-hidden border-border bg-card/95 p-0 font-sans text-foreground backdrop-blur-md"
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
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-accent"
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
              className="relative flex h-full flex-1 items-center justify-center overflow-hidden bg-black p-6 select-none"
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
              style={{
                cursor:
                  isFullscreen && !showControls
                    ? "none"
                    : scale > 1
                      ? isPanning
                        ? "grabbing"
                        : "grab"
                      : "default",
              }}
            >
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transition: isPanning ? "none" : "transform 0.15s ease-out",
                  cursor:
                    scale > 1 ? (isPanning ? "grabbing" : "grab") : "default",
                }}
                className="pointer-events-none flex h-full w-full items-center justify-center"
              >
                <div className="pointer-events-auto max-h-full max-w-full">
                  {isVideo ? (
                    <VideoPlayer
                      ref={videoPlayerRef}
                      src={safeSrc}
                      poster={
                        item.thumbnailPath
                          ? `media:///${item.thumbnailPath.replace(/\\/g, "/")}`
                          : undefined
                      }
                      className="w-full max-w-3xl"
                      hideFullscreen={false}
                      autoPlay={autoPlay}
                    />
                  ) : (
                    <img
                      src={safeSrc}
                      alt={item.name}
                      className="pointer-events-none max-h-[60vh] max-w-full object-contain shadow-lg select-none"
                    />
                  )}
                </div>
              </div>

              {/* Zoom Controls */}
              <div
                className={`absolute top-4 right-4 z-30 flex gap-1 rounded-lg border border-white/10 bg-black/60 p-1 backdrop-blur-xs transition-opacity duration-300 ${!isFullscreen || showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
              >
                {isFullscreen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
                    onClick={toggleFullscreen}
                    title="Exit Fullscreen"
                  >
                    <Minimize className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="flex min-w-[44px] items-center justify-center px-2 font-mono text-2xs text-white">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
                  onClick={handleZoomIn}
                  disabled={scale >= 4}
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer rounded-md text-2xs font-semibold text-white hover:bg-white/10"
                  onClick={handleZoomReset}
                  disabled={scale === 1}
                  title="Reset Zoom"
                >
                  1:1
                </Button>
              </div>

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

                {/* Quality details */}
                {hasQuality && (
                  <div className="space-y-3 border-b border-border pb-4">
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

                {/* Resolved Target Date */}
                <div className="space-y-3 border-b border-border pb-4">
                  <h5 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    Canonical Organization Date
                  </h5>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Resolved Date</span>
                    <span className="font-bold text-primary">
                      {formatDate(item.dateTarget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Resolved Source
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-2xs font-semibold"
                    >
                      {item.dateTargetSource === "exif" && "EXIF Metadata"}
                      {item.dateTargetSource === "filename" &&
                        "Filename Inferred"}
                      {item.dateTargetSource === "filesystem" &&
                        "Filesystem Fallback"}
                    </Badge>
                  </div>
                </div>

                {/* Date resolutions info */}
                <div className="space-y-3">
                  <h5 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    Target Date Fallback Chain
                  </h5>

                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> EXIF Original
                    </span>
                    <span className="max-w-44 truncate font-medium text-foreground">
                      {exifDate}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> Filename Inferred
                    </span>
                    <span className="max-w-44 truncate font-medium text-foreground">
                      {inferredDate}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" /> Filesystem Creation
                    </span>
                    <span className="max-w-44 truncate font-medium text-foreground">
                      {fsDate}
                    </span>
                  </div>
                </div>

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

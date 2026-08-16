import React, { useCallback, useMemo } from "react"
import type { MediaItem } from "../../../shared/types/media"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bookmark,
  Trash2,
  Maximize,
  Play,
  Star,
} from "lucide-react"
import { formatBytes } from "../../lib/format"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { QualityScoreBadge } from "../media/QualityScoreBadge"

export interface DuplicateAuditCardProps {
  item: MediaItem
  isBest: boolean
  reviewState: "keep" | "delete" | "pending" | "skipped"
  isFocused?: boolean
  className?: string
  onClick: (id: string) => void
  onPreview: (item: MediaItem, withAutoPlay: boolean) => void
  onInfoOpen?: (item: MediaItem) => void
  onReviewAction?: (id: string, state: "keep" | "delete") => void
  onFindSimilar?: (mediaId: string) => void
  onContextMenu?: (item: MediaItem, e: React.MouseEvent) => void
}

export const DuplicateAuditCard = React.memo<DuplicateAuditCardProps>(({
  item,
  isBest,
  reviewState,
  isFocused = false,
  className,
  onClick,
  onPreview,
  onContextMenu,
}) => {
  const isVideo = item.mediaType === "video"
  const isMarkedKeep = reviewState === "keep"
  const isMarkedDelete = reviewState === "delete"

  const rawPath = item.thumbnailPath || item.path
  const safeThumbnailSrc = rawPath
    ? `media:///${rawPath.replace(/\\/g, "/")}`
    : null

  const dateStr = useMemo(() => {
    if (!item.dateTarget) return ""
    return item.dateTarget.slice(0, 10)
  }, [item.dateTarget])

  const dimensionsStr = useMemo(() => {
    if (item.width && item.height) {
      return `${item.width} × ${item.height}`
    }
    if (isVideo && item.duration) {
      const mins = Math.floor(item.duration / 60)
      const secs = Math.floor(item.duration % 60)
      return `${mins}:${secs < 10 ? "0" : ""}${secs}`
    }
    return null
  }, [item.width, item.height, isVideo, item.duration])

  const handleClick = useCallback(() => {
    onClick(item.id)
  }, [onClick, item.id])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPreview(item, isVideo)
  }, [onPreview, item, isVideo])

  const handlePreviewBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPreview(item, false)
  }, [onPreview, item])

  const handlePlayBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPreview(item, true)
  }, [onPreview, item])

  return (
    <Card
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault()
          onContextMenu(item, e)
        }
      }}
      style={{ contain: "layout paint" }}
      className={cn(
        "group relative flex w-full min-w-0 cursor-pointer overflow-hidden border bg-neutral-950/80 p-0 py-0 gap-0 transition-all duration-155 select-none",
        className ?? "h-full min-h-0",
        // Focus ring — indigo, always on top, glow shadow wins over state shadows
        isFocused && "relative z-10 ring-2 ring-indigo-400/60 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]",
        // State border + background (shadow only when not focused to avoid conflict)
        isMarkedKeep
          ? cn("border-green-500/50 bg-green-500/5", !isFocused && "shadow-xs shadow-green-500/10")
          : isMarkedDelete
            ? "border-destructive/50 bg-destructive/5"
            : isBest
              ? cn("border-primary/50 bg-primary/5", !isFocused && "shadow-xs shadow-primary/10")
              : "border-border hover:border-muted-foreground/45"
      )}
    >
      {/* Media Preview Container */}
      <div className="relative flex flex-1 min-h-0 w-full flex-col justify-end overflow-hidden bg-neutral-950/80 p-0">
        {safeThumbnailSrc ? (
          <img
            src={safeThumbnailSrc}
            alt={item.name}
            style={
              item.orientation
                ? { transform: `rotate(${item.orientation}deg)` }
                : undefined
            }
            className="pointer-events-none absolute inset-0 h-full w-full object-contain transition-transform duration-300 select-none group-hover:scale-102"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold tracking-wider text-muted-foreground uppercase">
            {item.extension}
          </div>
        )}

        {/* Badges Container (Top-Left) */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
          {isBest && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group/best relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-border/50 bg-black/65 shadow-xs backdrop-blur-md select-none">
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/35 to-transparent animate-[shimmer-sweep_2.1s_ease-in-out_infinite]" />
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Best Choice</TooltipContent>
            </Tooltip>
          )}

          <QualityScoreBadge item={item} side="right" />
        </div>

        {/* Video Play Button Overlay */}
        {isVideo && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={handlePlayBtn}
              className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white shadow-md backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
            >
              <Play className="size-5 fill-current text-white pl-0.5" />
            </button>
          </div>
        )}

        {/* Action Buttons Overlay (Top-Right) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/60 p-0.5 shadow-sm backdrop-blur-md">
            {/* Toggle Status (Keep / Delete / Pending) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClick()
                  }}
                  className={cn(
                    "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold shadow-xs backdrop-blur-md transition-colors select-none",
                    isMarkedKeep
                      ? "border border-emerald-500/40 bg-emerald-950/90 text-emerald-200 hover:bg-emerald-900/90"
                      : isMarkedDelete
                        ? "border border-red-500/40 bg-red-950/90 text-red-200 hover:bg-red-900/90"
                        : "border border-white/20 bg-black/60 text-white hover:bg-black/75"
                  )}
                >
                  {isMarkedKeep ? (
                    <>
                      <Bookmark className="size-3.5 fill-current text-emerald-400" />
                      <span>Keep</span>
                    </>
                  ) : isMarkedDelete ? (
                    <>
                      <Trash2 className="size-3.5 text-red-400" />
                      <span>Delete</span>
                    </>
                  ) : (
                    <span>Pending</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isMarkedKeep
                  ? "Marked to Keep (click to toggle)"
                  : isMarkedDelete
                    ? "Marked for Deletion (click to toggle)"
                    : "Pending Review (click to toggle)"}
              </TooltipContent>
            </Tooltip>

            {/* Preview Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviewBtn}
                  className="h-7 w-7 cursor-pointer rounded-md text-white/80 hover:bg-white/20 hover:text-white"
                >
                  <Maximize className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview Media</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Gradient Scrim Overlay at Bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/85 via-black/45 to-transparent" />

        {/* Overlaid File Details */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-0.5 px-3 pt-5 pb-2 text-white">
          {/* Filename */}
          <div
            className="pointer-events-auto cursor-text text-white select-text"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span
              className="block truncate text-xs font-semibold leading-tight text-white/95"
              title={item.name}
            >
              {item.name}
            </span>
          </div>

          {/* Metrics row */}
          <div className="pointer-events-none flex items-center justify-between gap-2 text-2xs text-white/80 select-none">
            <div className="flex min-w-0 items-center gap-1.5 truncate">
              {dimensionsStr && <span>{dimensionsStr}</span>}
              {dimensionsStr && dateStr && <span className="text-white/40">·</span>}
              {dateStr && <span>{dateStr}</span>}
            </div>
            <span className="shrink-0 text-xs font-bold tabular-nums text-white">
              {formatBytes(item.size)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
})

DuplicateAuditCard.displayName = "DuplicateAuditCard"

import React, { useMemo, useState } from "react"
import type { MediaItem } from "../../../shared/types/media"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Play,
  Trash2,
  Bookmark,
  ExternalLink,
  Eye,
  Info,
  FolderOpen,
  MoreVertical,
  Sparkles,
} from "lucide-react"
import { formatBytes } from "../../lib/format"
import { getFileManagerName } from "../../lib/os"
import { ENABLE_AI_FEATURES } from "../../../shared/constants"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { QualityScoreBadge } from "./QualityScoreBadge"

interface MediaCardProps {
  item: MediaItem
  isSelected: boolean
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onInfoOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
  matchingFrame?: {
    timestampSeconds: number
    thumbnailPath?: string
  }
  searchScore?: number
  onFindSimilar?: (mediaId: string) => void
  onPlayOpen?: (item: MediaItem) => void
}

const MediaCardThumb: React.FC<{ item: MediaItem; thumbUrl: string }> = ({
  item,
  thumbUrl,
}) => {
  const isVideo = item.mediaType === "video"
  const [imgError, setImgError] = useState(false)

  const fallback = (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-muted/40 text-muted-foreground ${
        item.reviewState === "delete" ? "opacity-40" : ""
      }`}
    >
      <span className="text-xs font-bold uppercase">{item.extension}</span>
    </div>
  )

  if (!thumbUrl || imgError || !(item.thumbnailPath || !isVideo)) {
    return fallback
  }

  return (
    <img
      src={thumbUrl}
      alt={item.name}
      onError={() => setImgError(true)}
      style={
        item.orientation
          ? { transform: `rotate(${item.orientation}deg)` }
          : undefined
      }
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-300 select-none group-hover:scale-105 ${
        item.reviewState === "delete" ? "opacity-40" : ""
      }`}
    />
  )
}

const MediaCardInner: React.FC<MediaCardProps> = ({
  item,
  isSelected,
  onSelectToggle,
  onPreviewOpen,
  onInfoOpen,
  onReviewAction,
  matchingFrame,
  searchScore,
  onFindSimilar,
  onPlayOpen,
}) => {
  const isVideo = item.mediaType === "video"
  const hasQuality = item.quality !== undefined

  const thumbUrl = useMemo(() => {
    const rawPath = item.thumbnailPath || item.path
    if (!rawPath) return ""
    return `media:///${rawPath.replace(/\\/g, "/")}`
  }, [item.thumbnailPath, item.path])

  const dateStr = useMemo(() => {
    if (!item.dateTarget) return ""
    return item.dateTarget.slice(0, 10)
  }, [item.dateTarget])

  const getBorderColor = () => {
    if (isSelected) return "border-primary ring-1 ring-primary"
    if (item.reviewState === "keep") return "border-green-500/50 bg-green-500/5"
    if (item.reviewState === "delete")
      return "border-destructive/50 bg-destructive/5"
    return "border-border hover:border-muted-foreground/45"
  }

  const handleOpenFolder = async () => {
    await window.api.showFile(item.path)
  }

  const handleOpenFile = async () => {
    await window.api.openFile(item.path)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          className={`group cursor-pointer overflow-hidden border bg-card/40 p-0 py-0 transition-colors duration-150 select-none ${getBorderColor()}`}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              onSelectToggle(item.id, e)
            } else {
              onPreviewOpen(item)
            }
          }}
        >
          <CardHeader className="hidden">
            <CardTitle>{item.name}</CardTitle>
          </CardHeader>
          <CardContent className="relative flex aspect-square flex-col justify-end bg-muted/20 p-0">
            {/* Thumbnail */}
            <MediaCardThumb key={thumbUrl} item={item} thumbUrl={thumbUrl} />

            {/* Gradient overlay — grows on hover to make room for action bar */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

            {/* Quality Score & Warning Badge (Top-Left) */}
            {hasQuality && (
              <div className="absolute top-2 left-2 z-20">
                <QualityScoreBadge item={item} side="top" />
              </div>
            )}

            {/* Matching Video Timestamp Badge */}
            {isVideo && matchingFrame && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-md bg-purple-600/90 px-2 py-0.5 text-xs font-semibold text-white shadow-md backdrop-blur-sm">
                <span>
                  ⏱{" "}
                  {`${Math.floor(matchingFrame.timestampSeconds / 60)}:${
                    Math.floor(matchingFrame.timestampSeconds % 60) < 10
                      ? "0"
                      : ""
                  }${Math.floor(matchingFrame.timestampSeconds % 60)}`}
                </span>
              </div>
            )}

            {/* Search Match Confidence Score Badge */}
            {searchScore !== undefined && searchScore > 0 && (
              <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-md bg-blue-600/90 px-2 py-0.5 text-xs font-semibold text-white shadow-md backdrop-blur-sm">
                <span>{Math.round(searchScore * 100)}% match</span>
              </div>
            )}

            {/* Video Play Indicator */}
            {isVideo && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div
                  className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/60 text-white shadow-md backdrop-blur-sm transition-all duration-200 group-hover:scale-110 group-hover:border-primary/50 group-hover:bg-primary group-hover:text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onPlayOpen) {
                      onPlayOpen(item)
                    } else {
                      onPreviewOpen(item)
                    }
                  }}
                  title="Play Video"
                >
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </div>
              </div>
            )}

            {/* Review state badges (top-right, always visible) */}
            {item.reviewState === "keep" && (
              <div className="absolute top-2 right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                <Bookmark className="h-3 w-3 fill-white" />
              </div>
            )}
            {item.reviewState === "delete" && (
              <div className="absolute top-2 right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm">
                <Trash2 className="h-3 w-3" />
              </div>
            )}

            {/* Hover action bar — file info + quick action buttons */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 px-2 pt-6 pb-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {/* Filename + meta */}
              <div
                className="pointer-events-auto cursor-text text-white select-text"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span
                  className="block truncate text-sm leading-tight font-semibold"
                  title={item.name}
                >
                  {item.name}
                </span>
                <div className="pointer-events-none mt-0.5 flex items-center justify-between text-xs opacity-75 select-none">
                  <span>{dateStr}</span>
                  <span>{formatBytes(item.size)}</span>
                </div>
              </div>

              {/* Action buttons row */}
              <div
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Keep */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 flex-1 rounded-md transition-colors ${
                        item.reviewState === "keep"
                          ? "cursor-default border border-green-500/60 bg-green-500/40 text-green-200 shadow-xs ring-1 ring-green-500/40 hover:border-green-500/75! hover:bg-green-500/55! hover:text-green-100!"
                          : item.reviewState === "delete"
                            ? "cursor-pointer border border-green-500/15 bg-green-500/10 text-green-400/50 hover:border-green-500/40! hover:bg-green-500/30! hover:text-green-200!"
                            : "cursor-pointer border border-green-500/25 bg-green-500/20 text-green-400 hover:border-green-500/50! hover:bg-green-500/50! hover:text-green-200!"
                      }`}
                      onClick={
                        item.reviewState === "keep"
                          ? undefined
                          : () => onReviewAction(item.id, "keep")
                      }
                    >
                      <Bookmark
                        className={`size-4 ${
                          item.reviewState === "keep"
                            ? "fill-current"
                            : "fill-current opacity-80"
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {item.reviewState === "keep" ? "Kept" : "Keep"}
                  </TooltipContent>
                </Tooltip>

                {/* Delete */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 flex-1 rounded-md transition-colors ${
                        item.reviewState === "delete"
                          ? "cursor-default border border-red-500/60 bg-red-500/40 text-red-200 shadow-xs ring-1 ring-red-500/40 hover:border-red-500/75! hover:bg-red-500/55! hover:text-red-100!"
                          : item.reviewState === "keep"
                            ? "cursor-pointer border border-red-500/15 bg-red-500/10 text-red-400/50 hover:border-red-500/40! hover:bg-red-500/30! hover:text-red-200!"
                            : "cursor-pointer border border-red-500/25 bg-red-500/20 text-red-400 hover:border-red-500/50! hover:bg-red-500/50! hover:text-red-200!"
                      }`}
                      onClick={
                        item.reviewState === "delete"
                          ? undefined
                          : () => onReviewAction(item.id, "delete")
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {item.reviewState === "delete" ? "Marked Delete" : "Delete"}
                  </TooltipContent>
                </Tooltip>

                {/* More (secondary actions) */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer rounded-md border border-white/15 bg-white/10 text-white/80 transition-colors hover:border-white/30! hover:bg-white/30! hover:text-white!"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>More Options</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    align="end"
                    className="w-44 border-border bg-card/95 font-sans text-sm text-foreground backdrop-blur-md"
                  >
                    <DropdownMenuItem
                      onClick={() => onInfoOpen(item)}
                      className="cursor-pointer gap-3"
                    >
                      <Info className="size-4" />
                      File Info
                    </DropdownMenuItem>
                    {onFindSimilar && ENABLE_AI_FEATURES && (
                      <DropdownMenuItem
                        onClick={() => onFindSimilar(item.id)}
                        className="cursor-pointer gap-3 text-primary"
                      >
                        <Sparkles className="size-4" />
                        Find Similar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleOpenFile}
                      className="cursor-pointer gap-3"
                    >
                      <ExternalLink className="size-4" />
                      Open in default app
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleOpenFolder}
                      className="cursor-pointer gap-3"
                    >
                      <FolderOpen className="size-4" />
                      Show in {getFileManagerName()}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>

      {/* Right-click context menu */}
      <ContextMenuContent className="w-44 border-border bg-card font-sans text-sm text-foreground">
        <ContextMenuItem
          onClick={() => onPreviewOpen(item)}
          className="gap-3"
        >
          <Eye className="size-4" />
          Preview File
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onInfoOpen(item)} className="gap-3">
          <Info className="size-4" />
          File Info
        </ContextMenuItem>
        {onFindSimilar && ENABLE_AI_FEATURES && (
          <ContextMenuItem
            onClick={() => onFindSimilar(item.id)}
            className="gap-3 text-primary focus:text-primary"
          >
            <Sparkles className="size-4" />
            Find Similar
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onReviewAction(item.id, "keep")}
          className="gap-3 text-green-500 focus:text-green-500"
        >
          <Bookmark className="size-4" />
          Mark to Keep
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onReviewAction(item.id, "delete")}
          className="gap-3 text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          Mark to Delete
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleOpenFile} className="gap-3">
          <ExternalLink className="size-4" />
          Open in default app
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenFolder} className="gap-3">
          <FolderOpen className="size-4" />
          Show in {getFileManagerName()}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export const MediaCard = React.memo(MediaCardInner, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.path === next.item.path &&
    prev.item.name === next.item.name &&
    prev.item.size === next.item.size &&
    prev.item.reviewState === next.item.reviewState &&
    prev.item.thumbnailPath === next.item.thumbnailPath &&
    prev.item.orientation === next.item.orientation &&
    prev.item.quality?.compositeScore === next.item.quality?.compositeScore &&
    prev.searchScore === next.searchScore &&
    prev.matchingFrame?.timestampSeconds === next.matchingFrame?.timestampSeconds &&
    prev.matchingFrame?.thumbnailPath === next.matchingFrame?.thumbnailPath &&
    prev.isSelected === next.isSelected &&
    prev.onSelectToggle === next.onSelectToggle &&
    prev.onPreviewOpen === next.onPreviewOpen &&
    prev.onInfoOpen === next.onInfoOpen &&
    prev.onReviewAction === next.onReviewAction &&
    prev.onFindSimilar === next.onFindSimilar &&
    prev.onPlayOpen === next.onPlayOpen
  )
})

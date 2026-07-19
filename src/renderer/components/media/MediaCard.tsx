import React, { useMemo, useState, useEffect } from "react"
import type { MediaItem } from "../../../shared/types/media"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Play,
  Trash2,
  Bookmark,
  AlertTriangle,
  ExternalLink,
  Eye,
  Info,
  FolderOpen,
  MoreVertical,
} from "lucide-react"
import { formatBytes } from "../../lib/format"
import { getFileManagerName } from "../../lib/os"
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
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MediaCardProps {
  item: MediaItem
  isSelected: boolean
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onInfoOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
}

const MediaCardInner: React.FC<MediaCardProps> = ({
  item,
  isSelected,
  onSelectToggle,
  onPreviewOpen,
  onInfoOpen,
  onReviewAction,
}) => {
  const isVideo = item.mediaType === "video"
  const hasQuality = item.quality !== undefined

  const [imgError, setImgError] = useState(false)

  const thumbUrl = useMemo(() => {
    const rawPath = item.thumbnailPath || item.path
    if (!rawPath) return ""
    return `media:///${rawPath.replace(/\\/g, "/")}`
  }, [item.thumbnailPath, item.path])

  useEffect(() => {
    setImgError(false)
  }, [thumbUrl])

  const qualityFlags = useMemo(() => {
    if (!item.quality) return []
    const reasons: string[] = []
    if (item.quality.isBlurry) reasons.push("Blurry")
    if (item.quality.isDark) reasons.push("Underexposed")
    if (item.quality.isScreenshot) reasons.push("Screenshot")
    if (item.quality.isSmall) reasons.push("Low Resolution")
    if (item.quality.compositeScore < 50 && reasons.length === 0)
      reasons.push("Low Quality Score")
    return reasons
  }, [item.quality])

  const isFlagged =
    hasQuality && qualityFlags.length > 0 && item.reviewState === "pending"

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
            {thumbUrl && !imgError && (item.thumbnailPath || !isVideo) ? (
              <img
                key={thumbUrl}
                src={thumbUrl}
                alt={item.name}
                onError={() => setImgError(true)}
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-300 select-none group-hover:scale-105 ${
                  item.reviewState === "delete" ? "opacity-40" : ""
                }`}
              />
            ) : (
              <div
                className={`absolute inset-0 flex items-center justify-center bg-muted/40 text-muted-foreground ${
                  item.reviewState === "delete" ? "opacity-40" : ""
                }`}
              >
                <span className="text-2xs font-bold uppercase">
                  {item.extension}
                </span>
              </div>
            )}

            {/* Gradient overlay — grows on hover to make room for action bar */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

            {/* Quality Score & Warning Badge (Top-Left) */}
            {hasQuality && (
              <div className="absolute top-2 left-2 z-20">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold shadow-xs backdrop-blur-md transition-colors ${
                        isFlagged
                          ? "border border-amber-500/40 bg-amber-950/85 text-amber-200"
                          : item.quality!.compositeScore < 50
                            ? "border border-red-500/40 bg-red-950/85 text-red-200"
                            : "border border-white/15 bg-black/75 text-white/90"
                      }`}
                    >
                      {isFlagged && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      )}
                      <span className="tabular-nums">
                        {item.quality!.compositeScore}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="font-sans text-xs">
                    {isFlagged ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-semibold text-amber-400 dark:text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Flagged for Quality</span>
                        </div>
                        <p className="text-2xs text-muted-foreground">
                          {qualityFlags.join(" • ")} (Score:{" "}
                          {item.quality!.compositeScore})
                        </p>
                      </div>
                    ) : (
                      <span>
                        Quality Score: {item.quality!.compositeScore}/100
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Video Play Indicator */}
            {isVideo && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-sm">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
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
              <div className="pointer-events-none text-white">
                <span className="block truncate text-sm leading-tight font-semibold">
                  {item.name}
                </span>
                <div className="mt-0.5 flex items-center justify-between text-[0.5625rem] opacity-75">
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
                      className="h-7 flex-1 cursor-pointer rounded-md border border-green-500/25 bg-green-500/20 text-green-400 transition-colors hover:border-green-500/50! hover:bg-green-500/50! hover:text-green-200!"
                      onClick={() => onReviewAction(item.id, "keep")}
                    >
                      <Bookmark className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Keep File</TooltipContent>
                </Tooltip>

                {/* Delete */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 flex-1 cursor-pointer rounded-md border border-red-500/25 bg-red-500/20 text-red-400 transition-colors hover:border-red-500/50! hover:bg-red-500/50! hover:text-red-200!"
                      onClick={() => onReviewAction(item.id, "delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete File</TooltipContent>
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
                          <MoreVertical className="h-3.5 w-3.5" />
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
                      className="cursor-pointer gap-2.5"
                    >
                      <Info className="h-3.5 w-3.5" />
                      File Info
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleOpenFile}
                      className="cursor-pointer gap-2.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in default app
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleOpenFolder}
                      className="cursor-pointer gap-2.5"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
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
          className="gap-2.5"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview File
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onInfoOpen(item)} className="gap-2.5">
          <Info className="h-3.5 w-3.5" />
          File Info
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onReviewAction(item.id, "keep")}
          className="gap-2.5 text-green-500 focus:text-green-500"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Mark to Keep
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onReviewAction(item.id, "delete")}
          className="gap-2.5 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Mark to Delete
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleOpenFile} className="gap-2.5">
          <ExternalLink className="h-3.5 w-3.5" />
          Open in default app
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenFolder} className="gap-2.5">
          <FolderOpen className="h-3.5 w-3.5" />
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
    prev.item.quality?.compositeScore === next.item.quality?.compositeScore &&
    prev.isSelected === next.isSelected &&
    prev.onSelectToggle === next.onSelectToggle &&
    prev.onPreviewOpen === next.onPreviewOpen &&
    prev.onInfoOpen === next.onInfoOpen &&
    prev.onReviewAction === next.onReviewAction
  )
})

import React from "react"
import type { MediaItem } from "../../../shared/types/media"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  onPreviewOpen,
  onInfoOpen,
  onReviewAction,
}) => {
  const isVideo = item.mediaType === "video"
  const hasQuality = item.quality !== undefined
  const hasWarning =
    hasQuality &&
    (item.quality!.isBlurry || item.quality!.isDark) &&
    item.reviewState === "pending"

  const dateStr = new Date(item.dateTarget).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  })

  const getBorderColor = () => {
    if (isSelected) return "border-primary ring-1 ring-primary"
    if (item.reviewState === "keep") return "border-green-500/50 bg-green-500/5"
    if (item.reviewState === "delete")
      return "border-destructive/50 bg-destructive/5 opacity-60"
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
          onClick={() => onPreviewOpen(item)}
        >
          <CardHeader className="hidden">
            <CardTitle>{item.name}</CardTitle>
          </CardHeader>
          <CardContent className="relative flex aspect-square flex-col justify-end bg-muted/20 p-0">
            {/* Thumbnail */}
            {item.thumbnailPath || !isVideo ? (
              <img
                src={`media:///${(item.thumbnailPath || item.path).replace(/\\/g, "/")}`}
                alt={item.name}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-300 select-none group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-muted-foreground">
                <span className="text-2xs font-bold uppercase">
                  {item.extension}
                </span>
              </div>
            )}

            {/* Gradient overlay — grows on hover to make room for action bar */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

            {/* Quality Score Badge */}
            {hasQuality && (
              <div className="pointer-events-none absolute top-2 left-2 z-10">
                <Badge
                  variant={
                    item.quality!.compositeScore < 50
                      ? "destructive"
                      : "secondary"
                  }
                  className={`border-0 px-1.5 py-0 text-[0.5625rem] ${
                    item.quality!.compositeScore < 50
                      ? "text-destructive-foreground bg-destructive/90"
                      : "bg-background/80 text-foreground backdrop-blur"
                  }`}
                >
                  {item.quality!.compositeScore}
                </Badge>
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

            {/* Defect warning (bottom-right, always visible) */}
            {hasWarning && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute right-2 bottom-2 z-20 flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-yellow-500 text-white shadow-sm">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Flagged quality warnings
                </TooltipContent>
              </Tooltip>
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
                  <TooltipContent side="top">Keep File</TooltipContent>
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
                  <TooltipContent side="top">Delete File</TooltipContent>
                </Tooltip>

                {/* More (secondary actions) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className="shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 cursor-pointer rounded-md border border-white/15 bg-white/10 text-white/80 transition-colors hover:border-white/30! hover:bg-white/30! hover:text-white!"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">More Options</TooltipContent>
                      </Tooltip>
                    </span>
                  </DropdownMenuTrigger>
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
                      Show in Explorer
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
          Show in Explorer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export const MediaCard = React.memo(MediaCardInner, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.reviewState === next.item.reviewState &&
    prev.item.thumbnailPath === next.item.thumbnailPath &&
    prev.isSelected === next.isSelected &&
    prev.onSelectToggle === next.onSelectToggle &&
    prev.onPreviewOpen === next.onPreviewOpen &&
    prev.onInfoOpen === next.onInfoOpen &&
    prev.onReviewAction === next.onReviewAction
  )
})

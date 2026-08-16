import React, { useState, useCallback } from "react"
import type { MediaItem } from "../../../../shared/types/media"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  Bookmark,
  Trash2,
  ArrowLeftRight,
  Eye,
  FolderOpen,
  Play,
  FileImage,
  Video,
} from "lucide-react"
import { formatBytes, formatShortDate } from "../../../lib/format"
import { getDirPath, getFilenameAndExt } from "./types"

interface DuplicateAuditExactRowProps {
  item: MediaItem
  isKeep: boolean
  groupIdx: number
  onSwapKeep?: (groupIdx: number, newKeepId: string) => void
  onPreview: (item: MediaItem) => void
  onContextMenu?: (item: MediaItem, e: React.MouseEvent) => void
}

export const DuplicateAuditExactRow = React.memo<DuplicateAuditExactRowProps>(
  ({ item, isKeep, groupIdx, onSwapKeep, onPreview, onContextMenu }) => {
    const [imgError, setImgError] = useState(false)
    const isVideo = item.mediaType === "video"
    const dirPath = getDirPath(item.path)
    const { base, ext } = getFilenameAndExt(item.name)

    const rawSrc = item.thumbnailPath || item.path
    const thumbnailSrc = !imgError && rawSrc ? `media:///${rawSrc.replace(/\\/g, "/")}` : null

    const handleRowClick = useCallback(() => {
      if (!isKeep && onSwapKeep) {
        onSwapKeep(groupIdx, item.id)
      }
    }, [isKeep, onSwapKeep, groupIdx, item.id])

    const handleSwapClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onSwapKeep) {
          onSwapKeep(groupIdx, item.id)
        }
      },
      [onSwapKeep, groupIdx, item.id]
    )

    const handlePreviewClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onPreview(item)
      },
      [onPreview, item]
    )

    const handleRevealClick = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
          await window.api.showFile(item.path)
        } catch (err) {
          console.error("Failed to reveal file:", err)
        }
      },
      [item.path]
    )

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(item, e)
      },
      [onContextMenu, item]
    )

    const formattedDate = item.dateTarget ? formatShortDate(item.dateTarget) : null
    const dimensions = item.width && item.height ? `${item.width}×${item.height}` : null

    const handleImgError = useCallback(() => {
      setImgError(true)
    }, [])

    return (
      <div
        onClick={handleRowClick}
        onDoubleClick={handlePreviewClick}
        onContextMenu={handleContextMenu}
        className={`group/row relative flex items-center gap-3 px-3.5 py-2.5 transition-all duration-200 select-none ${
          isKeep
            ? "border-l-2 border-l-emerald-500 bg-emerald-500/6 dark:bg-emerald-500/10"
            : "cursor-pointer border-l-2 border-l-destructive/30 bg-card hover:bg-muted/50 hover:border-l-muted-foreground/30 dark:bg-card dark:hover:bg-muted/30"
        }`}
      >
        {/* Thumbnail Preview */}
        <div
          className="group/thumb relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40 shadow-2xs transition-all hover:border-primary/60 hover:shadow-xs"
          onClick={handlePreviewClick}
          title="Click to preview"
        >
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={item.name}
              onError={handleImgError}
              style={
                item.orientation
                  ? { transform: `rotate(${item.orientation}deg)` }
                  : undefined
              }
              className="h-full w-full object-cover transition-transform duration-200 group-hover/thumb:scale-110"
            />
          ) : isVideo ? (
            <Video className="size-5 text-muted-foreground/70" />
          ) : (
            <FileImage className="size-5 text-muted-foreground/70" />
          )}

          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="flex size-5 items-center justify-center rounded-full bg-black/60 text-white">
                <Play className="ml-0.5 size-2.5 fill-current" />
              </div>
            </div>
          )}
        </div>

        {/* File Name & Path Details */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-xs font-semibold text-foreground">
              {base}
              <span className="text-muted-foreground font-normal">{ext}</span>
            </span>
          </div>

          {/* Folder Path - Tooltip only triggers on the actual path text */}
          <div className="flex items-center min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block max-w-full truncate text-xs text-muted-foreground/80 hover:text-foreground cursor-pointer">
                  {dirPath}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" sideOffset={4} className="max-w-md break-all text-xs">
                {item.path}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Metadata info: Dimensions, Date, Size */}
        <div className="hidden sm:flex shrink-0 items-center gap-3">
          {dimensions && (
            <span className="text-2xs text-muted-foreground">
              {dimensions}
            </span>
          )}
          {formattedDate && (
            <span className="text-2xs text-muted-foreground">
              {formattedDate}
            </span>
          )}
          <span className="text-xs font-medium text-foreground tabular-nums">
            {formatBytes(item.size)}
          </span>
        </div>

        {/* Unified Smoothly-Transitioning State Badge */}
        <div className="flex shrink-0 items-center pl-1">
          {isKeep ? (
            <div className="flex h-7 w-22 items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs">
              <Bookmark className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.5} />
              <span>Keep</span>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleSwapClick}
                  className="relative flex h-7 w-22 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-destructive/25 bg-destructive/10 px-2 text-xs font-medium text-destructive transition-all duration-200 ease-out group-hover/row:border-emerald-500/40 group-hover/row:bg-emerald-500/15 group-hover/row:text-emerald-700 dark:group-hover/row:text-emerald-300 hover:bg-emerald-500/25 dark:hover:bg-emerald-500/25 hover:shadow-2xs active:scale-95"
                >
                  {/* Default State: Trash */}
                  <div className="flex items-center gap-1.5 transition-all duration-200 ease-out group-hover/row:opacity-0 group-hover/row:-translate-y-2 group-hover/row:pointer-events-none">
                    <Trash2 className="size-3.5 shrink-0" strokeWidth={2} />
                    <span>Trash</span>
                  </div>

                  {/* Hover State: Keep this */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 translate-y-2 transition-all duration-200 ease-out group-hover/row:opacity-100 group-hover/row:translate-y-0">
                    <ArrowLeftRight className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.2} />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">Keep this</span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>Click to keep this copy instead</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePreviewClick}
            title="Preview file"
            className="size-7 cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Eye className="size-3.5" />
            <span className="sr-only">Preview</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRevealClick}
            title="Reveal in folder"
            className="size-7 cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <FolderOpen className="size-3.5" />
            <span className="sr-only">Reveal in folder</span>
          </Button>
        </div>
      </div>
    )
  }
)

DuplicateAuditExactRow.displayName = "DuplicateAuditExactRow"

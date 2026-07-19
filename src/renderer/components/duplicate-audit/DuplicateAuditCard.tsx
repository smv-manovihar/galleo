import React, { useMemo } from "react"
import type { MediaItem } from "../../../shared/types/media"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, Trash2, Maximize, Play, Sparkles } from "lucide-react"
import { formatBytes } from "../../lib/format"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"

interface DuplicateAuditCardProps {
  item: MediaItem
  isBest: boolean
  reviewState: "keep" | "delete" | "pending" | "skipped"
  hotkeyIndex?: number
  onClick: () => void
  onPreview: (withAutoPlay: boolean) => void
}

export const DuplicateAuditCard: React.FC<DuplicateAuditCardProps> = ({
  item,
  isBest,
  reviewState,
  hotkeyIndex,
  onClick,
  onPreview,
}) => {
  const isVideo = item.mediaType === "video"
  const isMarkedKeep = reviewState === "keep"
  const isMarkedDelete = reviewState === "delete"

  const safeThumbnailSrc = useMemo(() => {
    if (!item.thumbnailPath) return null
    return `media:///${item.thumbnailPath.replace(/\\/g, "/")}`
  }, [item.thumbnailPath])

  return (
    <Card
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col overflow-hidden border bg-card/40 p-0 py-0 gap-0 transition-all duration-155 select-none ${
        isMarkedKeep
          ? "border-green-500/50 bg-green-500/5 shadow-xs shadow-green-500/10"
          : isMarkedDelete
            ? "border-destructive/50 bg-destructive/5"
            : isBest
              ? "border-primary/50 bg-primary/5 shadow-xs shadow-primary/10"
              : "border-border hover:border-muted-foreground/45"
      }`}
    >
      {/* Media Preview Container */}
      <div className="relative flex aspect-square flex-col justify-end overflow-hidden bg-neutral-950/80 p-0">
        {safeThumbnailSrc ? (
          <img
            src={safeThumbnailSrc}
            alt={item.name}
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-transform duration-300 select-none group-hover:scale-102 ${
              isMarkedDelete ? "opacity-40" : ""
            }`}
          />
        ) : (
          <div
            className={`absolute inset-0 flex items-center justify-center text-lg font-bold tracking-wider text-muted-foreground uppercase ${
              isMarkedDelete ? "opacity-40" : ""
            }`}
          >
            {item.extension}
          </div>
        )}

        {/* Badges Container (Top-Left) */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
          {isBest && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-5 w-5 items-center justify-center rounded-md border border-primary/20 bg-primary text-primary-foreground shadow-xs select-none">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Best Choice</TooltipContent>
            </Tooltip>
          )}

          {item.quality && (
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <div
                  className={`flex cursor-help items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.7rem] font-semibold shadow-xs backdrop-blur-md ${
                    item.quality.compositeScore >= 85
                      ? "border-green-500/40 bg-green-950/85 text-green-200"
                      : item.quality.compositeScore >= 70
                        ? "border-blue-500/40 bg-blue-950/85 text-blue-200"
                        : item.quality.compositeScore >= 50
                          ? "border-amber-500/40 bg-amber-950/85 text-amber-200"
                          : "border-red-500/40 bg-red-950/85 text-red-200"
                  }`}
                >
                  <span className="tabular-nums">
                    Score: {item.quality.compositeScore}
                  </span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent
                side="bottom"
                className="pointer-events-auto z-50 w-64 space-y-2 rounded-xl border border-border bg-card/95 p-3.5 font-sans text-xs text-foreground shadow-xl backdrop-blur-md select-none"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-sans">
                  <span className="font-bold text-foreground">
                    Quality Analytics
                  </span>
                  <Badge
                    variant="outline"
                    className={`h-4.5 border-none px-1.5 text-2xs font-semibold ${
                      item.quality.compositeScore >= 85
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : item.quality.compositeScore >= 70
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : item.quality.compositeScore >= 50
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {item.quality.compositeScore >= 85
                      ? "Excellent"
                      : item.quality.compositeScore >= 70
                        ? "Good"
                        : item.quality.compositeScore >= 50
                          ? "Fair"
                          : "Poor"}
                  </Badge>
                </div>

                <div className="space-y-1.5 font-sans">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">Focus & Sharpness</span>
                    <span
                      className={`font-semibold ${item.quality.isBlurry ? "text-amber-500" : "text-emerald-500"}`}
                    >
                      {item.quality.isBlurry ? "Blurry" : "Sharp"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">Lighting & Exposure</span>
                    <span
                      className={`font-semibold ${item.quality.isDark ? "text-amber-500" : "text-emerald-500"}`}
                    >
                      {item.quality.isDark ? "Dark/Underexposed" : "Well Exposed"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">Resolution check</span>
                    <span
                      className={`font-semibold ${item.quality.isSmall ? "text-rose-500" : "text-emerald-500"}`}
                    >
                      {item.quality.isSmall ? "Low Res" : "High Res"}
                    </span>
                  </div>

                  {item.quality.isScreenshot && (
                    <div className="flex items-center justify-between text-2xs border-t border-border/30 pt-1">
                      <span className="text-muted-foreground">File Type Check</span>
                      <span className="font-semibold text-amber-500">Screenshot</span>
                    </div>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>

        {/* Center: Video Play Overlay */}
        {isVideo && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div
              onClick={(e) => {
                e.stopPropagation()
                onPreview(true)
              }}
              className="pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-xs transition-transform hover:scale-105"
            >
              <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
            </div>
          </div>
        )}

        {/* Top-Right: Maximize / Preview Button */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md border border-white/10 bg-black/40 text-white hover:bg-black/65 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  onPreview(false)
                }}
              >
                <Maximize className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Preview Details</TooltipContent>
          </Tooltip>
        </div>

        {/* Bottom Info Gradient Overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/80 via-black/30 to-transparent px-3 pt-8 pb-2 text-white">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="truncate font-sans text-xs leading-tight font-semibold">
                {item.name}
              </p>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs font-sans text-2xs break-all"
            >
              {item.name}
            </TooltipContent>
          </Tooltip>
          <div className="mt-1 flex items-center justify-between font-sans text-2xs leading-none opacity-75">
            <span>{formatBytes(item.size)}</span>
            {item.width && item.height && (
              <span>
                {item.width} × {item.height} (
                {((item.width * item.height) / 1000000).toFixed(1)} MP)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div
        className={`flex h-8.5 shrink-0 items-center justify-center gap-1.5 border-t text-xs font-semibold transition-colors ${
          isMarkedKeep
            ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
            : isMarkedDelete
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : "border-border/60 bg-muted/20 text-muted-foreground/75"
        }`}
      >
        {hotkeyIndex && (
          <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-1 rounded border border-border bg-muted/30 px-1.5 font-mono text-[9px] font-medium text-muted-foreground shadow-xs">
            {hotkeyIndex}
          </kbd>
        )}
        {isMarkedKeep ? (
          <>
            <Bookmark className="h-3.5 w-3.5 fill-current" />
            <span>Keep File</span>
          </>
        ) : isMarkedDelete ? (
          <>
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete File</span>
          </>
        ) : (
          <span className="opacity-75">Pending Decision</span>
        )}
      </div>
    </Card>
  )
}

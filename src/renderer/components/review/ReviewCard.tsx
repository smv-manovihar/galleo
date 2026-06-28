import React from "react"
import type { MediaItem } from "../../../shared/types/media"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, Trash2, Maximize } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { formatBytes } from "../../lib/format"
import { VideoPlayer } from "../media/VideoPlayer"

interface ReviewCardProps {
  item: MediaItem
  deckIndex: number
  style: React.CSSProperties
  isTopCard: boolean
  keepOpacity: number
  deleteOpacity: number
  isVideoPlaying: boolean
  videoPlayerRef?: React.Ref<any>
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>
  onDoubleClick?: () => void
  onFullscreen?: () => void
  onPlayStateChange?: (playing: boolean) => void
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  item,
  deckIndex,
  style,
  isTopCard,
  keepOpacity,
  deleteOpacity,
  isVideoPlaying,
  videoPlayerRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDoubleClick,
  onFullscreen,
  onPlayStateChange,
}) => {
  const itemIsVideo = item.mediaType === "video"
  const safeSrc = `media:///${item.path.replace(/\\/g, "/")}`

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
        ...style,
      }}
      className="select-none"
      {...(isTopCard
        ? {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
            onDoubleClick,
          }
        : {})}
    >
      <Card
        className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/60 p-0 py-0 shadow-xl select-none"
        style={{ maxHeight: "100%" }}
      >
        <CardContent
          className="relative flex min-h-0 w-full flex-1 flex-col justify-end bg-black p-0"
          style={{ aspectRatio: "4/5" }}
        >
          {/* Media — only render for top 2 cards */}
          {deckIndex <= 1 ? (
            itemIsVideo ? (
              <VideoPlayer
                ref={isTopCard ? videoPlayerRef : undefined}
                src={item.path}
                poster={item.thumbnailPath}
                className="h-full w-full"
                hideFullscreen={false}
                onPlayStateChange={isTopCard ? onPlayStateChange : undefined}
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

          {/* Quality badges (top card only) */}
          {isTopCard && item.quality && (
            <div className="pointer-events-none absolute top-3 left-3 z-10 flex gap-2">
              <Badge
                variant={item.quality.compositeScore < 50 ? "destructive" : "secondary"}
                className="bg-background/80 text-2xs font-bold backdrop-blur"
              >
                Score: {item.quality.compositeScore}
              </Badge>
              {item.quality.isBlurry && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/20 bg-yellow-500/10 text-[0.5625rem] text-yellow-500 backdrop-blur"
                >
                  Blurry
                </Badge>
              )}
              {item.quality.isDark && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/20 bg-yellow-500/10 text-[0.5625rem] text-yellow-500 backdrop-blur"
                >
                  Dark
                </Badge>
              )}
            </div>
          )}

          {/* Fullscreen button (top card only) */}
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

          {/* Keep swipe overlay */}
          {isTopCard && keepOpacity > 0 && (
            <div
              className="pointer-events-none absolute inset-0 z-30 rounded-2xl overflow-hidden"
              style={{ opacity: keepOpacity }}
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

          {/* Delete swipe overlay */}
          {isTopCard && deleteOpacity > 0 && (
            <div
              className="pointer-events-none absolute inset-0 z-30 rounded-2xl overflow-hidden"
              style={{ opacity: deleteOpacity }}
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

          {/* Info overlay (pre-mounted on top 2 cards to prevent layout shake) */}
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

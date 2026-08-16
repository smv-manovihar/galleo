import React from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { PLAYBACK_SPEEDS } from "./video-constants"

import { cn } from "@/lib/utils"

interface VideoSpeedMenuProps {
  playbackRate: number
  containerElement?: HTMLElement | null
  onChangePlaybackRate: (rate: number) => void
}

export const VideoSpeedMenu: React.FC<VideoSpeedMenuProps> = React.memo(
  ({ playbackRate, containerElement, onChangePlaybackRate }) => {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 font-mono text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white rounded-md cursor-pointer transition-colors"
              >
                {playbackRate === 1 ? "1x" : `${playbackRate}x`}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" container={containerElement ?? undefined}>
            Speed ({playbackRate}x) (Shift + ← / →)
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          container={containerElement}
          className="w-56 space-y-2 rounded-xl border border-white/15 bg-black/95 p-2.5 text-white shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-2xs">
            <span className="font-semibold text-white/90">Playback Speed</span>
            <kbd className="rounded border border-white/10 bg-white/10 px-1 py-0.5 font-mono text-2xs text-white/70">
              Shift + ← / →
            </kbd>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {PLAYBACK_SPEEDS.map((rate) => {
              const isSelected = Math.abs(playbackRate - rate) < 0.01
              return (
                <Button
                  key={rate}
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChangePlaybackRate(rate)
                  }}
                  className={cn(
                    "h-6 font-mono text-2xs font-semibold cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90"
                      : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                  )}
                >
                  {rate === 1 ? "1x" : `${rate}x`}
                </Button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

VideoSpeedMenu.displayName = "VideoSpeedMenu"

import React, { useCallback } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
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

interface VideoVolumeControlProps {
  volume: number
  isMuted: boolean
  isNarrow: boolean
  btnClass: string
  iconClass: string
  containerElement?: HTMLElement | null
  onVolumeChange: (volume: number, isMuted: boolean) => void
  onToggleMute: () => void
}

export const VideoVolumeControl: React.FC<VideoVolumeControlProps> = React.memo(
  ({
    volume,
    isMuted,
    isNarrow,
    btnClass,
    iconClass,
    containerElement,
    onVolumeChange,
    onToggleMute,
  }) => {
    const handleSliderChange = useCallback(
      (val: number[]) => {
        const v = val[0]
        onVolumeChange(v, v === 0)
      },
      [onVolumeChange]
    )

    const handleMuteClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onToggleMute()
      },
      [onToggleMute]
    )

    const displayVolume = isMuted ? 0 : volume

    return (
      <div className="relative flex items-center">
        {isNarrow ? (
          <HoverCard openDelay={50} closeDelay={150}>
            <HoverCardTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={btnClass}
                onClick={handleMuteClick}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className={iconClass} />
                ) : (
                  <Volume2 className={iconClass} />
                )}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent
              side="top"
              align="center"
              sideOffset={8}
              className="flex h-28 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/90 p-2 text-white shadow-lg ring-0"
            >
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[displayVolume]}
                onValueChange={handleSliderChange}
                orientation="vertical"
                className="h-24 w-4 cursor-pointer data-vertical:min-h-0 **:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-track]:bg-white/20 [&_.slider-range]:bg-primary [&_.slider-thumb]:bg-white [&_.slider-thumb]:border-primary [&_.slider-track]:bg-white/20"
              />
            </HoverCardContent>
          </HoverCard>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={btnClass}
                  onClick={handleMuteClick}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className={iconClass} />
                  ) : (
                    <Volume2 className={iconClass} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" container={containerElement ?? undefined}>
                {isMuted || volume === 0 ? "Unmute (M)" : "Mute (M)"}
              </TooltipContent>
            </Tooltip>
            <div className="ml-1 hidden w-20 sm:block">
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[displayVolume]}
                onValueChange={handleSliderChange}
                className="cursor-pointer **:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-track]:bg-white/20 [&_.slider-range]:bg-primary [&_.slider-thumb]:bg-white [&_.slider-thumb]:border-primary [&_.slider-track]:bg-white/20"
              />
            </div>
          </>
        )}
      </div>
    )
  }
)

VideoVolumeControl.displayName = "VideoVolumeControl"

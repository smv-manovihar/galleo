import React from "react"
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { VideoScrubber } from "./VideoScrubber"
import { VideoTimeDisplay } from "./VideoTimeDisplay"
import type { TimeUpdateSubscriber } from "./video-constants"
import { VideoVolumeControl } from "./VideoVolumeControl"
import { VideoSpeedMenu } from "./VideoSpeedMenu"

interface VideoControlsBarProps {
  showControls: boolean
  isPlaying: boolean
  isNarrow: boolean
  volume: number
  isMuted: boolean
  playbackRate: number
  isFullscreen: boolean
  hideFullscreen: boolean
  initialDuration: number
  subscribeTimeUpdate: TimeUpdateSubscriber
  containerElement?: HTMLElement | null
  onSeek: (time: number) => void
  onTogglePlay: () => void
  onSeekBackward: (e: React.MouseEvent) => void
  onSeekForward: (e: React.MouseEvent) => void
  onVolumeChange: (volume: number, isMuted: boolean) => void
  onToggleMute: () => void
  onChangePlaybackRate: (rate: number) => void
  onToggleFullscreen: (e: React.MouseEvent) => void
}

export const VideoControlsBar: React.FC<VideoControlsBarProps> = React.memo(
  ({
    showControls,
    isPlaying,
    isNarrow,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    hideFullscreen,
    initialDuration,
    subscribeTimeUpdate,
    containerElement,
    onSeek,
    onTogglePlay,
    onSeekBackward,
    onSeekForward,
    onVolumeChange,
    onToggleMute,
    onChangePlaybackRate,
    onToggleFullscreen,
  }) => {
    const btnClass = isNarrow
      ? "w-7 h-7 rounded-full text-white hover:bg-white/10 cursor-pointer shrink-0"
      : "w-8 h-8 rounded-full text-white hover:bg-white/20 cursor-pointer shrink-0"

    const iconClass = isNarrow ? "w-3 h-3" : "w-4 h-4"
    const playIconClass = isNarrow
      ? "w-3 h-3 fill-current"
      : "w-4 h-4 fill-current"
    const playIconMargin = isNarrow ? "ml-0.5" : "ml-1"
    const rowGapClass = isNarrow ? "gap-1" : "gap-2"
    const rightGapClass = isNarrow ? "gap-1" : "gap-2"
    const paddingClass = isNarrow
      ? "px-3 pb-2 pt-6 gap-1"
      : "px-4 pb-3 pt-8 gap-2"

    return (
      <div
        className={`absolute right-0 bottom-0 left-0 z-20 transition-opacity duration-300 ${showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient fade */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

        <div className={`relative mx-auto flex w-full max-w-4xl flex-col ${paddingClass}`}>
          {/* Scrubber */}
          <VideoScrubber
            initialDuration={initialDuration}
            subscribeTimeUpdate={subscribeTimeUpdate}
            onSeek={onSeek}
          />

          {/* Bottom controls row */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${rowGapClass}`}>
              {/* Seek Backward 10s */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={btnClass}
                    onClick={onSeekBackward}
                  >
                    <RotateCcw className={iconClass} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  Seek Back 10s (←)
                </TooltipContent>
              </Tooltip>

              {/* Play/Pause */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={btnClass}
                    onClick={onTogglePlay}
                  >
                    {isPlaying ? (
                      <Pause className={playIconClass} />
                    ) : (
                      <Play
                        className={`${playIconClass} ${playIconMargin}`}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  {isPlaying ? "Pause (Space)" : "Play (Space)"}
                </TooltipContent>
              </Tooltip>

              {/* Seek Forward 10s */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={btnClass}
                    onClick={onSeekForward}
                  >
                    <RotateCw className={iconClass} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  Seek Forward 10s (→)
                </TooltipContent>
              </Tooltip>

              {/* Volume */}
              <VideoVolumeControl
                volume={volume}
                isMuted={isMuted}
                isNarrow={isNarrow}
                btnClass={btnClass}
                iconClass={iconClass}
                containerElement={containerElement}
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
              />

              {/* Time */}
              <VideoTimeDisplay
                initialDuration={initialDuration}
                subscribeTimeUpdate={subscribeTimeUpdate}
              />
            </div>

            {/* Right side controls: Speed + Fullscreen */}
            <div className={`flex items-center ${rightGapClass}`}>
              {/* Playback speed */}
              <VideoSpeedMenu
                playbackRate={playbackRate}
                containerElement={containerElement}
                onChangePlaybackRate={onChangePlaybackRate}
              />

              {/* Fullscreen */}
              {!hideFullscreen && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={btnClass}
                      onClick={onToggleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize className={iconClass} />
                      ) : (
                        <Maximize className={iconClass} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" container={containerElement ?? undefined}>
                    {isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

VideoControlsBar.displayName = "VideoControlsBar"

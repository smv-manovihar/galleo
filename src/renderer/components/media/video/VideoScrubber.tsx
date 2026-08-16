import React, { useState, useEffect, useRef, useCallback } from "react"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { formatTime, type TimeUpdateSubscriber } from "./video-constants"

interface VideoScrubberProps {
  src?: string
  poster?: string
  initialDuration?: number
  subscribeTimeUpdate: TimeUpdateSubscriber
  onSeek: (newTime: number) => void
  className?: string
}

interface HoverState {
  time: number
  xPos: number
  containerWidth: number
}

export const VideoScrubber: React.FC<VideoScrubberProps> = React.memo(
  ({
    src,
    poster,
    initialDuration = 0,
    subscribeTimeUpdate,
    onSeek,
    className = "",
  }) => {
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(initialDuration)
    const [, setHoverState] = useState<HoverState | null>(null)
    const [displayedHoverState, setDisplayedHoverState] = useState<HoverState | null>(null)
    const [isHoverVisible, setIsHoverVisible] = useState(false)
    const isSeekingRef = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const previewVideoRef = useRef<HTMLVideoElement>(null)
    const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pendingSeekTimeRef = useRef<number | null>(null)
    const isPreviewSeekingRef = useRef(false)

    useEffect(() => {
      return subscribeTimeUpdate((cur, dur) => {
        if (!isSeekingRef.current) {
          setCurrentTime(cur)
        }
        if (dur) {
          setDuration((prev) => (dur !== prev ? dur : prev))
        }
      })
    }, [subscribeTimeUpdate])

    // Cleanup any pending preview video seek timer and closing timer on unmount
    useEffect(() => {
      return () => {
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current)
        }
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current)
        }
      }
    }, [])

    // Controlled preview video seeking to avoid GPU decoder bottleneck
    const dispatchPreviewSeek = useCallback((targetTime: number) => {
      const video = previewVideoRef.current
      if (!video || !isFinite(targetTime)) return

      if (isPreviewSeekingRef.current || video.seeking) {
        pendingSeekTimeRef.current = targetTime
        return
      }

      if (Math.abs(video.currentTime - targetTime) < 0.1) {
        pendingSeekTimeRef.current = null
        return
      }

      try {
        isPreviewSeekingRef.current = true
        pendingSeekTimeRef.current = null
        if (typeof video.fastSeek === "function") {
          video.fastSeek(targetTime)
        } else {
          video.currentTime = targetTime
        }
      } catch {
        isPreviewSeekingRef.current = false
      }
    }, [])

    // Called via onSeeked prop on the preview video element
    const handlePreviewSeeked = useCallback(() => {
      const video = previewVideoRef.current
      isPreviewSeekingRef.current = false
      if (
        video &&
        pendingSeekTimeRef.current !== null &&
        isFinite(pendingSeekTimeRef.current) &&
        Math.abs(video.currentTime - pendingSeekTimeRef.current) > 0.2
      ) {
        const nextTime = pendingSeekTimeRef.current
        pendingSeekTimeRef.current = null
        dispatchPreviewSeek(nextTime)
      }
    }, [dispatchPreviewSeek])

    const handlePreviewError = useCallback(() => {
      isPreviewSeekingRef.current = false
    }, [])


    const handleValueChange = useCallback(
      (val: number[]) => {
        isSeekingRef.current = true
        const nextTime = val[0]
        setCurrentTime(nextTime)
        onSeek(nextTime)
      },
      [onSeek]
    )

    const handleValueCommit = useCallback(() => {
      isSeekingRef.current = false
    }, [])

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!containerRef.current || duration <= 0) return
        const rect = containerRef.current.getBoundingClientRect()
        const rawX = e.clientX - rect.left
        const clampedX = Math.max(0, Math.min(rect.width, rawX))
        const ratio = clampedX / (rect.width || 1)
        const targetTime = Math.max(0, Math.min(duration, ratio * duration))
        const containerWidth = rect.width || 400

        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current)
          closeTimeoutRef.current = null
        }

        const nextState = { time: targetTime, xPos: clampedX, containerWidth }
        // Immediate UI updates for tooltip tracking with 0ms lag
        setHoverState(nextState)
        setDisplayedHoverState(nextState)
        setIsHoverVisible(true)

        // Debounced seek for preview video element (~100ms) with queue protection
        pendingSeekTimeRef.current = targetTime
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current)
        }
        seekTimeoutRef.current = setTimeout(() => {
          if (pendingSeekTimeRef.current !== null) {
            dispatchPreviewSeek(pendingSeekTimeRef.current)
          }
        }, 100)
      },
      [duration, dispatchPreviewSeek]
    )

    const handlePointerLeave = useCallback(() => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current)
        seekTimeoutRef.current = null
      }
      pendingSeekTimeRef.current = null
      isPreviewSeekingRef.current = false
      setHoverState(null)
      setIsHoverVisible(false)

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
      closeTimeoutRef.current = setTimeout(() => {
        setDisplayedHoverState(null)
        closeTimeoutRef.current = null
      }, 150)
    }, [])

    return (
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "group/scrubber relative flex w-full items-center select-none",
          className
        )}
      >
        {/* Floating Frame Preview & Time Tooltip */}
        {displayedHoverState && duration > 0 && (() => {
          const containerWidth = displayedHoverState.containerWidth || 400
          const hoverPixelX = displayedHoverState.xPos
          const tooltipWidth = 176 // 44rem / 176px
          const halfWidth = tooltipWidth / 2
          const margin = 8
          const minCenter = halfWidth + margin
          const maxCenter = Math.max(minCenter, containerWidth - halfWidth - margin)
          const clampedX = Math.max(
            minCenter,
            Math.min(maxCenter, hoverPixelX)
          )
          const arrowOffset = Math.max(
            12,
            Math.min(
              tooltipWidth - 12,
              halfWidth + (hoverPixelX - clampedX)
            )
          )

          return (
            <div
              className={cn(
                "pointer-events-none absolute bottom-full mb-3 z-50 transition-[opacity,transform] duration-150 ease-out origin-bottom",
                isHoverVisible
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95"
              )}
              style={{
                left: `${clampedX}px`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="relative flex w-44 flex-col items-center gap-1.5 rounded-lg border border-white/20 bg-neutral-950/95 p-1.5 text-white shadow-2xl backdrop-blur-md">
                {/* Thumbnail / Frame Preview */}
                <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black">
                  {src ? (
                    <video
                      ref={previewVideoRef}
                      src={src}
                      poster={poster}
                      muted
                      playsInline
                      preload="metadata"
                      onSeeked={handlePreviewSeeked}
                      onError={handlePreviewError}
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  ) : poster ? (
                    <img
                      src={poster}
                      alt="Video preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                      Preview
                    </div>
                  )}
                </div>

                {/* Time Display Badge */}
                <div className="flex items-center gap-1 px-1 text-xs">
                  <span className="font-bold text-white tabular-nums tracking-wide">
                    {formatTime(displayedHoverState.time)}
                  </span>
                  <span className="text-white/40">/</span>
                  <span className="text-white/60 tabular-nums">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Downward pointer notch */}
                <div
                  className="absolute -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-white/20 bg-neutral-950"
                  style={{ left: `${arrowOffset}px` }}
                />
              </div>
            </div>
          )
        })()}

        {/* Seek Slider & Hover Ghost Thumb Container */}
        <div className="relative flex w-full items-center">
          {/* Hover Pointer ghost thumb matching slider thumb shape */}
          {displayedHoverState && Math.abs(currentTime - displayedHoverState.time) > Math.max(0.2, duration * 0.005) && (
            <div
              className={cn(
                "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 -translate-x-1/2 transition-[opacity,transform] duration-150 ease-out",
                isHoverVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
              )}
              style={{
                left: `${displayedHoverState.xPos}px`,
              }}
            >
              <div className="size-3 rounded-full border border-white/60 bg-white/80 shadow-xs ring-1 ring-white/20 backdrop-blur-xs" />
            </div>
          )}

          {/* The Seek Slider */}
          <Slider
            min={0}
            max={duration || 1}
            step={0.1}
            value={[currentTime]}
            onValueChange={handleValueChange}
            onValueCommit={handleValueCommit}
            onPointerUp={() => {
              isSeekingRef.current = false
            }}
            className="w-full py-2.5 cursor-pointer **:data-[slot=slider-range]:bg-primary **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-track]:bg-white/20 [&_.slider-range]:bg-primary [&_.slider-thumb]:bg-white [&_.slider-thumb]:border-primary [&_.slider-track]:bg-white/20 group-hover/scrubber:**:data-[slot=slider-track]:h-1.5 group-hover/scrubber:[&_.slider-track]:h-1.5 **:data-[slot=slider-track]:transition-all [&_.slider-track]:transition-all"
          />
        </div>
      </div>
    )
  }
)

VideoScrubber.displayName = "VideoScrubber"

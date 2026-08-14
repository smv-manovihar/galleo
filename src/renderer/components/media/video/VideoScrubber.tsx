import React, { useState, useEffect, useRef, useCallback } from "react"
import { Slider } from "@/components/ui/slider"
import type { TimeUpdateSubscriber } from "./video-constants"

interface VideoScrubberProps {
  initialDuration?: number
  subscribeTimeUpdate: TimeUpdateSubscriber
  onSeek: (newTime: number) => void
  className?: string
}

export const VideoScrubber: React.FC<VideoScrubberProps> = React.memo(
  ({ initialDuration = 0, subscribeTimeUpdate, onSeek, className = "" }) => {
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(initialDuration)
    const isSeekingRef = useRef(false)

    useEffect(() => {
      setDuration(initialDuration)
    }, [initialDuration])

    useEffect(() => {
      return subscribeTimeUpdate((cur, dur) => {
        if (!isSeekingRef.current) {
          setCurrentTime(cur)
        }
        if (dur && dur !== duration) {
          setDuration(dur)
        }
      })
    }, [subscribeTimeUpdate, duration])

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

    return (
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
        className={`w-full cursor-pointer [&_.slider-range]:bg-white [&_.slider-thumb]:bg-white [&_.slider-track]:bg-white/20 ${className}`}
      />
    )
  }
)

VideoScrubber.displayName = "VideoScrubber"

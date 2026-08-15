import React, { useState, useEffect } from "react"
import { formatTime, type TimeUpdateSubscriber } from "./video-constants"

interface VideoTimeDisplayProps {
  initialDuration?: number
  subscribeTimeUpdate: TimeUpdateSubscriber
}

export const VideoTimeDisplay: React.FC<VideoTimeDisplayProps> = React.memo(
  ({ initialDuration = 0, subscribeTimeUpdate }) => {
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(initialDuration)

    useEffect(() => {
      return subscribeTimeUpdate((cur, dur) => {
        setCurrentTime(cur)
        if (dur) {
          setDuration((prev) => (dur !== prev ? dur : prev))
        }
      })
    }, [subscribeTimeUpdate])

    return (
      <span className="font-mono text-white/80 tabular-nums select-none text-xs">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    )
  }
)

VideoTimeDisplay.displayName = "VideoTimeDisplay"

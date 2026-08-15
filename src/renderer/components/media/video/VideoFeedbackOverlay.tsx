import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Volume2,
  Volume1,
  VolumeX,
  Gauge,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { formatTime } from "./video-constants"

export type FeedbackKind = "volume" | "speed" | "seek" | "rotation" | "zoom"

export interface FeedbackPayload {
  kind: FeedbackKind
  /** Volume: 0–1, Speed: rate number, Seek: offset in seconds (±), Rotation: degrees, Zoom: scale */
  value: number
  /** For seek: the accumulated offset when tapping repeatedly */
  accumulated?: number
  /** For seek: the destination timestamp */
  timestamp?: number
  /** Whether muted (volume only) */
  muted?: boolean
}

interface VideoFeedbackOverlayProps {
  feedback: FeedbackPayload | null
}

const FADE_OUT_MS = 1000

export const VideoFeedbackOverlay: React.FC<VideoFeedbackOverlayProps> = React.memo(
  ({ feedback }) => {
    const [visible, setVisible] = useState(false)
    const [display, setDisplay] = useState<FeedbackPayload | null>(null)
    const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearTimers = useCallback(() => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current)
    }, [])

    useEffect(() => {
      if (!feedback) return

      clearTimers()
      setDisplay(feedback)
      setVisible(true)

      fadeTimerRef.current = setTimeout(() => {
        setVisible(false)
        unmountTimerRef.current = setTimeout(() => {
          setDisplay(null)
        }, 200) // match CSS transition duration
      }, FADE_OUT_MS)

      return clearTimers
    }, [feedback, clearTimers])

    if (!display) return null

    return (
      <div
        className={`pointer-events-none absolute top-5 left-1/2 z-30 -translate-x-1/2 transition-all duration-200 ease-out ${
          visible
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-3.5 py-1.5 shadow-lg backdrop-blur-md select-none">
          <FeedbackContent payload={display} />
        </div>
      </div>
    )
  }
)

VideoFeedbackOverlay.displayName = "VideoFeedbackOverlay"

const FeedbackContent: React.FC<{ payload: FeedbackPayload }> = React.memo(
  ({ payload }) => {
    switch (payload.kind) {
      case "volume":
        return <VolumeFeedback value={payload.value} muted={payload.muted} />
      case "speed":
        return <SpeedFeedback value={payload.value} />
      case "seek":
        return (
          <SeekFeedback
            offset={payload.accumulated ?? payload.value}
            timestamp={payload.timestamp}
          />
        )
      case "rotation":
        return <RotationFeedback degrees={payload.value} />
      case "zoom":
        return <ZoomFeedback scale={payload.value} />
      default:
        return null
    }
  }
)

FeedbackContent.displayName = "FeedbackContent"

const VolumeFeedback: React.FC<{ value: number; muted?: boolean }> = React.memo(
  ({ value, muted }) => {
    const percent = Math.round(value * 100)
    const isSilent = muted || value === 0

    const VolumeIcon = isSilent ? VolumeX : value < 0.5 ? Volume1 : Volume2

    return (
      <>
        <VolumeIcon className="size-3.5 shrink-0 text-white/90" />
        <span className="text-xs font-medium text-white/95">
          {isSilent ? "Muted" : `${percent}%`}
        </span>
        {!isSilent && (
          <div className="flex h-1 w-10 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white/90 transition-[width] duration-150"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </>
    )
  }
)

VolumeFeedback.displayName = "VolumeFeedback"

const SpeedFeedback: React.FC<{ value: number }> = React.memo(({ value }) => (
  <>
    <Gauge className="size-3.5 shrink-0 text-white/90" />
    <span className="font-mono text-xs font-medium text-white/95">
      {value === 1 ? "1x" : `${value}x`}
    </span>
  </>
))

SpeedFeedback.displayName = "SpeedFeedback"

const SeekFeedback: React.FC<{ offset: number; timestamp?: number }> = React.memo(
  ({ offset, timestamp }) => {
    const isForward = offset >= 0
    const Icon = isForward ? RotateCw : RotateCcw
    const sign = isForward ? "+" : ""

    return (
      <>
        <Icon className="size-3.5 shrink-0 text-white/90" />
        <span className="font-mono text-xs font-medium text-white/95">
          {sign}{Math.round(offset)}s
        </span>
        {timestamp !== undefined && (
          <span className="text-xs text-white/60">
            {formatTime(timestamp)}
          </span>
        )}
      </>
    )
  }
)

SeekFeedback.displayName = "SeekFeedback"

const RotationFeedback: React.FC<{ degrees: number }> = React.memo(({ degrees }) => {
  const norm = ((degrees % 360) + 360) % 360
  const Icon = degrees >= 0 ? RotateCw : RotateCcw

  return (
    <>
      <Icon className="size-3.5 shrink-0 text-white/90" />
      <span className="font-mono text-xs font-medium text-white/95">
        {norm}°
      </span>
    </>
  )
})

RotationFeedback.displayName = "RotationFeedback"

const ZoomFeedback: React.FC<{ scale: number }> = React.memo(({ scale }) => {
  const percent = Math.round(scale * 100)
  const Icon = scale >= 1 ? ZoomIn : ZoomOut

  return (
    <>
      <Icon className="size-3.5 shrink-0 text-white/90" />
      <span className="font-mono text-xs font-medium text-white/95">
        {percent}%
      </span>
    </>
  )
})

ZoomFeedback.displayName = "ZoomFeedback"

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from "react"
import { storage } from "../../lib/storage"
import { useMediaStore } from "../../stores/media-store"
import { VideoCenterPlayButton } from "./video/VideoCenterPlayButton"
import { VideoControlsBar } from "./video/VideoControlsBar"
import { PLAYBACK_SPEEDS, type TimeUpdateSubscriber } from "./video/video-constants"

export interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
  /** Media item id for database updates */
  mediaId?: string
  /** Controlled rotation in degrees (0, 90, 180, 270) */
  rotation?: number
  /** Initial orientation in degrees (0, 90, 180, 270) */
  initialRotation?: number
  /** Callback fired when orientation is rotated */
  onRotationChange?: (rotation: number) => void
  /** Hide the fullscreen button entirely (e.g. when parent provides its own) */
  hideFullscreen?: boolean
  /** When provided, the fullscreen button delegates to this callback instead of managing its own fullscreen */
  onFullscreenToggle?: () => void
  /** External fullscreen state from a parent — drives auto-hide controls behavior */
  externalFullscreen?: boolean
  /** Callback fired when play state changes */
  onPlayStateChange?: (playing: boolean) => void
  /** Automatically start playback when mounted */
  autoPlay?: boolean
  /** Force the player container to fill its parent instead of sizing to the video's aspect ratio */
  fillContainer?: boolean
  /** Ref to the transform wrapper element for zoom/pan */
  transformRef?: React.Ref<HTMLDivElement>
}

export interface VideoPlayerRef {
  requestFullscreen: () => Promise<void>
  pause?: () => void
}

const CONTAINER_STYLE: React.CSSProperties = { width: "100%", height: "100%" }

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    {
      src,
      poster,
      className = "",
      mediaId,
      rotation: rotationProp,
      initialRotation = 0,
      onRotationChange,
      hideFullscreen = false,
      onFullscreenToggle,
      externalFullscreen,
      onPlayStateChange,
      autoPlay = false,
      transformRef,
    },
    ref
  ) => {
    // 1. State Hooks
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(() => storage.get("video_player_muted") === "true")
    const [volume, setVolume] = useState(() => {
      const saved = storage.get("video_player_volume")
      if (saved !== null) {
        const parsed = parseFloat(saved)
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          return parsed
        }
      }
      return 1
    })
    const [playbackRate, setPlaybackRate] = useState(1)
    const [duration, setDuration] = useState(0)
    const [internalFullscreen, setInternalFullscreen] = useState(false)
    const [showControls, setShowControls] = useState(true)
    const [isNarrow, setIsNarrow] = useState(false)
    const [internalRotation, setInternalRotation] = useState<number>(
      rotationProp !== undefined ? rotationProp : (initialRotation ?? 0)
    )
    const [scale, setScale] = useState(1)

    // 2. Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const timeSubscribersRef = useRef<Set<(cur: number, dur: number) => void>>(new Set())
    const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastClickTimeRef = useRef<number>(0)
    const onPlayStateChangeRef = useRef(onPlayStateChange)
    const onRotationChangeRef = useRef(onRotationChange)
    const onFullscreenToggleRef = useRef(onFullscreenToggle)

    // Latest state ref for stable event listeners
    const stateRef = useRef({
      volume,
      isMuted,
      duration,
      playbackRate,
      rotation: rotationProp !== undefined ? rotationProp : internalRotation,
      isPlaying,
      isFullscreen: externalFullscreen !== undefined ? externalFullscreen : internalFullscreen,
    })

    // Keep ref in sync
    const rotation = rotationProp !== undefined ? rotationProp : internalRotation
    const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen

    useEffect(() => {
      stateRef.current = {
        volume,
        isMuted,
        duration,
        playbackRate,
        rotation,
        isPlaying,
        isFullscreen,
      }
    }, [volume, isMuted, duration, playbackRate, rotation, isPlaying, isFullscreen])

    useEffect(() => {
      onPlayStateChangeRef.current = onPlayStateChange
      onRotationChangeRef.current = onRotationChange
      onFullscreenToggleRef.current = onFullscreenToggle
    }, [onPlayStateChange, onRotationChange, onFullscreenToggle])

    useEffect(() => {
      if (rotationProp !== undefined) {
        setInternalRotation(rotationProp)
      }
    }, [rotationProp])

    // 3. Time Subscription Hook
    const subscribeTimeUpdate = useCallback<TimeUpdateSubscriber>((listener) => {
      timeSubscribersRef.current.add(listener)
      if (videoRef.current) {
        listener(videoRef.current.currentTime, videoRef.current.duration || 0)
      }
      return () => {
        timeSubscribersRef.current.delete(listener)
      }
    }, [])

    const notifyTimeSubscribers = useCallback((cur: number, dur: number) => {
      timeSubscribersRef.current.forEach((fn) => fn(cur, dur))
    }, [])

    // 4. Memoized Logic
    const isRotated90 = Math.abs((rotation / 90) % 2) === 1

    const safeSrc = useMemo(() => {
      return src.startsWith("media:///") ? src : `media:///${src.replace(/\\/g, "/")}`
    }, [src])

    const safePoster = useMemo(() => {
      if (!poster) return undefined
      return poster.startsWith("media:///") ? poster : `media:///${poster.replace(/\\/g, "/")}`
    }, [poster])

    const videoStyle = useMemo<React.CSSProperties>(() => {
      return {
        transform: `rotate(${rotation}deg) scale(${scale})`,
        transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        touchAction: "manipulation",
      }
    }, [rotation, scale])

    // 5. Scale calculation
    const calculateScale = useCallback(() => {
      if (!videoRef.current || !containerRef.current || !isRotated90) {
        setScale(1)
        return
      }
      const vW = videoRef.current.videoWidth
      const vH = videoRef.current.videoHeight
      const cW = containerRef.current.clientWidth
      const cH = containerRef.current.clientHeight

      if (vW && vH && cW && cH) {
        const normalScale = Math.min(cW / vW, cH / vH)
        const rotatedScale = Math.min(cW / vH, cH / vW)
        setScale(rotatedScale / normalScale)
      } else {
        setScale(1)
      }
    }, [isRotated90])

    useEffect(() => {
      calculateScale()
    }, [rotation, calculateScale])

    useEffect(() => {
      const handleResize = () => calculateScale()
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }, [calculateScale])

    // 6. ResizeObserver for Narrow breakpoint
    useEffect(() => {
      const el = containerRef.current
      if (!el) return

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setIsNarrow(entry.contentRect.width < 450)
        }
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [])

    // 7. Auto-hide timer for controls
    const resetHideTimer = useCallback(() => {
      setShowControls(true)
      if (hideTimeout.current) clearTimeout(hideTimeout.current)
      hideTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, 2500)
    }, [])

    // 8. Callbacks
    const toggleFullscreen = useCallback(async () => {
      if (onFullscreenToggleRef.current) {
        onFullscreenToggleRef.current()
        return
      }
      if (!containerRef.current) return
      try {
        if (!document.fullscreenElement) {
          await containerRef.current.requestFullscreen()
          setInternalFullscreen(true)
        } else {
          await document.exitFullscreen()
          setInternalFullscreen(false)
        }
      } catch (err) {
        console.error("Failed to toggle fullscreen:", err)
      }
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        requestFullscreen: async () => {
          await toggleFullscreen()
        },
        pause: () => {
          if (videoRef.current) {
            videoRef.current.pause()
          }
        },
      }),
      [toggleFullscreen]
    )

    const handleVolumeUpdate = useCallback((newVol: number, nextMuted: boolean) => {
      if (videoRef.current) {
        videoRef.current.volume = newVol
        videoRef.current.muted = nextMuted
      }
      setVolume(newVol)
      setIsMuted(nextMuted)
      storage.set("video_player_volume", newVol.toString())
      storage.set("video_player_muted", nextMuted ? "true" : "false")
    }, [])

    const toggleMute = useCallback(() => {
      const { isMuted: currentlyMuted, volume: currentVol } = stateRef.current
      if (currentlyMuted || currentVol === 0) {
        const restoredVol = currentVol > 0 ? currentVol : 0.5
        handleVolumeUpdate(restoredVol, false)
      } else {
        handleVolumeUpdate(currentVol, true)
      }
      resetHideTimer()
    }, [handleVolumeUpdate, resetHideTimer])

    const changePlaybackRate = useCallback(
      (newRate: number) => {
        setPlaybackRate(newRate)
        if (videoRef.current) {
          videoRef.current.playbackRate = newRate
        }
        resetHideTimer()
      },
      [resetHideTimer]
    )

    const increaseSpeed = useCallback(() => {
      const currentRate = stateRef.current.playbackRate
      const currIdx = PLAYBACK_SPEEDS.indexOf(currentRate as (typeof PLAYBACK_SPEEDS)[number])
      if (currIdx !== -1 && currIdx < PLAYBACK_SPEEDS.length - 1) {
        changePlaybackRate(PLAYBACK_SPEEDS[currIdx + 1])
      } else if (currIdx === -1) {
        const next = PLAYBACK_SPEEDS.find((r) => r > currentRate) || 2
        changePlaybackRate(next)
      }
    }, [changePlaybackRate])

    const decreaseSpeed = useCallback(() => {
      const currentRate = stateRef.current.playbackRate
      const currIdx = PLAYBACK_SPEEDS.indexOf(currentRate as (typeof PLAYBACK_SPEEDS)[number])
      if (currIdx > 0) {
        changePlaybackRate(PLAYBACK_SPEEDS[currIdx - 1])
      } else if (currIdx === -1) {
        const prev = [...PLAYBACK_SPEEDS].reverse().find((r) => r < currentRate) || 0.25
        changePlaybackRate(prev)
      }
    }, [changePlaybackRate])

    const handleRotationUpdate = useCallback(
      (newRot: number) => {
        const norm = ((newRot % 360) + 360) % 360
        setInternalRotation(newRot)
        onRotationChangeRef.current?.(norm)
        const target = mediaId || src.replace(/^media:\/\/\//, "").replace(/\\/g, "/")
        useMediaStore.getState().updateItemOrientation(target, norm)
      },
      [mediaId, src]
    )

    const rotateLeft = useCallback(() => {
      handleRotationUpdate(stateRef.current.rotation - 90)
      resetHideTimer()
    }, [handleRotationUpdate, resetHideTimer])

    const rotateRight = useCallback(() => {
      handleRotationUpdate(stateRef.current.rotation + 90)
      resetHideTimer()
    }, [handleRotationUpdate, resetHideTimer])

    const togglePlay = useCallback(() => {
      if (!videoRef.current) return
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => {
          console.error("Playback failed:", err)
        })
      } else {
        videoRef.current.pause()
      }
      resetHideTimer()
    }, [resetHideTimer])

    const handleVideoClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        containerRef.current?.focus()

        const now = Date.now()
        const DOUBLE_CLICK_THRESHOLD = 300

        if (now - lastClickTimeRef.current < DOUBLE_CLICK_THRESHOLD) {
          if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current)
            clickTimeoutRef.current = null
          }
          lastClickTimeRef.current = 0
          void toggleFullscreen()
        } else {
          lastClickTimeRef.current = now
          if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current)
          }
          clickTimeoutRef.current = setTimeout(() => {
            clickTimeoutRef.current = null
            togglePlay()
          }, DOUBLE_CLICK_THRESHOLD)
        }
      },
      [toggleFullscreen, togglePlay]
    )

    const handleSeek = useCallback(
      (newTime: number) => {
        if (!videoRef.current) return
        videoRef.current.currentTime = newTime
        notifyTimeSubscribers(newTime, videoRef.current.duration || 0)
      },
      [notifyTimeSubscribers]
    )

    const seekBackward = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (!videoRef.current) return
        const newTime = Math.max(0, videoRef.current.currentTime - 10)
        videoRef.current.currentTime = newTime
        notifyTimeSubscribers(newTime, videoRef.current.duration || 0)
      },
      [notifyTimeSubscribers]
    )

    const seekForward = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (!videoRef.current) return
        const maxDur = videoRef.current.duration || stateRef.current.duration
        const newTime = Math.min(maxDur, videoRef.current.currentTime + 10)
        videoRef.current.currentTime = newTime
        notifyTimeSubscribers(newTime, maxDur)
      },
      [notifyTimeSubscribers]
    )

    // Synchronize native video element volume & mute attributes with state
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.volume = volume
        videoRef.current.muted = isMuted
      }
    }, [volume, isMuted, src])

    // Reset player state when source or rotation changes
    useEffect(() => {
      setIsPlaying(false)
      setDuration(0)
      setInternalRotation(rotationProp !== undefined ? rotationProp : (initialRotation ?? 0))
      setScale(1)
      setPlaybackRate(1)
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
      lastClickTimeRef.current = 0
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.playbackRate = 1
        videoRef.current.pause()
      }
      notifyTimeSubscribers(0, 0)
      onPlayStateChangeRef.current?.(false)
    }, [src, initialRotation, rotationProp, notifyTimeSubscribers])

    // Synchronize playbackRate if video element changes rate externally
    useEffect(() => {
      const video = videoRef.current
      if (!video) return
      const handleRateChange = () => {
        setPlaybackRate(video.playbackRate)
      }
      video.addEventListener("ratechange", handleRateChange)
      return () => video.removeEventListener("ratechange", handleRateChange)
    }, [src])

    // Auto-play when requested
    useEffect(() => {
      if (!autoPlay || !videoRef.current) return
      const video = videoRef.current
      let isMounted = true

      const attemptPlay = () => {
        video
          .play()
          .then(() => {
            if (isMounted) setIsPlaying(true)
          })
          .catch(() => {})
      }

      if (video.readyState >= 2) {
        attemptPlay()
      } else {
        const handleCanPlay = () => attemptPlay()
        video.addEventListener("canplay", handleCanPlay, { once: true })
        video.addEventListener("loadeddata", handleCanPlay, { once: true })
        return () => {
          isMounted = false
          video.removeEventListener("canplay", handleCanPlay)
          video.removeEventListener("loadeddata", handleCanPlay)
        }
      }
    }, [src, autoPlay])

    // Sync native fullscreen state changes
    useEffect(() => {
      const handleFullscreenChange = () => {
        const isCurrentlyFullscreen = document.fullscreenElement === containerRef.current
        setInternalFullscreen(isCurrentlyFullscreen)
      }

      document.addEventListener("fullscreenchange", handleFullscreenChange)
      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange)
      }
    }, [])

    // Stable global keydown listener (attached once)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return
        }

        const key = e.key.toLowerCase()

        // Fullscreen: F
        if (key === "f") {
          e.preventDefault()
          void toggleFullscreen()
          return
        }

        // Playback Speed: Shift + ArrowRight / Shift + ArrowLeft
        if (e.shiftKey && e.key === "ArrowRight") {
          e.preventDefault()
          increaseSpeed()
          return
        }
        if (e.shiftKey && e.key === "ArrowLeft") {
          e.preventDefault()
          decreaseSpeed()
          return
        }

        // Orientation / Rotate: Ctrl + ArrowLeft / Ctrl + ArrowRight
        if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") {
          e.preventDefault()
          rotateLeft()
          return
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") {
          e.preventDefault()
          rotateRight()
          return
        }

        // Mute / Unmute toggle: M
        if (key === "m") {
          e.preventDefault()
          toggleMute()
          return
        }

        // Play / Pause: Space
        if (e.key === " " || key === "spacebar") {
          e.preventDefault()
          togglePlay()
          return
        }

        // Seek ±5s & Volume
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            if (videoRef.current) {
              const newTime = Math.max(0, videoRef.current.currentTime - 5)
              videoRef.current.currentTime = newTime
              notifyTimeSubscribers(newTime, videoRef.current.duration || 0)
              resetHideTimer()
            }
          } else if (e.key === "ArrowRight") {
            e.preventDefault()
            if (videoRef.current) {
              const maxDur = videoRef.current.duration || stateRef.current.duration
              const newTime = Math.min(maxDur, videoRef.current.currentTime + 5)
              videoRef.current.currentTime = newTime
              notifyTimeSubscribers(newTime, maxDur)
              resetHideTimer()
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            if (videoRef.current) {
              const newVolume = Math.min(1, Math.round((videoRef.current.volume + 0.1) * 10) / 10)
              handleVolumeUpdate(newVolume, false)
              resetHideTimer()
            }
          } else if (e.key === "ArrowDown") {
            e.preventDefault()
            if (videoRef.current) {
              const newVolume = Math.max(0, Math.round((videoRef.current.volume - 0.1) * 10) / 10)
              handleVolumeUpdate(newVolume, newVolume === 0)
              resetHideTimer()
            }
          }
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [
      toggleFullscreen,
      increaseSpeed,
      decreaseSpeed,
      rotateLeft,
      rotateRight,
      toggleMute,
      togglePlay,
      handleVolumeUpdate,
      notifyTimeSubscribers,
      resetHideTimer,
    ])

    useEffect(() => {
      return () => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current)
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
      }
    }, [])

    return (
      <div
        ref={containerRef}
        style={CONTAINER_STYLE}
        className={`group/video relative flex h-full w-full items-center justify-center overflow-hidden bg-black outline-hidden touch-manipulation ${
          showControls ? "" : "cursor-none"
        } ${className}`}
        onMouseMove={resetHideTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        tabIndex={0}
      >
        <div
          ref={transformRef}
          className="pointer-events-none flex h-full w-full items-center justify-center transition-transform ease-out"
        >
          <div className="pointer-events-auto flex h-full w-full max-h-full max-w-full items-center justify-center">
            <video
              ref={videoRef}
              src={safeSrc}
              poster={safePoster}
              style={videoStyle}
              className="max-h-full max-w-full cursor-pointer object-contain shadow-lg select-none transition-transform duration-200"
              onClick={handleVideoClick}
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) {
                  notifyTimeSubscribers(videoRef.current.currentTime, videoRef.current.duration || 0)
                }
              }}
              onLoadedMetadata={() => {
                const dur = videoRef.current?.duration ?? 0
                setDuration(dur)
                calculateScale()
                notifyTimeSubscribers(0, dur)
              }}
              onPlay={() => {
                setIsPlaying(true)
                resetHideTimer()
                onPlayStateChangeRef.current?.(true)
              }}
              onPause={() => {
                setIsPlaying(false)
                setShowControls(true)
                onPlayStateChangeRef.current?.(false)
              }}
              onEnded={() => {
                setIsPlaying(false)
                setShowControls(true)
                notifyTimeSubscribers(0, videoRef.current?.duration || 0)
                onPlayStateChangeRef.current?.(false)
              }}
            />
          </div>
        </div>

        {/* Large center play button */}
        <VideoCenterPlayButton
          isPlaying={isPlaying}
          showControls={showControls}
          onClick={handleVideoClick}
        />

        {/* Controls bar */}
        <VideoControlsBar
          showControls={showControls}
          isPlaying={isPlaying}
          isNarrow={isNarrow}
          volume={volume}
          isMuted={isMuted}
          playbackRate={playbackRate}
          isFullscreen={isFullscreen}
          hideFullscreen={hideFullscreen}
          initialDuration={duration}
          subscribeTimeUpdate={subscribeTimeUpdate}
          containerElement={containerRef.current}
          onSeek={handleSeek}
          onTogglePlay={togglePlay}
          onSeekBackward={seekBackward}
          onSeekForward={seekForward}
          onVolumeChange={handleVolumeUpdate}
          onToggleMute={toggleMute}
          onChangePlaybackRate={changePlaybackRate}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    )
  }
)

VideoPlayer.displayName = "VideoPlayer"

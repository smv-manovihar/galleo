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
import { VideoFeedbackOverlay, type FeedbackPayload } from "./video/VideoFeedbackOverlay"

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
  /** Force enable zoom and rotation controls even when not in fullscreen (e.g. for cards) */
  showZoomRotateControls?: boolean
  /** Zoom scale coordination */
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  onSetScale?: (scale: number) => void
  onRotateLeft?: () => void
  onRotateRight?: () => void
  onRotateReset?: () => void
  registerScaleListener?: (listener: (scale: number) => void) => () => void
  /** When true, disables the global window keydown listener (useful when embedded in cards) */
  disableKeyboardShortcuts?: boolean
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
      fillContainer = false,
      transformRef,
      showZoomRotateControls = false,
      disableKeyboardShortcuts = false,
      onZoomIn: onZoomInProp,
      onZoomOut: onZoomOutProp,
      onZoomReset: onZoomResetProp,
      onSetScale: onSetScaleProp,
      onRotateLeft: onRotateLeftProp,
      onRotateRight: onRotateRightProp,
      onRotateReset: onRotateResetProp,
      registerScaleListener: registerScaleListenerProp,
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
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({
      width: 0,
      height: 0,
    })
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
      width: 0,
      height: 0,
    })
    const [internalZoomScale, setInternalZoomScale] = useState(1)
    const [enableTransition, setEnableTransition] = useState(false)
    const [feedback, setFeedback] = useState<FeedbackPayload | null>(null)
    const prevSrcRef = useRef(src)

    useEffect(() => {
      if (prevSrcRef.current !== src) {
        prevSrcRef.current = src
        setEnableTransition(false)
      }
      const timer = setTimeout(() => {
        setEnableTransition(true)
      }, 50)
      return () => clearTimeout(timer)
    }, [src])

    // 2. Refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const localTransformRef = useRef<HTMLDivElement>(null)
    const timeSubscribersRef = useRef<Set<(cur: number, dur: number) => void>>(new Set())
    const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastClickTimeRef = useRef<number>(0)
    const onPlayStateChangeRef = useRef(onPlayStateChange)
    const onRotationChangeRef = useRef(onRotationChange)
    const onFullscreenToggleRef = useRef(onFullscreenToggle)

    // Pan & Drag state
    const scaleRef = useRef(1)
    const positionRef = useRef({ x: 0, y: 0 })
    const isPanningRef = useRef(false)
    const panStartRef = useRef({ x: 0, y: 0 })
    const dragDistanceRef = useRef(0)
    const justDraggedRef = useRef(false)

    // Feedback accumulation refs
    const feedbackSeqRef = useRef(0)
    const seekAccumulatorRef = useRef(0)
    const seekAccTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Synchronize external transformRef
    useImperativeHandle(transformRef, () => localTransformRef.current as HTMLDivElement)

    // Sync external scale listener if provided
    useEffect(() => {
      if (registerScaleListenerProp) {
        return registerScaleListenerProp((s) => {
          scaleRef.current = s
          setInternalZoomScale(s)
          if (s === 1) {
            positionRef.current = { x: 0, y: 0 }
          }
        })
      }
    }, [registerScaleListenerProp])

    // Update Direct DOM Transform for zoom/pan
    const updateTransform = useCallback((animated = false) => {
      const el = localTransformRef.current
      if (!el) return
      const s = scaleRef.current
      const pos = positionRef.current
      const panning = isPanningRef.current

      if (s > 1) {
        el.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${s})`
        el.style.transitionDuration = panning || !animated ? "0s" : "0.15s"
        el.style.cursor = panning ? "grabbing" : "grab"
      } else {
        el.style.transform = ""
        el.style.transitionDuration = animated ? "0.15s" : "0s"
        el.style.cursor = "default"
      }
    }, [])

    const rotation = rotationProp !== undefined ? rotationProp : internalRotation
    const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen

    // Latest state ref for stable event listeners
    const stateRef = useRef({
      volume,
      isMuted,
      duration,
      playbackRate,
      rotation,
      isPlaying,
      isFullscreen,
    })

    stateRef.current = {
      volume,
      isMuted,
      duration,
      playbackRate,
      rotation,
      isPlaying,
      isFullscreen,
    }
    onPlayStateChangeRef.current = onPlayStateChange
    onRotationChangeRef.current = onRotationChange
    onFullscreenToggleRef.current = onFullscreenToggle

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

    // Feedback trigger helper — bumps sequence to trigger overlay re-render
    const triggerFeedback = useCallback((payload: Omit<FeedbackPayload, "__seq"> & { kind: FeedbackPayload["kind"] }) => {
      feedbackSeqRef.current += 1
      setFeedback({ ...payload } as FeedbackPayload)
    }, [])

    const triggerSeekFeedback = useCallback((offset: number, destinationTime: number) => {
      seekAccumulatorRef.current += offset
      if (seekAccTimerRef.current) clearTimeout(seekAccTimerRef.current)
      seekAccTimerRef.current = setTimeout(() => {
        seekAccumulatorRef.current = 0
      }, 1200)
      triggerFeedback({
        kind: "seek",
        value: offset,
        accumulated: seekAccumulatorRef.current,
        timestamp: destinationTime,
      })
    }, [triggerFeedback])

    // 4. Sizing & Fit Calculations
    const safeSrc = useMemo(() => {
      return src.startsWith("media:///") ? src : `media:///${src.replace(/\\/g, "/")}`
    }, [src])

    const safePoster = useMemo(() => {
      if (!poster) return undefined
      return poster.startsWith("media:///") ? poster : `media:///${poster.replace(/\\/g, "/")}`
    }, [poster])

    const visualDimensions = useMemo(() => {
      const norm = ((rotation % 360) + 360) % 360
      const isRot90 = norm === 90 || norm === 270

      const natW = videoDimensions.width || 1920
      const natH = videoDimensions.height || 1080
      const cW = containerSize.width || 896
      const cH = containerSize.height || 504

      const visualAspect = isRot90 ? natH / natW : natW / natH
      const isVisuallyHorizontal = visualAspect >= 1

      // Controls width: in fullscreen or fillContainer it spans cW, in normal mode max-w-4xl (896px)
      const maxControlsWidth = isFullscreen || fillContainer ? cW : Math.min(cW, 896)

      let visualW = maxControlsWidth
      let visualH = maxControlsWidth / visualAspect

      if (fillContainer) {
        if (cH > 0 && visualH > cH) {
          visualH = cH
          visualW = cH * visualAspect
        }
      } else if (isVisuallyHorizontal) {
        // Horizontal: scale 1 video width matches the video controls width
        if (cH > 0 && visualH > cH) {
          visualH = cH
          visualW = cH * visualAspect
        }
      } else {
        // Visually vertical: fit properly within container height and width
        const fitH = cH > 0 ? cH : 504
        visualH = Math.min(fitH, maxControlsWidth / visualAspect)
        visualW = visualH * visualAspect
      }

      return {
        visualW,
        visualH,
        videoDomW: isRot90 ? visualH : visualW,
        videoDomH: isRot90 ? visualW : visualH,
        isRot90,
      }
    }, [rotation, videoDimensions, containerSize, isFullscreen, fillContainer])

    // 5. Container ResizeObserver
    useEffect(() => {
      const el = containerRef.current
      if (!el) return

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setIsNarrow(entry.contentRect.width < 450)
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          })
        }
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [])

    // 6. Auto-hide timer for controls
    const resetHideTimer = useCallback(() => {
      setShowControls(true)
      if (hideTimeout.current) clearTimeout(hideTimeout.current)
      hideTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, 2500)
    }, [])

    // 7. Fullscreen & Playback Controls
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
      triggerFeedback({ kind: "volume", value: newVol, muted: nextMuted })
    }, [triggerFeedback])

    const toggleMute = useCallback(() => {
      const { isMuted: currentlyMuted, volume: currentVol } = stateRef.current
      if (currentlyMuted || currentVol === 0) {
        const restoredVol = currentVol > 0 ? currentVol : 0.5
        handleVolumeUpdate(restoredVol, false)
      } else {
        handleVolumeUpdate(currentVol, true)
      }
    }, [handleVolumeUpdate])

    const changePlaybackRate = useCallback(
      (newRate: number) => {
        setPlaybackRate(newRate)
        if (videoRef.current) {
          videoRef.current.playbackRate = newRate
        }
        triggerFeedback({ kind: "speed", value: newRate })
      },
      [triggerFeedback]
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
      if (onRotateLeftProp) {
        onRotateLeftProp()
      } else {
        handleRotationUpdate(stateRef.current.rotation - 90)
      }
      const newRot = stateRef.current.rotation - 90
      triggerFeedback({ kind: "rotation", value: newRot })
    }, [onRotateLeftProp, handleRotationUpdate, triggerFeedback])

    const rotateRight = useCallback(() => {
      if (onRotateRightProp) {
        onRotateRightProp()
      } else {
        handleRotationUpdate(stateRef.current.rotation + 90)
      }
      const newRot = stateRef.current.rotation + 90
      triggerFeedback({ kind: "rotation", value: newRot })
    }, [onRotateRightProp, handleRotationUpdate, triggerFeedback])

    const rotateReset = useCallback(() => {
      if (onRotateResetProp) {
        onRotateResetProp()
      } else {
        const nearestZero = Math.round(stateRef.current.rotation / 360) * 360
        handleRotationUpdate(nearestZero)
      }
      triggerFeedback({ kind: "rotation", value: 0 })
    }, [onRotateResetProp, handleRotationUpdate, triggerFeedback])

    // Zoom Handlers
    const setZoomScaleValue = useCallback(
      (newScale: number, animated = true) => {
        scaleRef.current = newScale
        setInternalZoomScale(newScale)
        if (newScale === 1) {
          positionRef.current = { x: 0, y: 0 }
        }
        if (onSetScaleProp) {
          onSetScaleProp(newScale)
        }
        updateTransform(animated)
      },
      [onSetScaleProp, updateTransform]
    )

    const zoomIn = useCallback(() => {
      if (onZoomInProp) {
        onZoomInProp()
      } else {
        setZoomScaleValue(Math.min(scaleRef.current + 0.5, 6), true)
      }
      triggerFeedback({ kind: "zoom", value: scaleRef.current })
    }, [onZoomInProp, setZoomScaleValue, triggerFeedback])

    const zoomOut = useCallback(() => {
      if (onZoomOutProp) {
        onZoomOutProp()
      } else {
        setZoomScaleValue(Math.max(scaleRef.current - 0.5, 1), true)
      }
      triggerFeedback({ kind: "zoom", value: scaleRef.current })
    }, [onZoomOutProp, setZoomScaleValue, triggerFeedback])

    const zoomReset = useCallback(() => {
      if (onZoomResetProp) {
        onZoomResetProp()
      } else {
        setZoomScaleValue(1, true)
      }
      triggerFeedback({ kind: "zoom", value: scaleRef.current })
    }, [onZoomResetProp, setZoomScaleValue, triggerFeedback])

    const setScaleDirect = useCallback(
      (newScale: number) => {
        if (onSetScaleProp) {
          onSetScaleProp(newScale)
        } else {
          setZoomScaleValue(newScale, true)
        }
        triggerFeedback({ kind: "zoom", value: newScale })
      },
      [onSetScaleProp, setZoomScaleValue, triggerFeedback]
    )

    const togglePlay = useCallback(() => {
      if (!videoRef.current) return
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => {
          console.error("Playback failed:", err)
        })
      } else {
        videoRef.current.pause()
      }
    }, [])

    const handleVideoClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        if (justDraggedRef.current) {
          return
        }
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

    // Pointer Events for Dragging / Panning
    // Track the pointer ID so we can capture lazily on first significant move
    const pendingPanPointerRef = useRef<number | null>(null)

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return
        const target = e.target as HTMLElement
        if (
          target.closest("button") ||
          target.closest(".slider") ||
          target.closest('[role="slider"]') ||
          target.closest('[data-slot="slider"]') ||
          target.closest('[data-slot="popover"]') ||
          target.closest('[data-slot="popover-content"]') ||
          target.closest('[data-slot="dialog"]')
        ) {
          return
        }

        if (scaleRef.current <= 1) return

        // Don't preventDefault or setPointerCapture yet — let the click
        // event chain fire normally. We'll capture lazily on first significant move.
        isPanningRef.current = true
        dragDistanceRef.current = 0
        pendingPanPointerRef.current = e.pointerId
        panStartRef.current = {
          x: e.clientX - positionRef.current.x,
          y: e.clientY - positionRef.current.y,
        }
      },
      []
    )

    const DRAG_THRESHOLD = 5

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPanningRef.current) return
        const newX = e.clientX - panStartRef.current.x
        const newY = e.clientY - panStartRef.current.y
        const dx = e.movementX || 0
        const dy = e.movementY || 0
        dragDistanceRef.current += Math.hypot(dx, dy)

        // Lazily capture the pointer once drag exceeds threshold
        if (dragDistanceRef.current > DRAG_THRESHOLD && pendingPanPointerRef.current !== null) {
          try {
            e.currentTarget.setPointerCapture(pendingPanPointerRef.current)
          } catch {
            // Ignore capture failure
          }
          pendingPanPointerRef.current = null
        }

        positionRef.current = { x: newX, y: newY }
        updateTransform(false)
      },
      [updateTransform]
    )

    const handlePointerUp = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        pendingPanPointerRef.current = null
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            // Ignore release pointer capture failure
          }
        }
        if (!isPanningRef.current) return
        isPanningRef.current = false
        if (dragDistanceRef.current > DRAG_THRESHOLD) {
          justDraggedRef.current = true
          setTimeout(() => {
            justDraggedRef.current = false
          }, 150)
        }
        dragDistanceRef.current = 0
        updateTransform(false)
      },
      [updateTransform]
    )

    const handlePointerCancel = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        pendingPanPointerRef.current = null
        isPanningRef.current = false
        dragDistanceRef.current = 0
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            // Ignore release pointer capture failure
          }
        }
        updateTransform(false)
      },
      [updateTransform]
    )

    // Wheel zoom
    const handleWheel = useCallback(
      (e: React.WheelEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement
        if (
          target.closest("button") ||
          target.closest(".slider") ||
          target.closest('[role="slider"]') ||
          target.closest('[data-slot="slider"]') ||
          target.closest('[data-slot="popover"]') ||
          target.closest('[data-slot="popover-content"]')
        ) {
          return
        }

        const zoomStep = 0.1
        let newScale = scaleRef.current + (e.deltaY < 0 ? zoomStep : -zoomStep)
        newScale = Math.round(newScale * 10) / 10
        newScale = Math.max(1, Math.min(6, newScale))
        setZoomScaleValue(newScale, true)
      },
      [setZoomScaleValue]
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
        triggerSeekFeedback(-10, newTime)
      },
      [notifyTimeSubscribers, triggerSeekFeedback]
    )

    const seekForward = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (!videoRef.current) return
        const maxDur = videoRef.current.duration || stateRef.current.duration
        const newTime = Math.min(maxDur, videoRef.current.currentTime + 10)
        videoRef.current.currentTime = newTime
        notifyTimeSubscribers(newTime, maxDur)
        triggerSeekFeedback(10, newTime)
      },
      [notifyTimeSubscribers, triggerSeekFeedback]
    )

    // Synchronize native video element volume & mute attributes with state
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.volume = volume
        videoRef.current.muted = isMuted
      }
    }, [volume, isMuted, src])

    const initialRotationRef = useRef(initialRotation)
    const rotationPropRef = useRef(rotationProp)

    useEffect(() => {
      initialRotationRef.current = initialRotation
      rotationPropRef.current = rotationProp
    }, [initialRotation, rotationProp])

    // Synchronize rotationProp if passed externally
    useEffect(() => {
      if (rotationProp !== undefined) {
        setInternalRotation(rotationProp)
      }
    }, [rotationProp])

    // Reset player state only when source changes
    useEffect(() => {
      setIsPlaying(false)
      setDuration(0)
      const initRot =
        rotationPropRef.current !== undefined
          ? rotationPropRef.current
          : (initialRotationRef.current ?? 0)
      setInternalRotation(initRot)
      scaleRef.current = 1
      positionRef.current = { x: 0, y: 0 }
      setInternalZoomScale(1)
      setPlaybackRate(1)
      setFeedback(null)
      seekAccumulatorRef.current = 0
      if (seekAccTimerRef.current) clearTimeout(seekAccTimerRef.current)
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
      updateTransform(false)
      notifyTimeSubscribers(0, 0)
      onPlayStateChangeRef.current?.(false)
    }, [src, notifyTimeSubscribers, updateTransform])

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
      if (disableKeyboardShortcuts) return

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
              triggerSeekFeedback(-5, newTime)
            }
          } else if (e.key === "ArrowRight") {
            e.preventDefault()
            if (videoRef.current) {
              const maxDur = videoRef.current.duration || stateRef.current.duration
              const newTime = Math.min(maxDur, videoRef.current.currentTime + 5)
              videoRef.current.currentTime = newTime
              notifyTimeSubscribers(newTime, maxDur)
              triggerSeekFeedback(5, newTime)
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            if (videoRef.current) {
              const newVolume = Math.min(1, Math.round((videoRef.current.volume + 0.1) * 10) / 10)
              handleVolumeUpdate(newVolume, false)
            }
          } else if (e.key === "ArrowDown") {
            e.preventDefault()
            if (videoRef.current) {
              const newVolume = Math.max(0, Math.round((videoRef.current.volume - 0.1) * 10) / 10)
              handleVolumeUpdate(newVolume, newVolume === 0)
            }
          }
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [
      disableKeyboardShortcuts,
      toggleFullscreen,
      increaseSpeed,
      decreaseSpeed,
      triggerSeekFeedback,
      rotateLeft,
      rotateRight,
      toggleMute,
      togglePlay,
      handleVolumeUpdate,
      notifyTimeSubscribers,
    ])

    useEffect(() => {
      return () => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current)
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
        if (seekAccTimerRef.current) clearTimeout(seekAccTimerRef.current)
      }
    }, [])

    return (
      <div
        ref={containerRef}
        style={CONTAINER_STYLE}
        className={`group/video relative flex h-full w-full items-center justify-center overflow-hidden bg-black outline-hidden touch-manipulation select-none ${
          showControls ? "" : "cursor-none"
        } ${className}`}
        onMouseMove={() => {
          resetHideTimer()
        }}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onWheel={(e) => {
          handleWheel(e)
          resetHideTimer()
        }}
        onPointerDown={(e) => {
          handlePointerDown(e)
          resetHideTimer()
        }}
        onPointerMove={(e) => {
          handlePointerMove(e)
          resetHideTimer()
        }}
        onPointerUp={(e) => {
          handlePointerUp(e)
          resetHideTimer()
        }}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        tabIndex={0}
      >
        <div
          ref={localTransformRef}
          className="pointer-events-none flex h-full w-full items-center justify-center transition-transform ease-out"
        >
          <div
            style={{
              width: `${visualDimensions.visualW}px`,
              height: `${visualDimensions.visualH}px`,
            }}
            className="pointer-events-auto relative flex shrink-0 items-center justify-center"
          >
            <video
              ref={videoRef}
              src={safeSrc}
              poster={safePoster}
              style={{
                width: `${visualDimensions.videoDomW}px`,
                height: `${visualDimensions.videoDomH}px`,
                transform: `rotate(${rotation}deg)`,
                transition: enableTransition
                  ? "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)"
                  : "none",
                touchAction: "manipulation",
              }}
              className={`max-h-none max-w-none shadow-lg select-none ${
                internalZoomScale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
              }`}
              onClick={handleVideoClick}
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) {
                  notifyTimeSubscribers(videoRef.current.currentTime, videoRef.current.duration || 0)
                }
              }}
              onLoadedMetadata={() => {
                const dur = videoRef.current?.duration ?? 0
                const vW = videoRef.current?.videoWidth ?? 0
                const vH = videoRef.current?.videoHeight ?? 0
                setDuration(dur)
                if (vW && vH) {
                  setVideoDimensions({ width: vW, height: vH })
                }
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

        {/* Subtle top-center value change HUD */}
        <VideoFeedbackOverlay feedback={feedback} />

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
          showZoomRotateControls={showZoomRotateControls}
          zoomScale={internalZoomScale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
          onSetScale={setScaleDirect}
          rotation={rotation}
          onRotateRight={rotateRight}
          onRotateLeft={rotateLeft}
          onRotateReset={rotateReset}
        />
      </div>
    )
  }
)

VideoPlayer.displayName = "VideoPlayer"

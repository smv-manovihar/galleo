import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw, RefreshCw, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  /** Hide the fullscreen button entirely (e.g. when parent provides its own) */
  hideFullscreen?: boolean;
  /** When provided, the fullscreen button delegates to this callback instead of managing its own fullscreen */
  onFullscreenToggle?: () => void;
  /** External fullscreen state from a parent — drives auto-hide controls behavior */
  externalFullscreen?: boolean;
  /** Callback fired when play state changes */
  onPlayStateChange?: (playing: boolean) => void;
}

export interface VideoPlayerRef {
  requestFullscreen: () => Promise<void>;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  src,
  poster,
  className = '',
  hideFullscreen = false,
  onFullscreenToggle,
  externalFullscreen,
  onPlayStateChange
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setContainerElement(containerRef.current);
      
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setIsNarrow(entry.contentRect.width < 450);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  // Use external fullscreen state if provided, otherwise fall back to internal
  const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen;

  const isRotated90 = Math.abs((rotation / 90) % 2) === 1;

  const effectiveAspect = useMemo(() => {
    if (!aspectRatio) return null;
    return isRotated90 ? (1 / aspectRatio) : aspectRatio;
  }, [aspectRatio, isRotated90]);

  const containerStyle = useMemo<React.CSSProperties>(() => {
    if (isFullscreen) return { width: '100%', height: '100%' };
    if (!effectiveAspect) return { width: '100%' };
    
    if (effectiveAspect < 1) {
      return {
        maxWidth: `calc(70vh * ${effectiveAspect})`,
        maxHeight: '70vh',
        width: '100%',
        aspectRatio: `${effectiveAspect}`
      };
    } else {
      return {
        maxWidth: '100%',
        maxHeight: '70vh',
        width: '100%',
        aspectRatio: `${effectiveAspect}`
      };
    }
  }, [effectiveAspect, isFullscreen]);

  const calculateScale = useCallback(() => {
    if (!videoRef.current || !containerRef.current || !isRotated90) {
      setScale(1);
      return;
    }
    const vW = videoRef.current.videoWidth;
    const vH = videoRef.current.videoHeight;
    const cW = containerRef.current.clientWidth;
    const cH = containerRef.current.clientHeight;
    
    if (vW && vH && cW && cH) {
      const normalScale = Math.min(cW / vW, cH / vH);
      const rotatedScale = Math.min(cW / vH, cH / vW);
      setScale(rotatedScale / normalScale);
    } else {
      setScale(1);
    }
  }, [isRotated90]);

  // Recalculate scale on rotation, mount, or window resize
  useEffect(() => {
    calculateScale();
  }, [rotation, calculateScale]);

  useEffect(() => {
    const handleResize = () => calculateScale();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateScale]);

  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accept pre-formatted media:/// URLs or raw OS paths
  const safeSrc = src.startsWith('media:///') ? src : `media:///${src.replace(/\\/g, '/')}`;
  const safePoster = !poster ? undefined
    : poster.startsWith('media:///') ? poster
    : `media:///${poster.replace(/\\/g, '/')}`;

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  }, [isPlaying]);

  // Reset player state when source changes to prevent state desync across files
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setRotation(0);
    setScale(1);
    setAspectRatio(null);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
    onPlayStateChange?.(false);
  }, [src]);

  // Expose methods to parent ref
  useImperativeHandle(ref, () => ({
    requestFullscreen: async () => {
      if (!containerRef.current) return;
      try {
        if (!document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
          setInternalFullscreen(true);
        } else {
          await document.exitFullscreen();
          setInternalFullscreen(false);
        }
      } catch (err) {
        console.error('Failed to toggle fullscreen:', err);
      }
    }
  }));

  useEffect(() => {
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => {
        console.error('Playback failed:', err);
      });
    }
    resetHideTimer();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleVolumeChange = (val: number[]) => {
    if (!videoRef.current) return;
    const v = val[0];
    videoRef.current.volume = v;
    videoRef.current.muted = v === 0;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const handleSeek = (val: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = val[0];
    setCurrentTime(val[0]);
  };

  const handleFullscreenClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFullscreenToggle) {
      onFullscreenToggle();
      return;
    }
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setInternalFullscreen(true);
    } else {
      await document.exitFullscreen();
      setInternalFullscreen(false);
    }
  };

  const rotateLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation(prev => prev - 90);
  };

  const rotateRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation(prev => prev + 90);
  };

  const seekBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const newTime = Math.max(0, videoRef.current.currentTime - 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const seekForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const newTime = Math.min(duration, videoRef.current.currentTime + 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const btnClass = isNarrow 
    ? "w-7 h-7 rounded-full text-white hover:bg-white/10 cursor-pointer shrink-0" 
    : "w-8 h-8 rounded-full text-white hover:bg-white/20 cursor-pointer shrink-0";
    
  const iconClass = isNarrow ? "w-3.5 h-3.5" : "w-4 h-4";
  const playIconClass = isNarrow ? "w-3.5 h-3.5 fill-current" : "w-4 h-4 fill-current";
  const playIconMargin = isNarrow ? "ml-0.5" : "ml-0.5";
  const rowGapClass = isNarrow ? "gap-1" : "gap-2";
  const rightGapClass = isNarrow ? "gap-1" : "gap-1.5";
  const paddingClass = isNarrow ? "px-2.5 pb-2 pt-6 gap-1" : "px-4 pb-3 pt-8 gap-2";

  const videoStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`relative group/video overflow-hidden bg-black flex items-center justify-center ${className}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={safeSrc}
        poster={safePoster}
        style={videoStyle}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration ?? 0);
          const vW = videoRef.current?.videoWidth;
          const vH = videoRef.current?.videoHeight;
          if (vW && vH) {
            setAspectRatio(vW / vH);
          }
          calculateScale();
        }}
        onPlay={() => { setIsPlaying(true); resetHideTimer(); onPlayStateChange?.(true); }}
        onPause={() => { setIsPlaying(false); setShowControls(true); onPlayStateChange?.(false); }}
        onEnded={() => { setIsPlaying(false); setShowControls(true); setCurrentTime(0); onPlayStateChange?.(false); }}
      />

      {/* Large center play button when paused */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm transition-transform hover:scale-110">
            <Play className="w-7 h-7 fill-white text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        <div className={`relative flex flex-col ${paddingClass}`}>
          {/* Scrubber */}
          <Slider
            min={0}
            max={duration || 1}
            step={0.1}
            value={[currentTime]}
            onValueChange={handleSeek}
            className="w-full cursor-pointer [&_.slider-thumb]:bg-white [&_.slider-track]:bg-white/20 [&_.slider-range]:bg-white"
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
                    onClick={seekBackward}
                  >
                    <RotateCcw className={iconClass} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement}>Seek Back 10s</TooltipContent>
              </Tooltip>

              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className={btnClass}
                onClick={togglePlay}
              >
                {isPlaying
                  ? <Pause className={playIconClass} />
                  : <Play className={`${playIconClass} ${playIconMargin}`} />
                }
              </Button>

              {/* Seek Forward 10s */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={btnClass}
                    onClick={seekForward}
                  >
                    <RotateCw className={iconClass} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement}>Seek Forward 10s</TooltipContent>
              </Tooltip>

              {/* Mute */}
              <Button
                variant="ghost"
                size="icon"
                className={btnClass}
                onClick={toggleMute}
              >
                {isMuted || volume === 0
                  ? <VolumeX className={iconClass} />
                  : <Volume2 className={iconClass} />
                }
              </Button>

              {/* Volume slider */}
              {!isNarrow && (
                <div className="w-20 hidden sm:block">
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={[isMuted ? 0 : volume]}
                    onValueChange={handleVolumeChange}
                    className="cursor-pointer [&_.slider-thumb]:bg-white [&_.slider-track]:bg-white/20 [&_.slider-range]:bg-white"
                  />
                </div>
              )}

              {/* Time */}
              <span className={`text-white/80 font-mono tabular-nums select-none ${isNarrow ? 'text-[0.625rem]' : 'text-[0.6875rem]'}`}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right side controls: Rotation + Fullscreen */}
            <div className={`flex items-center ${rightGapClass}`}>
              {/* Rotate Left (90 deg Counter-Clockwise) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={btnClass}
                    onClick={rotateLeft}
                  >
                    <RefreshCcw className={iconClass} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement}>Rotate Left 90°</TooltipContent>
              </Tooltip>

              {/* Rotate Right (90 deg Clockwise) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={btnClass}
                    onClick={rotateRight}
                  >
                    <RefreshCw className={iconClass} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement}>Rotate Right 90°</TooltipContent>
              </Tooltip>

              {/* Fullscreen */}
              {!hideFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={btnClass}
                  onClick={handleFullscreenClick}
                >
                  {isFullscreen
                    ? <Minimize className={iconClass} />
                    : <Maximize className={iconClass} />
                  }
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

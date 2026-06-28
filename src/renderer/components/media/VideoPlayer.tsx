import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Use external fullscreen state if provided, otherwise fall back to internal
  const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen;

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
      // Delegate to parent's fullscreen handler
      onFullscreenToggle();
      return;
    }
    // Internal fullscreen management
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setInternalFullscreen(true);
    } else {
      await document.exitFullscreen();
      setInternalFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative group/video overflow-hidden bg-black flex items-center justify-center ${className}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={safeSrc}
        poster={safePoster}
        className={`w-full h-full object-contain cursor-pointer ${isFullscreen ? 'max-h-full' : 'max-h-[70vh]'}`}
        onClick={togglePlay}
        playsInline
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
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

        <div className="relative px-4 pb-3 pt-8 flex flex-col gap-2">
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
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full text-white hover:bg-white/20 cursor-pointer"
                onClick={togglePlay}
              >
                {isPlaying
                  ? <Pause className="w-4 h-4 fill-current" />
                  : <Play className="w-4 h-4 fill-current ml-0.5" />
                }
              </Button>

              {/* Mute */}
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full text-white hover:bg-white/20 cursor-pointer"
                onClick={toggleMute}
              >
                {isMuted || volume === 0
                  ? <VolumeX className="w-4 h-4" />
                  : <Volume2 className="w-4 h-4" />
                }
              </Button>

              {/* Volume slider */}
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

              {/* Time */}
              <span className="text-white/80 text-[0.6875rem] font-mono tabular-nums select-none">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Fullscreen */}
            {!hideFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full text-white hover:bg-white/20 cursor-pointer"
                onClick={handleFullscreenClick}
              >
                {isFullscreen
                  ? <Minimize className="w-4 h-4" />
                  : <Maximize className="w-4 h-4" />
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MediaItem } from '../../../shared/types/media';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Info, 
  Calendar, 
  FileImage,
  FolderOpen,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatBytes, formatDate } from '../../lib/format';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MediaPreviewProps {
  item: MediaItem | null;
  onClose: () => void;
  items?: MediaItem[];
  onItemChange?: (item: MediaItem) => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  item: propItem,
  onClose,
  items,
  onItemChange
}) => {
  const [showMetaPanel, setShowMetaPanel] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (propItem) {
      setActiveItem(propItem);
    }
  }, [propItem]);

  const item = propItem || activeItem;

  const currentIndex = items && item ? items.findIndex(i => i.id === item.id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = items ? currentIndex < items.length - 1 : false;

  const handlePrevious = useCallback(() => {
    if (items && hasPrevious && onItemChange) {
      onItemChange(items[currentIndex - 1]);
    }
  }, [items, hasPrevious, onItemChange, currentIndex]);

  const handleNext = useCallback(() => {
    if (items && hasNext && onItemChange) {
      onItemChange(items[currentIndex + 1]);
    }
  }, [items, hasNext, onItemChange, currentIndex]);

  useEffect(() => {
    if (!item || !items || !onItemChange) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl && 
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'TEXTAREA' || 
         activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (hasPrevious) {
          e.preventDefault();
          handlePrevious();
        }
      } else if (e.key === 'ArrowRight') {
        if (hasNext) {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, items, onItemChange, hasPrevious, hasNext, handlePrevious, handleNext]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  }, [isFullscreen]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isFullscreen, resetControlsTimeout]);

  // Sync native fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reset zoom whenever item changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [propItem?.id]);

  const toggleFullscreen = async () => {
    if (isVideo && videoPlayerRef.current) {
      await videoPlayerRef.current.requestFullscreen();
      return;
    }

    if (!previewRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await previewRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('.slider') || 
      target.closest('[role="slider"]') ||
      target.closest('[data-slot="slider"]')
    ) {
      return;
    }

    const zoomFactor = 0.1;
    let newScale = scale + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
    newScale = Math.max(1, Math.min(newScale, 4));
    
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
    setScale(newScale);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('video') || 
      target.closest('.slider') || 
      target.closest('[role="slider"]') ||
      target.closest('[data-slot="slider"]')
    ) {
      return;
    }

    if (scale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    setPosition({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  if (!item) return null;

  const isVideo = item.mediaType === 'video';
  const hasQuality = item.quality !== undefined;
  
  // Format dates
  const exifDate = item.dateOriginal ? formatDate(item.dateOriginal) : 'None';
  const inferredDate = item.dateInferred ? formatDate(item.dateInferred) : 'None';
  const fsDate = formatDate(item.dateFileSystem);

  const safeSrc = `media:///${item.path.replace(/\\/g, '/')}`;

  const handleOpenFolder = async () => {
    await window.api.showFile(item.path);
  };

  return (
    <Dialog open={propItem !== null} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent
        width="5xl"
        height="2xl"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="border-border bg-card/95 backdrop-blur-md text-foreground flex flex-col p-0 overflow-hidden font-sans gap-0"
      >
        <div className="w-full h-full flex flex-col bg-card text-foreground overflow-hidden relative">
          {/* Modal Header */}
          <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between shrink-0">
            <div className="min-w-0 pr-4">
              <DialogTitle className="text-sm font-semibold truncate leading-none">{item.name}</DialogTitle>
              <DialogDescription className="text-2xs text-muted-foreground truncate mt-1">
                {item.path}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`w-8 h-8 rounded-lg border-border hover:bg-accent shrink-0 ${isFullscreen ? 'bg-accent text-primary border-primary/45' : ''}`}
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`w-8 h-8 rounded-lg border-border hover:bg-accent shrink-0 ${showMetaPanel ? 'bg-accent text-primary border-primary/45' : ''}`}
                    onClick={() => setShowMetaPanel(!showMetaPanel)}
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Toggle Properties Info
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent shrink-0"
                    onClick={onClose}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Close Preview
                </TooltipContent>
              </Tooltip>
            </div>
          </DialogHeader>

          {/* Modal Main Content Workspace */}
          <div className="flex-1 min-h-0 flex relative">
            {/* Main Media Preview Area */}
            <div 
              ref={previewRef}
              className="flex-1 flex items-center justify-center p-6 bg-black relative overflow-hidden h-full select-none"
              onWheel={(e) => {
                handleWheel(e);
                resetControlsTimeout();
              }}
              onPointerDown={(e) => {
                handlePointerDown(e);
                resetControlsTimeout();
              }}
              onPointerMove={(e) => {
                handlePointerMove(e);
                resetControlsTimeout();
              }}
              onPointerUp={() => {
                handlePointerUp();
                resetControlsTimeout();
              }}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onMouseMove={resetControlsTimeout}
              style={{
                cursor: isFullscreen && !showControls ? 'none' : (scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'),
              }}
            >
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                  cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                }}
                className="w-full h-full flex items-center justify-center pointer-events-none"
              >
                <div className="pointer-events-auto max-w-full max-h-full">
                  {isVideo ? (
                    <VideoPlayer ref={videoPlayerRef} src={safeSrc} poster={item.thumbnailPath ? `media:///${item.thumbnailPath.replace(/\\/g, '/')}` : undefined} className="w-full max-w-3xl" hideFullscreen={false} />
                  ) : (
                    <img
                      src={safeSrc}
                      alt={item.name}
                      className="max-w-full max-h-[60vh] object-contain shadow-lg select-none pointer-events-none"
                    />
                  )}
                </div>
              </div>

              {/* Zoom Controls */}
              <div 
                className={`absolute top-4 right-4 flex gap-1 bg-black/60 backdrop-blur-xs p-1 rounded-lg border border-white/10 z-30 transition-opacity duration-300 ${(!isFullscreen || showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                {isFullscreen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 rounded-md text-white hover:bg-white/10 cursor-pointer"
                    onClick={toggleFullscreen}
                    title="Exit Fullscreen"
                  >
                    <Minimize className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-md text-white hover:bg-white/10 cursor-pointer"
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-2xs text-white font-mono px-2 flex items-center justify-center min-w-[44px]">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-md text-white hover:bg-white/10 cursor-pointer"
                  onClick={handleZoomIn}
                  disabled={scale >= 4}
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-md text-white hover:bg-white/10 cursor-pointer text-2xs font-semibold"
                  onClick={handleZoomReset}
                  disabled={scale === 1}
                  title="Reset Zoom"
                >
                  1:1
                </Button>
              </div>

              {/* Previous Button */}
              {items && hasPrevious && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute left-4 top-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 z-30 ${(!isFullscreen || showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  title="Previous File (Left Arrow)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              )}

              {/* Next Button */}
              {items && hasNext && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute right-4 top-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 z-30 ${(!isFullscreen || showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  title="Next File (Right Arrow)"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              )}

            </div>

            {/* Properties Details Side Panel */}
            {showMetaPanel && (
              <div className="w-80 shrink-0 border-l border-border bg-muted/10 flex flex-col overflow-y-auto scrollbar-thin p-5 select-none text-xs gap-4 font-sans border-r-0">
                <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-primary" />
                  Properties Info
                </h4>

                {/* Basic file attributes */}
                <div className="space-y-2 border-b border-border pb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Size</span>
                    <span className="font-medium text-foreground">{formatBytes(item.size)}</span>
                  </div>
                  {item.width && item.height && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions</span>
                      <span className="font-medium text-foreground">{item.width} x {item.height}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extension</span>
                    <span className="font-medium text-foreground uppercase">{item.extension}</span>
                  </div>
                </div>

                {/* Quality details */}
                {hasQuality && (
                  <div className="space-y-3 border-b border-border pb-4">
                    <h5 className="font-semibold text-[0.6875rem] uppercase tracking-wider text-muted-foreground">Quality Score Indicators</h5>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Composite Score</span>
                      <Badge variant={item.quality!.compositeScore < 50 ? 'destructive' : 'secondary'} className="text-2xs font-bold">
                        {item.quality!.compositeScore} / 100
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blur Check</span>
                      <span className={`font-semibold ${item.quality!.isBlurry ? 'text-destructive' : 'text-green-500'}`}>
                        {item.quality!.isBlurry ? 'Blurry' : 'Sharp'} ({item.quality!.blurScore})
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exposure Check</span>
                      <span className={`font-semibold ${item.quality!.isDark ? 'text-destructive' : 'text-green-500'}`}>
                        {item.quality!.isDark ? 'Dark / Underexposed' : 'Normal Exposure'} ({item.quality!.brightness})
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Screenshot Flag</span>
                      <span className="font-semibold text-foreground">
                        {item.quality!.isScreenshot ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Date resolutions info */}
                <div className="space-y-3">
                  <h5 className="font-semibold text-[0.6875rem] uppercase tracking-wider text-muted-foreground">Target Date Fallback Chain</h5>
                  
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> EXIF Original</span>
                    <span className="font-medium text-foreground truncate max-w-44">{exifDate}</span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Filename Inferred</span>
                    <span className="font-medium text-foreground truncate max-w-44">{inferredDate}</span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Filesystem Creation</span>
                    <span className="font-medium text-foreground truncate max-w-44">{fsDate}</span>
                  </div>
                </div>

                {/* Action utilities */}
                <div className="mt-auto pt-4 border-t border-border">
                  <Button variant="outline" className="w-full gap-2 border-border text-xs rounded-xl" onClick={handleOpenFolder}>
                    <FolderOpen className="w-4 h-4" />
                    Show in Explorer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

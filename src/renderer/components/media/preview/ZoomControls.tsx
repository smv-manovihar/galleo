import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ZoomIn,
  ZoomOut,
  Minimize,
  RotateCcwSquare,
  RotateCwSquare,
  RotateCcw,
} from "lucide-react"

export interface ZoomControlsProps {
  isFullscreen: boolean
  showControls: boolean
  toggleFullscreen: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  onRotateLeft: () => void
  onRotateRight: () => void
  rotation: number
  onRotateReset: () => void
  registerScaleListener?: (listener: (scale: number) => void) => () => void
}

export const ZoomControls: React.FC<ZoomControlsProps> = React.memo(
  ({
    isFullscreen,
    showControls,
    toggleFullscreen,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onRotateLeft,
    onRotateRight,
    rotation,
    onRotateReset,
    registerScaleListener,
  }) => {
    const [scale, setScale] = useState(1)

    useEffect(() => {
      if (!registerScaleListener) return
      return registerScaleListener(setScale)
    }, [registerScaleListener])

    return (
      <div
        className={`absolute top-4 right-4 z-30 flex items-center gap-1 rounded-lg border border-white/10 bg-black/60 p-1 backdrop-blur-xs transition-opacity duration-300 ${!isFullscreen || showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {isFullscreen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
                onClick={toggleFullscreen}
              >
                <Minimize className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Exit Fullscreen</TooltipContent>
          </Tooltip>
        )}

        {onZoomOut && onZoomIn && onZoomReset && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
                  onClick={onZoomOut}
                  disabled={scale <= 1}
                >
                  <ZoomOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom Out</TooltipContent>
            </Tooltip>
            <span className="flex min-w-11 items-center justify-center px-2 font-mono text-xs text-white">
              {Math.round(scale * 100)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
                  onClick={onZoomIn}
                  disabled={scale >= 4}
                >
                  <ZoomIn className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom In</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer rounded-md text-xs font-semibold text-white hover:bg-white/10"
                  onClick={onZoomReset}
                  disabled={scale === 1}
                >
                  1:1
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset Zoom</TooltipContent>
            </Tooltip>
            <div className="mx-0.5 h-4 w-px bg-white/20" />
          </>
        )}

        {/* Rotation Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
              onClick={onRotateLeft}
            >
              <RotateCcwSquare className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Rotate Left 90° (Ctrl + ←)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
              onClick={onRotateRight}
            >
              <RotateCwSquare className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Rotate Right 90° (Ctrl + →)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer rounded-md text-xs font-semibold text-white hover:bg-white/10"
              onClick={onRotateReset}
              disabled={rotation % 360 === 0}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Reset Rotation (0°)</TooltipContent>
        </Tooltip>
      </div>
    )
  }
)

ZoomControls.displayName = "ZoomControls"

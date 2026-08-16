import React, { useState, useEffect, useCallback, useRef } from "react"
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
  onSetScale?: (scale: number) => void
  onRotateLeft: () => void
  onRotateRight: () => void
  rotation: number
  onRotateReset: () => void
  registerScaleListener?: (listener: (scale: number) => void) => () => void
}

const MAX_SCALE = 6

export const ZoomControls: React.FC<ZoomControlsProps> = React.memo(
  ({
    isFullscreen,
    showControls,
    toggleFullscreen,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onSetScale,
    onRotateLeft,
    onRotateRight,
    rotation,
    onRotateReset,
    registerScaleListener,
  }) => {
    const [scale, setScale] = useState(1)
    const [isEditing, setIsEditing] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      if (!registerScaleListener) return
      return registerScaleListener(setScale)
    }, [registerScaleListener])

    const handleStartEditing = () => {
      setInputValue(String(Math.round(scale * 100)))
      setIsEditing(true)
    }

    useEffect(() => {
      if (isEditing) {
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        })
      }
    }, [isEditing])

    const commitValue = useCallback(
      (raw: string) => {
        setIsEditing(false)
        const clean = raw.replace(/[^\d.]/g, "")
        const num = parseFloat(clean)
        if (!isNaN(num) && num > 0) {
          const clampedPercent = Math.max(100, Math.min(num, 600))
          onSetScale?.(clampedPercent / 100)
        }
      },
      [onSetScale]
    )

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

                {isEditing ? (
                  <div className="flex h-7 items-center rounded border border-primary/50 bg-black/90 px-1.5 ring-1 ring-primary">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={inputValue}
                      onChange={(e) => {
                        let val = e.target.value
                        if (/^0+[1-9]/.test(val)) {
                          val = val.replace(/^0+/, "")
                        } else if (/^0+$/.test(val)) {
                          val = "0"
                        }
                        setInputValue(val)
                      }}
                      onBlur={() => commitValue(inputValue)}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === "Enter") {
                          e.preventDefault()
                          commitValue(inputValue)
                        } else if (e.key === "Escape") {
                          e.preventDefault()
                          setIsEditing(false)
                        }
                      }}
                      className="w-9 bg-transparent text-right font-mono text-xs text-white outline-hidden"
                      placeholder="100"
                    />
                    <span className="ml-0.5 font-mono text-xs text-muted-foreground select-none">%</span>
                  </div>
                ) : (
                  <Tooltip open={isEditing ? false : undefined}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleStartEditing}
                        className="flex h-7 min-w-12 cursor-pointer items-center justify-center rounded px-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-white/15"
                      >
                        {Math.round(scale * 100)}%
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Click to set custom zoom (100% - 600%)
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer rounded-md text-white hover:bg-white/10"
                      onClick={onZoomIn}
                      disabled={scale >= MAX_SCALE}
                    >
                      <ZoomIn className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom In (Up to 600%)</TooltipContent>
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

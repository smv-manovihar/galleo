import React from "react"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

export interface VideoZoomRotateMenuProps {
  containerElement?: HTMLElement | null
  btnClass?: string
  iconClass?: string
  scale: number
  rotation: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  onSetScale?: (scale: number) => void
  onRotateLeft?: (e?: React.MouseEvent) => void
  onRotateRight?: (e?: React.MouseEvent) => void
  onRotateReset?: (e?: React.MouseEvent) => void
}

export const VideoZoomRotateMenu: React.FC<VideoZoomRotateMenuProps> = React.memo(
  ({
    containerElement,
    btnClass = "w-8 h-8 rounded-full text-white hover:bg-white/20 cursor-pointer shrink-0",
    iconClass = "w-4 h-4",
    scale,
    rotation,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onSetScale,
    onRotateLeft,
    onRotateRight,
    onRotateReset,
  }) => {
    const [popoverOpen, setPopoverOpen] = React.useState(false)
    const [isEditing, setIsEditing] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    const normalizedRotation = ((rotation % 360) + 360) % 360
    const zoomPercent = Math.round(scale * 100)

    const handleStartEditing = () => {
      setInputValue(String(zoomPercent))
      setIsEditing(true)
    }

    React.useEffect(() => {
      if (isEditing) {
        // Use requestAnimationFrame to focus and select cleanly without triggering Radix focus tooltips
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        })
      }
    }, [isEditing])

    const commitValue = React.useCallback(
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
      <Popover
        open={popoverOpen}
        onOpenChange={(next) => {
          setPopoverOpen(next)
          if (!next) setIsEditing(false)
        }}
      >
        <Tooltip open={popoverOpen ? false : undefined}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={btnClass}
              >
                <SlidersHorizontal className={iconClass} />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" container={containerElement ?? undefined}>
            Zoom & Orientation
          </TooltipContent>
        </Tooltip>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          container={containerElement}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-60 space-y-3 rounded-xl border border-white/15 bg-black/95 p-3 text-white shadow-2xl backdrop-blur-md"
        >
          {/* Zoom Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-xs font-semibold text-white/90">Zoom</span>
              <span className="text-2xs text-white/50">100% - 600%</span>
            </div>

            <div className="flex items-center justify-between gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-white hover:bg-white/15 cursor-pointer shrink-0 disabled:opacity-40"
                    onClick={onZoomOut}
                    disabled={scale <= 1}
                  >
                    <ZoomOut className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  Zoom Out
                </TooltipContent>
              </Tooltip>

              <div className="flex flex-1 items-center justify-center">
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
                      className="w-12 bg-transparent text-right font-mono text-xs text-white outline-hidden"
                      placeholder="100"
                    />
                    <span className="ml-0.5 font-mono text-xs text-muted-foreground select-none">%</span>
                  </div>
                ) : (
                  <Tooltip open={isEditing ? false : undefined}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEditing}
                        className="h-7 min-w-16 cursor-pointer rounded px-2 font-mono text-xs font-semibold text-white hover:bg-white/15"
                      >
                        {zoomPercent}%
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" container={containerElement ?? undefined}>
                      Click to set custom zoom (100% - 600%)
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-white hover:bg-white/15 cursor-pointer shrink-0 disabled:opacity-40"
                    onClick={onZoomIn}
                    disabled={scale >= 6}
                  >
                    <ZoomIn className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  Zoom In (Up to 600%)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-mono text-2xs font-semibold text-white hover:bg-white/15 cursor-pointer shrink-0 disabled:opacity-40"
                    onClick={onZoomReset}
                    disabled={scale === 1}
                  >
                    1:1
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  Reset Zoom
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Orientation Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-xs font-semibold text-white/90">Orientation</span>
              <span className="font-mono text-xs text-white/70">
                {normalizedRotation}°
              </span>
            </div>

            <div className="flex items-center justify-between gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 flex-1 rounded-md bg-white/10 text-2xs font-semibold text-white hover:bg-white/20 cursor-pointer"
                    onClick={onRotateLeft}
                  >
                    <RotateCcw className="mr-1 size-3" />
                    -90°
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  Rotate Left 90° (Ctrl + ←)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 flex-1 rounded-md bg-white/10 text-2xs font-semibold text-white hover:bg-white/20 cursor-pointer"
                    onClick={onRotateRight}
                  >
                    <RotateCw className="mr-1 size-3" />
                    +90°
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  Rotate Right 90° (Ctrl + →)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-2xs font-semibold text-white/80 hover:bg-white/15 hover:text-white cursor-pointer disabled:opacity-40"
                    onClick={onRotateReset}
                    disabled={normalizedRotation === 0}
                  >
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" container={containerElement ?? undefined}>
                  Reset Orientation (0°)
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

VideoZoomRotateMenu.displayName = "VideoZoomRotateMenu"

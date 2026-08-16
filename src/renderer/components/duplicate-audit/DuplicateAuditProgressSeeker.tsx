import React, { useState, useRef, useCallback, useMemo, useEffect } from "react"
import type { MediaItem } from "../../../shared/types/media"
import { CheckCircle2, Circle, Sparkles, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBytes } from "../../lib/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DuplicateAuditProgressSeekerProps {
  groups: MediaItem[][]
  activeGroupIndex: number
  decisions: Record<string, "keep" | "delete" | "skipped">
  onSeek: (index: number) => void
  onComplete?: () => void
  isAllReviewed?: boolean
  isFilterUnreviewedOnly?: boolean
  onToggleFilterUnreviewedOnly?: (enabled: boolean) => void
  className?: string
}

interface HoverState {
  index: number
  xPos: number
  containerWidth: number
}

// Threshold above which we switch from DOM flex segments to high-performance Canvas
const CANVAS_THRESHOLD = 100

export const DuplicateAuditProgressSeeker: React.FC<
  DuplicateAuditProgressSeekerProps
> = ({
  groups,
  activeGroupIndex,
  decisions,
  onSeek,
  onComplete,
  isAllReviewed = false,
  isFilterUnreviewedOnly = false,
  onToggleFilterUnreviewedOnly,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverState, setHoverState] = useState<HoverState | null>(null)
  const [debouncedHoverIndex, setDebouncedHoverIndex] = useState<number | null>(null)
  const [isEditingGroup, setIsEditingGroup] = useState(false)
  const [editGroupInput, setEditGroupInput] = useState("")
  const groupInputRef = useRef<HTMLInputElement>(null)

  // Lightweight bitset for decision states — O(N) single-pass with zero heavy object allocations
  const { totalDecidedCount, decidedArray } = useMemo(() => {
    let count = 0
    const total = groups.length
    const arr = new Uint8Array(total)

    for (let i = 0; i < total; i++) {
      const g = groups[i]
      let isDecided = g.length > 0
      for (let j = 0; j < g.length; j++) {
        const dec = decisions[g[j].id]
        if (dec !== "keep" && dec !== "delete") {
          isDecided = false
          break
        }
      }
      if (isDecided) {
        arr[i] = 1
        count++
      }
    }

    return { totalDecidedCount: count, decidedArray: arr }
  }, [groups, decisions])

  const totalGroups = groups.length
  const pendingCount = totalGroups - totalDecidedCount

  // Direct group number editing
  const handleStartEditGroup = useCallback(() => {
    setEditGroupInput(String(activeGroupIndex + 1))
    setIsEditingGroup(true)
  }, [activeGroupIndex])

  useEffect(() => {
    if (isEditingGroup) {
      requestAnimationFrame(() => {
        groupInputRef.current?.focus()
        groupInputRef.current?.select()
      })
    }
  }, [isEditingGroup])

  const commitGroupValue = useCallback(
    (raw: string) => {
      setIsEditingGroup(false)
      const clean = raw.replace(/[^\d]/g, "")
      const val = parseInt(clean, 10)
      if (!isNaN(val) && val >= 1 && val <= totalGroups) {
        onSeek(val - 1)
      }
    },
    [totalGroups, onSeek]
  )

  // Debounce thumbnail URL resolving on high-speed scrubbing to prevent flicker
  const hoveredIndex = hoverState?.index ?? null
  useEffect(() => {
    if (hoveredIndex === null) return
    const timer = setTimeout(() => {
      setDebouncedHoverIndex(hoveredIndex)
    }, 50)
    return () => clearTimeout(timer)
  }, [hoveredIndex])

  // Lazy resolution of hovered group details: only computes metadata and thumbnail
  // for the single group under the user's cursor
  const hoveredGroupInfo = useMemo(() => {
    if (!hoverState) return null
    const idx = hoverState.index
    const group = groups[idx]
    if (!group) return null

    let keepCount = 0
    let deleteCount = 0
    let groupPendingCount = 0
    let totalSize = 0

    for (const item of group) {
      totalSize += item.size || 0
      const dec = decisions[item.id]
      if (dec === "keep") keepCount++
      else if (dec === "delete") deleteCount++
      else groupPendingCount++
    }

    const isDecided = groupPendingCount === 0 && (keepCount > 0 || deleteCount > 0)
    const previewItem = group.find((i) => i.isBestInDuplicateGroup) || group[0] || null

    const safeThumb = previewItem
      ? previewItem.thumbnailPath || previewItem.path
        ? `media:///${(previewItem.thumbnailPath || previewItem.path).replace(/\\/g, "/")}`
        : null
      : null

    return {
      index: idx,
      group,
      isDecided,
      keepCount,
      deleteCount,
      itemCount: group.length,
      totalSize,
      previewItem,
      safeThumb,
      xPos: hoverState.xPos,
      containerWidth: hoverState.containerWidth,
    }
  }, [hoverState, groups, decisions])

  const getIndexFromPointer = useCallback(
    (clientX: number): { index: number; xPos: number; containerWidth: number } => {
      if (!containerRef.current || groups.length === 0) {
        return { index: 0, xPos: 0, containerWidth: 600 }
      }
      const rect = containerRef.current.getBoundingClientRect()
      const rawX = clientX - rect.left
      const clampedX = Math.max(0, Math.min(rect.width, rawX))
      const ratio = clampedX / (rect.width || 1)
      const calculatedIndex = Math.min(
        groups.length - 1,
        Math.max(0, Math.floor(ratio * groups.length))
      )
      return { index: calculatedIndex, xPos: clampedX, containerWidth: rect.width }
    },
    [groups.length]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (groups.length === 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setIsDragging(true)
      const { index, xPos, containerWidth } = getIndexFromPointer(e.clientX)
      setHoverState({ index, xPos, containerWidth })
      onSeek(index)
    },
    [groups.length, getIndexFromPointer, onSeek]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (groups.length === 0) return
      const { index, xPos, containerWidth } = getIndexFromPointer(e.clientX)
      setHoverState({ index, xPos, containerWidth })
      if (isDragging) {
        onSeek(index)
      }
    },
    [groups.length, isDragging, getIndexFromPointer, onSeek]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          // Ignore release errors
        }
      }
      setIsDragging(false)
    },
    []
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          // Ignore release errors
        }
      }
      setIsDragging(false)
      setHoverState(null)
      setDebouncedHoverIndex(null)
    },
    []
  )

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) {
      setHoverState(null)
      setDebouncedHoverIndex(null)
    }
  }, [isDragging])

  // Canvas-based rendering for high group counts (e.g. 500 to 50,000 groups)
  useEffect(() => {
    if (groups.length <= CANVAS_THRESHOLD) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)

    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const total = groups.length
    const widthPerGroup = rect.width / total

    // Resolve exact theme colors dynamically from CSS variables
    const computedStyle = getComputedStyle(canvas)
    const primaryColor =
      computedStyle.getPropertyValue("--color-primary").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() ||
      "oklch(0.455 0.188 13.697)"

    // 1. Background unreviewed track
    ctx.fillStyle = "rgba(120, 120, 120, 0.25)"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 2. Decided slices
    ctx.fillStyle = "#10b981" // emerald-500
    let batchStart = -1
    for (let i = 0; i < total; i++) {
      if (decidedArray[i]) {
        if (batchStart === -1) batchStart = i
      } else {
        if (batchStart !== -1) {
          const startX = batchStart * widthPerGroup
          const spanW = (i - batchStart) * widthPerGroup
          ctx.fillRect(startX, 0, Math.max(1, spanW), rect.height)
          batchStart = -1
        }
      }
    }
    if (batchStart !== -1) {
      const startX = batchStart * widthPerGroup
      const spanW = (total - batchStart) * widthPerGroup
      ctx.fillRect(startX, 0, Math.max(1, spanW), rect.height)
    }

    // 3. Hovered slice (Primary brand color)
    if (hoverState && hoverState.index !== activeGroupIndex) {
      ctx.fillStyle = primaryColor
      const hX = hoverState.index * widthPerGroup
      ctx.fillRect(hX, 0, Math.max(3, widthPerGroup), rect.height)
    }

    // 4. Active slice (Primary brand color)
    ctx.fillStyle = primaryColor
    const aX = activeGroupIndex * widthPerGroup
    const aW = Math.max(3, widthPerGroup)
    ctx.fillRect(aX, 0, aW, rect.height)
  }, [groups.length, decidedArray, activeGroupIndex, hoverState])

  if (totalGroups === 0) return null

  const isHighDensity = totalGroups > CANVAS_THRESHOLD

  return (
    <div className={cn("relative flex w-full flex-col gap-1.5 select-none", className)}>
      {/* Top Header Row: Group Counter + Editable Jump + Stats + Summary/Filter Buttons */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Editable Group Number */}
          {isEditingGroup ? (
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground">Group</span>
              <div className="flex h-5 items-center rounded border border-primary/50 bg-background px-1.5 ring-1 ring-primary">
                <input
                  ref={groupInputRef}
                  type="text"
                  inputMode="numeric"
                  value={editGroupInput}
                  onChange={(e) => {
                    let val = e.target.value
                    if (/^0+[1-9]/.test(val)) {
                      val = val.replace(/^0+/, "")
                    } else if (/^0+$/.test(val)) {
                      val = "0"
                    }
                    setEditGroupInput(val)
                  }}
                  onBlur={() => commitGroupValue(editGroupInput)}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commitGroupValue(editGroupInput)
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      setIsEditingGroup(false)
                    }
                  }}
                  className="w-12 bg-transparent text-center font-mono text-xs text-foreground outline-hidden"
                  placeholder={String(activeGroupIndex + 1)}
                />
              </div>
              <span className="font-normal text-muted-foreground">
                of {totalGroups.toLocaleString()}
              </span>
            </div>
          ) : (
            <Tooltip open={isEditingGroup ? false : undefined}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleStartEditGroup}
                  className="flex items-center gap-1 rounded-sm px-1 py-0.5 font-semibold text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  <span>Group</span>
                  <span className="font-bold text-primary underline decoration-primary/40 underline-offset-2">
                    {activeGroupIndex + 1}
                  </span>
                  <span className="font-normal text-muted-foreground">
                    of {totalGroups.toLocaleString()}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Click to jump directly to a group number
              </TooltipContent>
            </Tooltip>
          )}

          <span className="text-muted-foreground/60">•</span>

          <span className="text-xs text-muted-foreground">
            <span
              className={cn(
                "font-medium",
                totalDecidedCount > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
            >
              {totalDecidedCount.toLocaleString()}
            </span>{" "}
            of {totalGroups.toLocaleString()} decided
          </span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {onToggleFilterUnreviewedOnly && (
            <Select
              value={isFilterUnreviewedOnly ? "unreviewed" : "all"}
              onValueChange={(val) => onToggleFilterUnreviewedOnly(val === "unreviewed")}
            >
              <SelectTrigger
                size="sm"
                className="h-6 w-auto min-w-32 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Filter className="size-3 text-muted-foreground" />
                  <SelectValue placeholder="Filter" />
                </div>
              </SelectTrigger>
              <SelectContent align="end" position="popper" className="text-xs">
                <SelectItem value="all" className="cursor-pointer">
                  <span>All Groups</span>
                  <span className="ml-1 text-2xs text-muted-foreground">({totalGroups.toLocaleString()})</span>
                </SelectItem>
                <SelectItem value="unreviewed" className="cursor-pointer">
                  <span>Unreviewed Only</span>
                  <span className="ml-1 text-2xs text-muted-foreground">({pendingCount.toLocaleString()})</span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {onComplete && isAllReviewed && (
            <Button
              variant="outline"
              size="sm"
              onClick={onComplete}
              className="h-5 cursor-pointer px-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
            >
              <CheckCircle2 className="mr-1 size-3 text-emerald-500" />
              View Summary
            </Button>
          )}
        </div>
      </div>

      {/* Interactive Track Area */}
      <div className="relative py-1">
        {/* Hover Tooltip Popup (positioned below track with edge clamping to avoid header clipping) */}
        {hoveredGroupInfo && (() => {
          const containerWidth = hoveredGroupInfo.containerWidth || 600
          const tooltipWidth = 256
          const halfWidth = tooltipWidth / 2
          const margin = 8
          const minCenter = halfWidth + margin
          const maxCenter = Math.max(minCenter, containerWidth - halfWidth - margin)
          const segmentCenter =
            totalGroups > 0
              ? ((hoveredGroupInfo.index + 0.5) / totalGroups) * containerWidth
              : hoveredGroupInfo.xPos
          const clampedX = Math.max(
            minCenter,
            Math.min(maxCenter, segmentCenter)
          )
          const arrowOffset = Math.max(
            12,
            Math.min(
              tooltipWidth - 12,
              halfWidth + (segmentCenter - clampedX)
            )
          )

          const isThumbnailReady = debouncedHoverIndex === hoveredGroupInfo.index
          const displayThumb = isThumbnailReady ? hoveredGroupInfo.safeThumb : null

          return (
            <div
              className="pointer-events-none absolute top-full mt-2.5 z-50 transition-transform duration-75 ease-out"
              style={{
                left: `${clampedX}px`,
                transform: "translateX(-50%)",
              }}
            >
              {/* Upward-pointing arrow towards track */}
              <div
                className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-t border-l border-border bg-popover"
                style={{ left: `${arrowOffset}px` }}
              />

              <div className="relative flex w-64 flex-col gap-2 rounded-lg border border-border bg-popover/95 p-2.5 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
                {/* Tooltip Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="text-foreground">
                      Group{" "}
                      <span className="font-bold text-primary">
                        {hoveredGroupInfo.index + 1}
                      </span>
                    </span>
                    {hoveredGroupInfo.index === activeGroupIndex && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-2xs font-medium text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {hoveredGroupInfo.isDecided ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Decided
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Circle className="size-2.5 fill-muted-foreground/30" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Tooltip Content: Thumbnail & Media Details */}
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-neutral-950">
                    {displayThumb ? (
                      <img
                        src={displayThumb}
                        alt={hoveredGroupInfo.previewItem?.name || ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Skeleton className="h-full w-full rounded-none" />
                    )}
                    {hoveredGroupInfo.previewItem?.isBestInDuplicateGroup && displayThumb && (
                      <div className="absolute top-1 left-1 rounded-xs bg-primary p-0.5 text-primary-foreground">
                        <Sparkles className="size-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs">
                    <p className="truncate font-medium text-foreground">
                      {hoveredGroupInfo.previewItem?.name || `Group #${hoveredGroupInfo.index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hoveredGroupInfo.itemCount} items • {formatBytes(hoveredGroupInfo.totalSize)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-2xs">
                      {hoveredGroupInfo.isDecided ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {hoveredGroupInfo.keepCount} Keep, {hoveredGroupInfo.deleteCount} Delete
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Click to jump & review</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* The Seekable Timeline Bar */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
          className="group/seeker relative flex h-4 w-full cursor-pointer items-center touch-none rounded-md bg-muted/40 px-1 py-0.5 transition-colors hover:bg-muted/70"
        >
          {isHighDensity ? (
            /* High-performance Retina Canvas for >100 groups (instant 144 FPS rendering with 1 DOM node) */
            <canvas
              ref={canvasRef}
              className="h-2.5 w-full rounded-xs overflow-hidden pointer-events-none"
            />
          ) : (
            /* Discrete Flex Segments for <=100 groups */
            <div className="flex h-2.5 w-full items-center gap-[1.5px]">
              {groups.map((_, idx) => {
                const isActive = idx === activeGroupIndex
                const isHovered = hoverState?.index === idx
                const isDecided = decidedArray[idx] === 1

                return (
                  <div
                    key={idx}
                    className={cn(
                      "relative h-full flex-1 transition-all duration-150 rounded-[1px]",
                      isActive
                        ? "bg-primary ring-2 ring-primary/40 shadow-sm z-20 scale-y-125"
                        : isHovered
                          ? "bg-primary ring-2 ring-primary shadow-md z-30 brightness-125 scale-y-125"
                          : isDecided
                            ? "bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-500/90 dark:hover:bg-emerald-400"
                            : "bg-muted-foreground/25 hover:bg-muted-foreground/45"
                    )}
                    title={`Group ${idx + 1} (${isActive ? "Current" : isDecided ? "Decided" : "Pending"})`}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useRef, useMemo, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { MediaItem } from "../../../shared/types/media"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { formatBytes, formatShortDate, formatDate } from "../../lib/format"
import { Play, FileImage, Trash2, Check, Eye, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

interface MediaListProps {
  items: MediaItem[]
  selectedIds: Set<string>
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
  isGrouped?: boolean
}

interface MediaListRowProps {
  item: MediaItem
  isSelected: boolean
  gridStyle: React.CSSProperties
  virtualRowStart: number
  virtualRowKey: React.Key
  measureRef: (node: Element | null) => void
  virtualIndex: number
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
}

const MediaListRow = React.memo<MediaListRowProps>(
  ({
    item,
    isSelected,
    gridStyle,
    virtualRowStart,
    virtualRowKey,
    measureRef,
    virtualIndex,
    onSelectToggle,
    onPreviewOpen,
    onReviewAction,
  }) => {
    const isVideo = item.mediaType === "video"
    const score = item.quality?.compositeScore ?? null

    return (
      <div
        key={virtualRowKey}
        ref={measureRef}
        data-index={virtualIndex}
        className={`absolute top-0 left-0 grid h-[38px] w-full cursor-pointer items-center border-b border-border/40 text-xs transition-colors duration-150 will-change-transform hover:bg-accent/40 ${
          isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
        }`}
        style={{
          ...gridStyle,
          height: 38,
          transform: `translateY(${virtualRowStart}px)`,
        }}
        onClick={() => onPreviewOpen(item)}
      >
        {/* Select Checkbox */}
        <div
          className="flex h-full items-center justify-center border-r border-border/30"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={(_checked) => {
              onSelectToggle(item.id, { shiftKey: false } as any)
            }}
            className="h-3.5 w-3.5 cursor-pointer border-border focus-visible:ring-1"
          />
        </div>

        {/* File Icon + Name */}
        <div className="flex h-full items-center truncate border-r border-border/30 pr-4 pl-3 font-medium">
          <div className="flex min-w-0 items-center gap-2.5">
            {isVideo ? (
              <Play className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <FileImage className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate text-foreground" title={item.name}>
              {item.name}
            </span>
          </div>
        </div>

        {/* Type */}
        <div className="flex h-full items-center border-r border-border/30 pl-3 text-2xs text-muted-foreground capitalize">
          {item.mediaType}
        </div>

        {/* Date */}
        <div className="flex h-full items-center border-r border-border/30 pl-3 text-foreground tabular-nums">
          {formatShortDate(item.dateTarget)}
        </div>

        {/* Size */}
        <div className="flex h-full items-center border-r border-border/30 pl-3 text-muted-foreground tabular-nums">
          {formatBytes(item.size)}
        </div>

        {/* Quality Score */}
        <div className="flex h-full items-center justify-center border-r border-border/30 text-center">
          {score !== null ? (
            <Badge
              variant={score < 50 ? "destructive" : "secondary"}
              className="h-4.5 px-1.5 py-0 text-2xs font-bold"
            >
              {score}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>

        {/* Review State */}
        <div className="flex h-full items-center justify-center border-r border-border/30 text-center">
          {item.reviewState === "keep" && (
            <Badge
              variant="outline"
              className="h-4.5 border-green-500/20 bg-green-500/10 px-1.5 py-0 text-2xs text-green-500"
            >
              Keep
            </Badge>
          )}
          {item.reviewState === "delete" && (
            <Badge
              variant="outline"
              className="h-4.5 border-destructive/20 bg-destructive/10 px-1.5 py-0 text-2xs text-destructive"
            >
              Delete
            </Badge>
          )}
          {item.reviewState === "skipped" && (
            <Badge
              variant="outline"
              className="h-4.5 border-border bg-muted px-1.5 py-0 text-2xs text-muted-foreground"
            >
              Skipped
            </Badge>
          )}
          {item.reviewState === "pending" && (
            <span className="text-2xs text-muted-foreground">Pending</span>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className="flex h-full items-center justify-center gap-0.5 px-3"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6.5 w-6.5 cursor-pointer rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => onPreviewOpen(item)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Preview</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6.5 w-6.5 cursor-pointer rounded text-muted-foreground hover:bg-green-500/10 hover:text-green-500"
                onClick={() => onReviewAction(item.id, "keep")}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Keep</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6.5 w-6.5 cursor-pointer rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onReviewAction(item.id, "delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    )
  }
)

export const MediaList: React.FC<MediaListProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onReviewAction,
  isGrouped = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Proportional column widths sharing exactly 100% of the available fractional (fr) units
  const [widths, setWidths] = useState({
    name: 30, // 30%
    type: 10, // 10%
    date: 13, // 13%
    size: 11, // 11%
    score: 11, // 11%
    state: 12, // 12%
    actions: 13, // 13%
  }) // Sum = 100

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Proportional mouse drag handler for column resizing
  const handleMouseDown = (
    columnKey: keyof typeof widths,
    e: React.MouseEvent
  ) => {
    e.preventDefault()
    if (!containerRef.current) return

    const startX = e.clientX
    const startWidths = { ...widths }
    const startWidthFr = startWidths[columnKey]

    // Get the container width excluding checkbox (48px)
    const rect = containerRef.current.getBoundingClientRect()
    const availableWidth = rect.width - 48 - 12

    // Since total fr is 100, 1 fr = availableWidth / 100 pixels
    const pixelsPerFr = availableWidth / 100

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaFr = deltaX / pixelsPerFr

      // Bound the new value of the dragged column (between 5% and 80%)
      const newVal = Math.max(5, Math.min(80, startWidthFr + deltaFr))

      const otherSum = 100 - startWidthFr
      const newOtherSum = 100 - newVal
      const scaleFactor = newOtherSum / otherSum

      setWidths((prev) => {
        const next = { ...prev }
        next[columnKey] = newVal

        const keys = Object.keys(startWidths) as Array<keyof typeof widths>
        let runningSum = newVal

        // Scale other columns proportionally to preserve the exact sum of 100
        const otherKeys = keys.filter((k) => k !== columnKey)
        otherKeys.forEach((key, idx) => {
          if (idx === otherKeys.length - 1) {
            next[key] = 100 - runningSum
          } else {
            const val = startWidths[key] * scaleFactor
            next[key] = val
            runningSum += val
          }
        })

        return next
      })
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  // Group items by target date
  const grouped = useMemo(() => {
    const groups: Record<string, MediaItem[]> = {}
    for (const item of items) {
      if (!item.dateTarget) continue
      const key = item.dateTarget.slice(0, 10)
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
    }

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({
        dateKey: key,
        dateFormatted: formatDate(key),
        items: groups[key],
      }))
  }, [items])

  const toggleGroup = (dateKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(dateKey)) {
        next.delete(dateKey)
      } else {
        next.add(dateKey)
      }
      return next
    })
  }

  // Flatten grouped structures into a single flat list of rows for virtualization
  const flatRows = useMemo(() => {
    if (!isGrouped) {
      return items.map((item) => ({
        type: "item" as const,
        item,
        key: item.id,
      }))
    }

    const rows: Array<
      | {
          type: "header"
          dateFormatted: string
          count: number
          dateKey: string
          key: string
        }
      | { type: "item"; item: MediaItem; key: string }
    > = []

    for (const group of grouped) {
      const isCollapsed = collapsedGroups.has(group.dateKey)

      rows.push({
        type: "header",
        key: `header-${group.dateKey}`,
        dateKey: group.dateKey,
        dateFormatted: group.dateFormatted,
        count: group.items.length,
      })

      if (!isCollapsed) {
        for (const item of group.items) {
          rows.push({
            type: "item",
            item,
            key: item.id,
          })
        }
      }
    }

    return rows
  }, [items, grouped, collapsedGroups, isGrouped])

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const row = flatRows[index]
      return row?.type === "header" ? 36 : 38
    },
    getItemKey: (index) => flatRows[index]?.key || index,
    overscan: 6,
  })

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `48px ${widths.name}fr ${widths.type}fr ${widths.date}fr ${widths.size}fr ${widths.score}fr ${widths.state}fr ${widths.actions}fr`,
    }),
    [widths]
  )

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-border bg-card/40 select-none">
      <div
        ref={containerRef}
        className="relative h-full w-full scrollbar-thin overflow-y-auto"
      >
        {/* Table Header Row (sticky top to remain visible on scroll) */}
        <div
          className="sticky top-0 z-20 grid h-[36px] w-full shrink-0 items-center border-b border-border bg-muted/90 py-2.5 font-sans text-[0.6875rem] font-medium text-muted-foreground backdrop-blur-xs select-none"
          style={gridStyle}
        >
          <div className="flex h-full items-center justify-center border-r border-border/40 text-center"></div>

          {/* Filename Column */}
          <div className="relative flex h-full items-center border-r border-border/40 px-3">
            <span>Filename</span>
            <div
              onMouseDown={(e) => handleMouseDown("name", e)}
              className="absolute top-0 right-0 bottom-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
            />
          </div>

          {/* Type Column */}
          <div className="relative flex h-full items-center border-r border-border/40 px-3">
            <span>Type</span>
            <div
              onMouseDown={(e) => handleMouseDown("type", e)}
              className="absolute top-0 right-0 bottom-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
            />
          </div>

          {/* Date Column */}
          <div className="relative flex h-full items-center border-r border-border/40 px-3">
            <span>Target Date</span>
            <div
              onMouseDown={(e) => handleMouseDown("date", e)}
              className="absolute top-0 right-0 bottom-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
            />
          </div>

          {/* Size Column */}
          <div className="relative flex h-full items-center border-r border-border/40 px-3">
            <span>File Size</span>
            <div
              onMouseDown={(e) => handleMouseDown("size", e)}
              className="absolute top-0 right-0 bottom-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
            />
          </div>

          {/* Score Column */}
          <div className="relative flex h-full items-center justify-center border-r border-border/40 px-3">
            <span>Quality Score</span>
            <div
              onMouseDown={(e) => handleMouseDown("score", e)}
              className="absolute top-0 right-0 bottom-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
            />
          </div>

          {/* Review State Column */}
          <div className="relative flex h-full items-center justify-center border-r border-border/40 px-3">
            <span>Review State</span>
            <div
              onMouseDown={(e) => handleMouseDown("state", e)}
              className="absolute top-0 right-0 bottom-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
            />
          </div>

          {/* Actions Column */}
          <div className="relative flex h-full items-center justify-center px-3">
            <span>Actions</span>
            <div
              onMouseDown={(e) => handleMouseDown("actions", e)}
              className="absolute top-0 right-0 bottom-0 z-30 w-1.5 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
            />
          </div>
        </div>

        {/* Table Body Container */}
        <div
          className="animate-fade-in relative w-full"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = flatRows[virtualRow.index]
            if (!row) return null

            if (row.type === "header") {
              const isCollapsed = collapsedGroups.has(row.dateKey)
              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute top-0 left-0 z-10 flex w-full cursor-pointer items-center gap-4 border-b border-border/50 bg-muted/65 px-4 py-2 backdrop-blur-xs select-none hover:bg-muted/80"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: 36,
                  }}
                  onClick={() => toggleGroup(row.dateKey)}
                >
                  <span className="flex items-center gap-1.5 font-sans text-xs font-bold tracking-wide text-foreground">
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground/80 ${
                        !isCollapsed ? "rotate-90" : ""
                      }`}
                    />
                    {row.dateFormatted}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-sans text-2xs font-semibold text-muted-foreground uppercase">
                    {row.count} items
                  </span>
                </div>
              )
            } else {
              return (
                <MediaListRow
                  key={virtualRow.key}
                  item={row.item}
                  isSelected={selectedIds.has(row.item.id)}
                  gridStyle={gridStyle}
                  virtualRowStart={virtualRow.start}
                  virtualRowKey={virtualRow.key}
                  measureRef={rowVirtualizer.measureElement}
                  virtualIndex={virtualRow.index}
                  onSelectToggle={onSelectToggle}
                  onPreviewOpen={onPreviewOpen}
                  onReviewAction={onReviewAction}
                />
              )
            }
          })}

          {items.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No items match current filters
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

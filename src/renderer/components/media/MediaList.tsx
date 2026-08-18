import React, { useRef, useMemo, useState, useEffect, memo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { MediaItem } from "../../../shared/types/media"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { formatBytes, formatShortDate, formatDate } from "../../lib/format"
import {
  Play,
  FileImage,
  Trash2,
  Eye,
  ChevronRight,
  FolderSearch,
  Bookmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMediaStore } from "../../stores/media-store"
import { useSettingsStore, selectIsScanned } from "../../stores/settings-store"
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
  onPlayOpen?: (item: MediaItem) => void
  onContextMenu?: (item: MediaItem, e: React.MouseEvent) => void
  isGrouped?: boolean
  footer?: React.ReactNode
}

interface MediaListRowProps {
  item: MediaItem
  isSelected: boolean
  gridStyle: React.CSSProperties
  virtualRowStart: number
  virtualRowKey: React.Key
  virtualIndex: number
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
  onPlayOpen?: (item: MediaItem) => void
  onContextMenu?: (item: MediaItem, e: React.MouseEvent) => void
}

const MediaListRow = memo<MediaListRowProps>(
  ({
    item,
    isSelected,
    gridStyle,
    virtualRowStart,
    virtualRowKey,
    onSelectToggle,
    onPreviewOpen,
    onReviewAction,
    onPlayOpen,
    onContextMenu,
  }) => {
    const isVideo = item.mediaType === "video"
    const score = item.quality?.compositeScore ?? null

    return (
      <div
        key={virtualRowKey}
        style={{
          ...gridStyle,
          height: 38,
          transform: `translateY(${virtualRowStart}px)`,
          contain: "layout paint",
        }}
        className={`group absolute top-0 left-0 grid w-full cursor-pointer items-center border-b border-border/40 text-xs transition-colors duration-100 will-change-transform hover:bg-accent/40 select-none ${
          isSelected
            ? "bg-primary/10 hover:bg-primary/15 border-l-2 border-l-primary"
            : ""
        }`}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault()
            onContextMenu(item, e)
          }
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
            onCheckedChange={() => {
              onSelectToggle(item.id, {
                shiftKey: false,
              } as unknown as React.MouseEvent)
            }}
            className="size-4 cursor-pointer border-border focus-visible:ring-1"
          />
        </div>

        {/* File Icon + Name */}
        <div className="flex h-full items-center truncate border-r border-border/30 pr-3 pl-3 font-medium">
          <div className="flex min-w-0 items-center gap-2.5">
            {isVideo ? (
              <button
                type="button"
                className="group/play flex items-center justify-center cursor-pointer rounded p-1 hover:bg-primary/20 transition-colors shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onPlayOpen) {
                    onPlayOpen(item)
                  } else {
                    onPreviewOpen(item)
                  }
                }}
                title="Play Video"
              >
                <Play className="size-3.5 shrink-0 text-primary transition-transform group-hover/play:scale-110" />
              </button>
            ) : (
              <FileImage className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate text-xs font-medium text-foreground" title={item.name}>
              {item.name}
            </span>
          </div>
        </div>

        {/* Type */}
        <div className="flex h-full items-center border-r border-border/30 pl-3 text-xs text-muted-foreground capitalize">
          {item.mediaType}
        </div>

        {/* Date */}
        <div className="flex h-full items-center border-r border-border/30 pl-3 text-xs text-foreground/80 tabular-nums">
          {item.dateTarget ? formatShortDate(item.dateTarget) : "--"}
        </div>

        {/* Size */}
        <div className="flex h-full items-center border-r border-border/30 pl-3 font-mono text-xs text-muted-foreground tabular-nums">
          {formatBytes(item.size)}
        </div>

        {/* Quality Score */}
        <div className="flex h-full items-center justify-center border-r border-border/30 px-2">
          {score !== null ? (
            <Badge
              variant="outline"
              className={`px-1.5 py-0 text-xs font-medium ${
                score >= 80
                  ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
                  : score >= 50
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-destructive/20 bg-destructive/10 text-destructive"
              }`}
            >
              {Math.round(score)}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">--</span>
          )}
        </div>

        {/* Review State */}
        <div className="flex h-full items-center justify-center border-r border-border/30 px-2">
          {item.reviewState === "keep" ? (
            <Badge
              variant="outline"
              className="border-green-500/20 bg-green-500/10 px-2 py-0 text-xs font-medium text-green-600 dark:text-green-400"
            >
              Kept
            </Badge>
          ) : item.reviewState === "delete" ? (
            <Badge
              variant="outline"
              className="border-destructive/20 bg-destructive/10 px-2 py-0 text-xs font-medium text-destructive"
            >
              Delete
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground/60">Pending</span>
          )}
        </div>

        {/* Quick Actions */}
        <div
          className="flex h-full items-center justify-center gap-1 px-2"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6.5 cursor-pointer rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => onPreviewOpen(item)}
              >
                <Eye className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Preview</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`size-6.5 rounded transition-colors ${
                  item.reviewState === "keep"
                    ? "cursor-default border border-green-500/35 bg-green-500/20 text-green-600 dark:text-green-400 hover:border-green-500/55! hover:bg-green-500/35! hover:text-green-300!"
                    : item.reviewState === "delete"
                      ? "cursor-pointer text-muted-foreground/50 hover:bg-green-500/15! hover:text-green-500!"
                      : "cursor-pointer text-muted-foreground hover:bg-green-500/15! hover:text-green-500!"
                }`}
                onClick={
                  item.reviewState === "keep"
                    ? undefined
                    : () => onReviewAction(item.id, "keep")
                }
              >
                <Bookmark
                  className={`size-3.5 ${
                    item.reviewState === "keep" ? "fill-current" : ""
                  }`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {item.reviewState === "keep" ? "Kept" : "Keep"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`size-6.5 rounded transition-colors ${
                  item.reviewState === "delete"
                    ? "cursor-default border border-destructive/35 bg-destructive/20 text-destructive hover:border-destructive/55! hover:bg-destructive/35! hover:text-destructive!"
                    : item.reviewState === "keep"
                      ? "cursor-pointer text-muted-foreground/50 hover:bg-destructive/15! hover:text-destructive!"
                      : "cursor-pointer text-muted-foreground hover:bg-destructive/15! hover:text-destructive!"
                }`}
                onClick={
                  item.reviewState === "delete"
                    ? undefined
                    : () => onReviewAction(item.id, "delete")
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {item.reviewState === "delete" ? "Marked Delete" : "Delete"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    )
  }
)

const MediaListComponent: React.FC<MediaListProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onReviewAction,
  onPlayOpen,
  onContextMenu,
  isGrouped = false,
  footer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Proportional column widths sharing exactly 100% of the available fractional (fr) units
  const [widths, setWidths] = useState({
    name: 32, // 32%
    type: 10, // 10%
    date: 13, // 13%
    size: 11, // 11%
    score: 11, // 11%
    state: 11, // 11%
    actions: 12, // 12%
  }) // Sum = 100

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const dragCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current()
      }
    }
  }, [])

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

    const rect = containerRef.current.getBoundingClientRect()
    const availableWidth = rect.width - 44 - 12
    const pixelsPerFr = availableWidth / 100

    let rafId: number | null = null

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaFr = deltaX / pixelsPerFr

      const newVal = Math.max(5, Math.min(80, startWidthFr + deltaFr))
      const otherSum = 100 - startWidthFr
      const newOtherSum = 100 - newVal
      const scaleFactor = newOtherSum / otherSum

      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        setWidths((prev) => {
          const next = { ...prev }
          next[columnKey] = newVal

          const keys = Object.keys(startWidths) as Array<keyof typeof widths>
          let runningSum = newVal

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
      })
    }

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      dragCleanupRef.current = null
    }

    dragCleanupRef.current = handleMouseUp
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
      .sort((a, b) => (b < a ? -1 : b > a ? 1 : 0))
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const row = flatRows[index]
      return row?.type === "header" ? 34 : 38
    },
    getItemKey: (index) => flatRows[index]?.key || index,
    overscan: 4,
  })

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `44px ${widths.name}fr ${widths.type}fr ${widths.date}fr ${widths.size}fr ${widths.score}fr ${widths.state}fr ${widths.actions}fr`,
    }),
    [widths]
  )

  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const settings = useSettingsStore((s) => s.settings)

  const isScanned = useMemo(() => {
    return selectIsScanned(settings, activeRootPath)
  }, [settings, activeRootPath])

  if (items.length === 0) {
    if (footer) {
      return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center p-4 font-sans text-xs text-muted-foreground select-none">
          {footer}
        </div>
      )
    }
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center py-16 font-sans text-xs text-muted-foreground select-none">
        {!isScanned ? (
          <>
            <FolderSearch className="h-8 w-8 text-amber-500/80 mb-1" />
            <span className="text-sm font-medium text-foreground">Folder not scanned</span>
            <span className="mt-1 text-xs text-muted-foreground">Use the Scan Folders button above to index media files.</span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground">No items match current filters</span>
            <span className="mt-1 text-xs text-muted-foreground">Try clearing filters or search terms.</span>
          </>
        )}
      </div>
    )
  }

  const footerExtraHeight = footer ? 220 : 0

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card/60 shadow-xs select-none">
      {/* Docked Table Header Row */}
      <div
        className="grid h-9 w-full shrink-0 items-center border-b border-border/80 bg-muted/90 py-1 font-sans text-xs font-semibold text-muted-foreground select-none"
        style={gridStyle}
      >
        <div className="flex h-full items-center justify-center border-r border-border/40 text-center" />

        {/* Filename Column */}
        <div className="relative flex h-full items-center border-r border-border/40 px-3">
          <span>Filename</span>
          <div
            onMouseDown={(e) => handleMouseDown("name", e)}
            className="absolute top-0 right-0 bottom-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
          />
        </div>

        {/* Type Column */}
        <div className="relative flex h-full items-center border-r border-border/40 px-3">
          <span>Type</span>
          <div
            onMouseDown={(e) => handleMouseDown("type", e)}
            className="absolute top-0 right-0 bottom-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
          />
        </div>

        {/* Date Column */}
        <div className="relative flex h-full items-center border-r border-border/40 px-3">
          <span>Date</span>
          <div
            onMouseDown={(e) => handleMouseDown("date", e)}
            className="absolute top-0 right-0 bottom-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
          />
        </div>

        {/* Size Column */}
        <div className="relative flex h-full items-center border-r border-border/40 px-3">
          <span>File Size</span>
          <div
            onMouseDown={(e) => handleMouseDown("size", e)}
            className="absolute top-0 right-0 bottom-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
          />
        </div>

        {/* Score Column */}
        <div className="relative flex h-full items-center justify-center border-r border-border/40 px-3">
          <span>Quality</span>
          <div
            onMouseDown={(e) => handleMouseDown("score", e)}
            className="absolute top-0 right-0 bottom-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
          />
        </div>

        {/* Review State Column */}
        <div className="relative flex h-full items-center justify-center border-r border-border/40 px-3">
          <span>Status</span>
          <div
            onMouseDown={(e) => handleMouseDown("state", e)}
            className="absolute top-0 right-0 bottom-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
          />
        </div>

        {/* Actions Column */}
        <div className="relative flex h-full items-center justify-center px-3">
          <span>Actions</span>
          <div
            onMouseDown={(e) => handleMouseDown("actions", e)}
            className="absolute top-0 right-0 bottom-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-primary/45 active:bg-primary"
          />
        </div>
      </div>

      {/* Scrollable Table Body */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full overflow-y-auto scrollbar-thin"
      >
        <div
          className="relative w-full"
          style={{
            height: `${rowVirtualizer.getTotalSize() + footerExtraHeight}px`,
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
                  className="absolute top-0 left-0 z-10 flex w-full cursor-pointer items-center gap-3 border-b border-border/60 bg-muted/95 px-4 py-1.5 select-none hover:bg-muted"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: 34,
                  }}
                  onClick={() => toggleGroup(row.dateKey)}
                >
                  <span className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wide text-foreground">
                    <ChevronRight
                      className={`size-3.5 text-muted-foreground/80 transition-transform ${
                        !isCollapsed ? "rotate-90" : ""
                      }`}
                    />
                    {row.dateFormatted}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="font-sans text-xs font-medium text-muted-foreground">
                    {row.count} {row.count === 1 ? "item" : "items"}
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
                  virtualIndex={virtualRow.index}
                  onSelectToggle={onSelectToggle}
                  onPreviewOpen={onPreviewOpen}
                  onReviewAction={onReviewAction}
                  onPlayOpen={onPlayOpen}
                  onContextMenu={onContextMenu}
                />
              )
            }
          })}
          {footer && (
            <div
              className="absolute left-0 w-full px-4"
              style={{
                top: `${rowVirtualizer.getTotalSize() + 12}px`,
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const MediaList = memo(MediaListComponent)

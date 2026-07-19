import React, { useRef, useMemo, useState, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { MediaItem } from "../../../shared/types/media"
import { MediaCard } from "./MediaCard"
import { formatDate } from "../../lib/format"
import { ChevronRight } from "lucide-react"

interface MediaTimelineProps {
  items: MediaItem[]
  selectedIds: Set<string>
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onInfoOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
}

const GAP = 16
const TARGET_CARD_WIDTH = 200

export const MediaTimeline: React.FC<MediaTimelineProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onInfoOpen,
  onReviewAction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [containerWidth, setContainerWidth] = useState<number>(800)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width)
        }
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const activeColumns = useMemo(() => {
    const computed = Math.floor(
      (containerWidth + GAP) / (TARGET_CARD_WIDTH + GAP)
    )
    return Math.max(2, Math.min(8, computed))
  }, [containerWidth])

  const estimatedRowHeight = useMemo(() => {
    const cardWidth =
      (containerWidth - (activeColumns - 1) * GAP) / activeColumns
    return Math.max(120, Math.round(cardWidth + GAP + 16))
  }, [containerWidth, activeColumns])

  // Fast-path group items by date fragment: "YYYY-MM-DD"
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
    const rows: Array<
      | {
          type: "header"
          dateFormatted: string
          count: number
          dateKey: string
          key: string
        }
      | { type: "items"; items: MediaItem[]; key: string }
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
        for (let i = 0; i < group.items.length; i += activeColumns) {
          const chunk = group.items.slice(i, i + activeColumns)
          rows.push({
            type: "items",
            items: chunk,
            key: `${group.dateKey}-row-${i}`,
          })
        }
      }
    }

    return rows
  }, [grouped, collapsedGroups, activeColumns])

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const row = flatRows[index]
      return row?.type === "header" ? 36 : estimatedRowHeight
    },
    getItemKey: (index) => flatRows[index]?.key || index,
    overscan: 4,
  })

  return (
    <div
      ref={containerRef}
      className="h-full w-full scrollbar-thin overflow-y-auto pr-1 select-none"
    >
      <div
        className="relative w-full"
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
                className="absolute top-0 left-0 z-10 flex w-full cursor-pointer items-center gap-4 bg-background/90 py-2 backdrop-blur select-none hover:opacity-85"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => toggleGroup(row.dateKey)}
              >
                <span className="flex items-center gap-1.5 font-heading text-xs font-bold tracking-wide text-foreground">
                  <ChevronRight
                    className={`h-3.5 w-3.5 text-muted-foreground/80 transition-transform ${
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
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 grid w-full gap-4 py-2 will-change-transform"
                style={{
                  gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.items.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onSelectToggle={onSelectToggle}
                    onPreviewOpen={onPreviewOpen}
                    onInfoOpen={onInfoOpen}
                    onReviewAction={onReviewAction}
                  />
                ))}
              </div>
            )
          }
        })}

        {items.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center font-sans text-muted-foreground">
            <span className="text-sm">No items found</span>
          </div>
        )}
      </div>
    </div>
  )
}

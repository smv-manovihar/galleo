import React, { useRef, useMemo, useState, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { MediaItem } from "../../../shared/types/media"
import { MediaCard } from "./MediaCard"

interface MediaGridProps {
  items: MediaItem[]
  selectedIds: Set<string>
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onInfoOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
  columns?: number
}

const GAP = 16
const TARGET_CARD_WIDTH = 200

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onInfoOpen,
  onReviewAction,
  columns: overrideColumns,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
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
    if (overrideColumns && overrideColumns > 0) return overrideColumns
    const computed = Math.floor(
      (containerWidth + GAP) / (TARGET_CARD_WIDTH + GAP)
    )
    return Math.max(2, Math.min(8, computed))
  }, [containerWidth, overrideColumns])

  // Compute accurate row height: aspect ratio is 1:1 for cards
  const estimatedRowHeight = useMemo(() => {
    const cardWidth =
      (containerWidth - (activeColumns - 1) * GAP) / activeColumns
    return Math.max(120, Math.round(cardWidth + GAP + 16))
  }, [containerWidth, activeColumns])

  // Group items into rows based on calculated columns
  const rows = useMemo(() => {
    const r: MediaItem[][] = []
    for (let i = 0; i < items.length; i += activeColumns) {
      r.push(items.slice(i, i + activeColumns))
    }
    return r
  }, [items, activeColumns])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimatedRowHeight,
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
          const rowItems = rows[virtualRow.index]
          return (
            <div
              key={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 grid w-full gap-4 py-2 will-change-transform"
              style={{
                gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowItems.map((item) => (
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
        })}

        {items.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center font-sans text-muted-foreground">
            <span className="text-sm">No items match current filters</span>
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useRef, useMemo, useState, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { MediaItem } from "../../../shared/types/media"
import { MediaCard } from "./MediaCard"
import { useMediaStore } from "../../stores/media-store"
import { useSettingsStore } from "../../stores/settings-store"
import { FolderSearch } from "lucide-react"

import type { SearchResultItem } from "../../../main/services/search-engine.service"

interface MediaGridProps {
  items: MediaItem[]
  selectedIds: Set<string>
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onInfoOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
  columns?: number
  searchResultsMap?: Map<string, SearchResultItem>
  onFindSimilar?: (mediaId: string) => void
  onPlayOpen?: (item: MediaItem) => void
}

const GAP = 16
const TARGET_CARD_WIDTH = 200

const MediaGridComponent: React.FC<MediaGridProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onInfoOpen,
  onReviewAction,
  columns: overrideColumns,
  searchResultsMap,
  onFindSimilar,
  onPlayOpen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1000)

  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const { settings } = useSettingsStore()

  const isScanned = useMemo(() => {
    if (!activeRootPath || activeRootPath === "all") {
      return settings.folders.roots.some((r) => r.enabled && r.scanned)
    }
    return !!settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned
  }, [activeRootPath, settings.folders.roots])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect.width) {
        setContainerWidth(entries[0].contentRect.width)
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

  if (items.length === 0) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center py-16 font-sans text-xs text-muted-foreground select-none">
        {!isScanned ? (
          <>
            <FolderSearch className="h-8 w-8 text-amber-500/80 mb-1" />
            <span className="text-sm font-medium text-foreground">Folder not scanned</span>
            <span className="mt-1 text-2xs text-muted-foreground">Use the Scan Folders button above to index media files.</span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground">No items match current filters</span>
            <span className="mt-1 text-2xs text-muted-foreground">Try clearing filters or search terms.</span>
          </>
        )}
      </div>
    )
  }

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
              {rowItems.map((item) => {
                const searchMatch = searchResultsMap?.get(item.id)
                return (
                  <MediaCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onSelectToggle={onSelectToggle}
                    onPreviewOpen={onPreviewOpen}
                    onInfoOpen={onInfoOpen}
                    onReviewAction={onReviewAction}
                    matchingFrame={searchMatch?.matchingFrame}
                    searchScore={searchMatch?.score}
                    onFindSimilar={onFindSimilar}
                    onPlayOpen={onPlayOpen}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const MediaGrid = React.memo(MediaGridComponent)

import React, { useRef, useMemo, useState, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { MediaItem } from "../../../shared/types/media"
import { MediaCard } from "./MediaCard"
import { useMediaStore } from "../../stores/media-store"
import { useSettingsStore, selectIsScanned } from "../../stores/settings-store"
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
  onContextMenu?: (item: MediaItem, e: React.MouseEvent) => void
  topOffset?: number
  footer?: React.ReactNode
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
  onContextMenu,
  topOffset = 64,
  footer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1000)

  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const settings = useSettingsStore((s) => s.settings)

  const isScanned = useMemo(() => {
    return selectIsScanned(settings, activeRootPath)
  }, [settings, activeRootPath])

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

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimatedRowHeight,
    getItemKey: (index) => rows[index]?.[0]?.id || index,
    overscan: 2,
  })

  if (items.length === 0) {
    if (footer) {
      return (
        <div
          className="flex h-full w-full flex-1 flex-col items-center justify-center p-4 font-sans text-xs text-muted-foreground select-none"
          style={{ paddingTop: `${topOffset}px` }}
        >
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
    <div
      ref={containerRef}
      className="h-full w-full scrollbar-thin overflow-y-auto pr-1 select-none"
    >
      <div
        className="relative w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize() + topOffset + footerExtraHeight}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index]
          if (!rowItems) return null
          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 grid w-full gap-4 py-2 will-change-transform"
              style={{
                gridTemplateColumns: `repeat(${activeColumns}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start + topOffset}px)`,
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
                    onFindSimilar={onFindSimilar}
                    onPlayOpen={onPlayOpen}
                    onContextMenu={onContextMenu}
                  />
                )
              })}
            </div>
          )
        })}
        {footer && (
          <div
            className="absolute left-0 w-full px-2"
            style={{
              top: `${rowVirtualizer.getTotalSize() + topOffset + 12}px`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export const MediaGrid = React.memo(MediaGridComponent)

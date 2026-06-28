import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { MediaItem } from '../../../shared/types/media';
import { MediaCard } from './MediaCard';

interface MediaGridProps {
  items: MediaItem[];
  selectedIds: Set<string>;
  onSelectToggle: (id: string, e: React.MouseEvent) => void;
  onPreviewOpen: (item: MediaItem) => void;
  onReviewAction: (id: string, state: 'keep' | 'delete' | 'skipped') => void;
  columns?: number;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onReviewAction,
  columns = 4
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group items into rows based on the number of columns
  const rows = useMemo(() => {
    const r: MediaItem[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      r.push(items.slice(i, i + columns));
    }
    return r;
  }, [items, columns]);

  // Use react-virtual to virtualize row items
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 240, // Closer estimate for row height including gap
    overscan: 5
  });

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto pr-1 select-none scrollbar-thin"
    >
      <div
        className="w-full relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 w-full grid gap-4 py-2"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {rowItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onSelectToggle={onSelectToggle}
                  onPreviewOpen={onPreviewOpen}
                  onReviewAction={onReviewAction}
                />
              ))}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground font-sans">
            <span className="text-sm">No items match current filters</span>
          </div>
        )}
      </div>
    </div>
  );
};

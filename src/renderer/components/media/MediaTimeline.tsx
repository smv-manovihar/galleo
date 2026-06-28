import React, { useRef, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { MediaItem } from '../../../shared/types/media';
import { MediaCard } from './MediaCard';
import { formatDate } from '../../lib/format';
import { ChevronRight } from 'lucide-react';

interface MediaTimelineProps {
  items: MediaItem[];
  selectedIds: Set<string>;
  onSelectToggle: (id: string, e: React.MouseEvent) => void;
  onPreviewOpen: (item: MediaItem) => void;
  onReviewAction: (id: string, state: 'keep' | 'delete' | 'skipped') => void;
}

export const MediaTimeline: React.FC<MediaTimelineProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onReviewAction
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group items by date fragment: "YYYY-MM-DD"
  const grouped = useMemo(() => {
    const groups: Record<string, MediaItem[]> = {};
    for (const item of items) {
      const date = new Date(item.dateTarget);
      if (isNaN(date.getTime())) continue;
      
      const key = date.toISOString().split('T')[0]; // format YYYY-MM-DD
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    
    // Sort keys descending
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({
        dateKey: key,
        dateFormatted: formatDate(key),
        items: groups[key]
      }));
  }, [items]);

  const toggleGroup = (dateKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  // Flatten grouped structures into a single flat list of rows for virtualization
  const flatRows = useMemo(() => {
    const rows: Array<
      | { type: 'header'; dateFormatted: string; count: number; dateKey: string; key: string }
      | { type: 'items'; items: MediaItem[]; key: string }
    > = [];

    for (const group of grouped) {
      const isCollapsed = collapsedGroups.has(group.dateKey);
      
      rows.push({
        type: 'header',
        key: `header-${group.dateKey}`,
        dateKey: group.dateKey,
        dateFormatted: group.dateFormatted,
        count: group.items.length
      });

      if (!isCollapsed) {
        const columns = 4;
        for (let i = 0; i < group.items.length; i += columns) {
          const chunk = group.items.slice(i, i + columns);
          rows.push({
            type: 'items',
            items: chunk,
            key: `${group.dateKey}-row-${i}`
          });
        }
      }
    }

    return rows;
  }, [grouped, collapsedGroups]);

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const row = flatRows[index];
      return row?.type === 'header' ? 36 : 240;
    },
    getItemKey: (index) => flatRows[index]?.key || index,
    overscan: 10
  });

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto select-none pr-1 scrollbar-thin"
    >
      <div
        className="w-full relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = flatRows[virtualRow.index];
          if (!row) return null;

          if (row.type === 'header') {
            const isCollapsed = collapsedGroups.has(row.dateKey);
            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full flex items-center gap-4 bg-background/80 backdrop-blur py-2 z-10 cursor-pointer select-none hover:opacity-85"
                style={{
                  transform: `translateY(${virtualRow.start}px)`
                }}
                onClick={() => toggleGroup(row.dateKey)}
              >
                <span className="font-heading font-bold text-xs text-foreground tracking-wide flex items-center gap-1.5">
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-muted-foreground/80 ${
                      !isCollapsed ? 'rotate-90' : ''
                    }`}
                  />
                  {row.dateFormatted}
                </span>
                <div className="h-px bg-border flex-1" />
                <span className="text-2xs text-muted-foreground font-sans uppercase font-semibold">
                  {row.count} items
                </span>
              </div>
            );
          } else {
            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full grid grid-cols-4 gap-4 py-2"
                style={{
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {row.items.map((item) => (
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
          }
        })}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground font-sans">
            <span className="text-sm">No items found</span>
          </div>
        )}
      </div>
    </div>
  );
};


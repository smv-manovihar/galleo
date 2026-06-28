import React, { useRef, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { MediaItem } from '../../../shared/types/media';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatBytes, formatShortDate, formatDate } from '../../lib/format';
import { Play, FileImage, Trash2, Check, Eye, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface MediaListProps {
  items: MediaItem[];
  selectedIds: Set<string>;
  onSelectToggle: (id: string, e: React.MouseEvent) => void;
  onPreviewOpen: (item: MediaItem) => void;
  onReviewAction: (id: string, state: 'keep' | 'delete' | 'skipped') => void;
  isGrouped?: boolean;
}

export const MediaList: React.FC<MediaListProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onReviewAction,
  isGrouped = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Proportional column widths sharing exactly 100% of the available fractional (fr) units
  const [widths, setWidths] = useState({
    name: 30,     // 30%
    type: 10,     // 10%
    date: 13,     // 13%
    size: 11,     // 11%
    score: 11,    // 11%
    state: 12,    // 12%
    actions: 13,  // 13%
  }); // Sum = 100

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Proportional mouse drag handler for column resizing
  const handleMouseDown = (columnKey: keyof typeof widths, e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const startX = e.clientX;
    const startWidths = { ...widths };
    const startWidthFr = startWidths[columnKey];
    
    // Get the container width excluding checkbox (48px)
    const rect = containerRef.current.getBoundingClientRect();
    const availableWidth = rect.width - 48 - 12;
    
    // Since total fr is 100, 1 fr = availableWidth / 100 pixels
    const pixelsPerFr = availableWidth / 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaFr = deltaX / pixelsPerFr;
      
      // Bound the new value of the dragged column (between 5% and 80%)
      const newVal = Math.max(5, Math.min(80, startWidthFr + deltaFr));
      
      const otherSum = 100 - startWidthFr;
      const newOtherSum = 100 - newVal;
      const scaleFactor = newOtherSum / otherSum;

      setWidths(prev => {
        const next = { ...prev };
        next[columnKey] = newVal;
        
        const keys = Object.keys(startWidths) as Array<keyof typeof widths>;
        let runningSum = newVal;
        
        // Scale other columns proportionally to preserve the exact sum of 100
        const otherKeys = keys.filter(k => k !== columnKey);
        otherKeys.forEach((key, idx) => {
          if (idx === otherKeys.length - 1) {
            next[key] = 100 - runningSum;
          } else {
            const val = startWidths[key] * scaleFactor;
            next[key] = val;
            runningSum += val;
          }
        });
        
        return next;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Group items by target date
  const grouped = useMemo(() => {
    const groups: Record<string, MediaItem[]> = {};
    for (const item of items) {
      const date = new Date(item.dateTarget);
      if (isNaN(date.getTime())) continue;
      
      const key = date.toISOString().split('T')[0];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    
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
    if (!isGrouped) {
      return items.map(item => ({
        type: 'item' as const,
        item,
        key: item.id
      }));
    }

    const rows: Array<
      | { type: 'header'; dateFormatted: string; count: number; dateKey: string; key: string }
      | { type: 'item'; item: MediaItem; key: string }
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
        for (const item of group.items) {
          rows.push({
            type: 'item',
            item,
            key: item.id
          });
        }
      }
    }

    return rows;
  }, [items, grouped, collapsedGroups, isGrouped]);

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const row = flatRows[index];
      return row?.type === 'header' ? 36 : 38;
    },
    getItemKey: (index) => flatRows[index]?.key || index,
    overscan: 10
  });

  const gridStyle = {
    gridTemplateColumns: `48px ${widths.name}fr ${widths.type}fr ${widths.date}fr ${widths.size}fr ${widths.score}fr ${widths.state}fr ${widths.actions}fr`
  };

  return (
    <div className="w-full h-full border border-border bg-card/40 rounded-xl overflow-hidden select-none">
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto scrollbar-thin relative"
      >
        {/* Table Header Row (sticky top to remain visible on scroll) */}
        <div 
          className="sticky top-0 z-20 grid items-center border-b border-border bg-muted/90 backdrop-blur-xs py-2.5 font-sans font-medium text-muted-foreground text-[0.6875rem] select-none shrink-0 w-full h-[36px]"
          style={gridStyle}
        >
          <div className="text-center border-r border-border/40 h-full flex items-center justify-center"></div>
          
          {/* Filename Column */}
          <div className="relative h-full flex items-center px-3 border-r border-border/40">
            <span>Filename</span>
            <div 
              onMouseDown={(e) => handleMouseDown('name', e)}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/45 active:bg-primary z-30 transition-colors"
            />
          </div>

          {/* Type Column */}
          <div className="relative h-full flex items-center px-3 border-r border-border/40">
            <span>Type</span>
            <div 
              onMouseDown={(e) => handleMouseDown('type', e)}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/45 active:bg-primary z-30 transition-colors"
            />
          </div>

          {/* Date Column */}
          <div className="relative h-full flex items-center px-3 border-r border-border/40">
            <span>Target Date</span>
            <div 
              onMouseDown={(e) => handleMouseDown('date', e)}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/45 active:bg-primary z-30 transition-colors"
            />
          </div>

          {/* Size Column */}
          <div className="relative h-full flex items-center px-3 border-r border-border/40">
            <span>File Size</span>
            <div 
              onMouseDown={(e) => handleMouseDown('size', e)}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/45 active:bg-primary z-30 transition-colors"
            />
          </div>

          {/* Score Column */}
          <div className="relative h-full flex items-center justify-center px-3 border-r border-border/40">
            <span>Quality Score</span>
            <div 
              onMouseDown={(e) => handleMouseDown('score', e)}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/45 active:bg-primary z-30 transition-colors"
            />
          </div>

          {/* Review State Column */}
          <div className="relative h-full flex items-center justify-center px-3 border-r border-border/40">
            <span>Review State</span>
            <div 
              onMouseDown={(e) => handleMouseDown('state', e)}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/45 active:bg-primary z-30 transition-colors"
            />
          </div>

          {/* Actions Column */}
          <div className="relative h-full flex items-center justify-center px-3">
            <span>Actions</span>
            <div 
              onMouseDown={(e) => handleMouseDown('actions', e)}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/45 active:bg-primary z-30 transition-colors"
            />
          </div>
        </div>

        {/* Table Body Container */}
        <div
          className="w-full relative animate-fade-in"
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
                  className="absolute top-0 left-0 flex items-center gap-4 bg-muted/65 backdrop-blur-xs py-2 px-4 border-b border-border/50 cursor-pointer select-none hover:bg-muted/80 z-10 w-full"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: 36
                  }}
                  onClick={() => toggleGroup(row.dateKey)}
                >
                  <span className="font-sans font-bold text-xs text-foreground tracking-wide flex items-center gap-1.5">
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
              const item = row.item;
              const isSelected = selectedIds.has(item.id);
              const isVideo = item.mediaType === 'video';
              const score = item.quality?.compositeScore ?? null;

              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className={`absolute top-0 left-0 grid items-center border-b border-border/40 hover:bg-accent/40 text-xs transition-colors duration-150 cursor-pointer w-full h-[38px] ${
                    isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''
                  }`}
                  style={{
                    ...gridStyle,
                    height: 38,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                  onClick={(e: React.MouseEvent) => onSelectToggle(item.id, e)}
                >
                  {/* Select Checkbox */}
                  <div className="flex justify-center border-r border-border/30 h-full items-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(_checked) => {
                        onSelectToggle(item.id, { shiftKey: false } as any);
                      }}
                      className="border-border focus-visible:ring-1 h-3.5 w-3.5 cursor-pointer"
                    />
                  </div>

                  {/* File Icon + Name */}
                  <div className="font-medium truncate pr-4 pl-3 border-r border-border/30 h-full flex items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isVideo ? (
                        <Play className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <FileImage className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate text-foreground" title={item.name}>{item.name}</span>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="capitalize text-muted-foreground text-2xs pl-3 border-r border-border/30 h-full flex items-center">
                    {item.mediaType}
                  </div>

                  {/* Date */}
                  <div className="tabular-nums text-foreground pl-3 border-r border-border/30 h-full flex items-center">
                    {formatShortDate(item.dateTarget)}
                  </div>

                  {/* Size */}
                  <div className="tabular-nums text-muted-foreground pl-3 border-r border-border/30 h-full flex items-center">
                    {formatBytes(item.size)}
                  </div>

                  {/* Quality Score */}
                  <div className="text-center border-r border-border/30 h-full flex items-center justify-center">
                    {score !== null ? (
                      <Badge
                        variant={score < 50 ? 'destructive' : 'secondary'}
                        className="text-2xs font-bold py-0 h-4.5 px-1.5"
                      >
                        {score}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Review State */}
                  <div className="text-center border-r border-border/30 h-full flex items-center justify-center">
                    {item.reviewState === 'keep' && (
                      <Badge variant="outline" className="text-2xs bg-green-500/10 border-green-500/20 text-green-500 py-0 h-4.5 px-1.5">
                        Keep
                      </Badge>
                    )}
                    {item.reviewState === 'delete' && (
                      <Badge variant="outline" className="text-2xs bg-destructive/10 border-destructive/20 text-destructive py-0 h-4.5 px-1.5">
                        Delete
                      </Badge>
                    )}
                    {item.reviewState === 'skipped' && (
                      <Badge variant="outline" className="text-2xs bg-muted border-border text-muted-foreground py-0 h-4.5 px-1.5">
                        Skipped
                      </Badge>
                    )}
                    {item.reviewState === 'pending' && (
                      <span className="text-2xs text-muted-foreground">Pending</span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center justify-center gap-0.5 h-full px-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6.5 h-6.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                          onClick={() => onPreviewOpen(item)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Preview
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6.5 h-6.5 rounded text-muted-foreground hover:text-green-500 hover:bg-green-500/10 cursor-pointer"
                          onClick={() => onReviewAction(item.id, 'keep')}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Keep
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6.5 h-6.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => onReviewAction(item.id, 'delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Delete
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            }
          })}

          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No items match current filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

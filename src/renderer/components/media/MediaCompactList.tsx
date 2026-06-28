import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { MediaItem } from '../../../shared/types/media';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  Play, 
  FileImage, 
  Trash2, 
  Check, 
  Eye, 
  ExternalLink, 
  FolderOpen 
} from 'lucide-react';
import { formatBytes } from '../../lib/format';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MediaCompactListProps {
  items: MediaItem[];
  selectedIds: Set<string>;
  onSelectToggle: (id: string, e: React.MouseEvent) => void;
  onPreviewOpen: (item: MediaItem) => void;
  onReviewAction: (id: string, state: 'keep' | 'delete' | 'skipped') => void;
}

export const MediaCompactList: React.FC<MediaCompactListProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onReviewAction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const columns = 5;

  // Group items into rows based on the number of columns
  const rows = useMemo(() => {
    const r: MediaItem[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      r.push(items.slice(i, i + columns));
    }
    return r;
  }, [items, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 40, // Height of card row including gap
    overscan: 10
  });

  const handleOpenFile = async (path: string) => {
    await window.api.openFile(path);
  };

  const handleOpenFolder = async (path: string) => {
    await window.api.showFile(path);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full border border-border bg-card/45 backdrop-blur-md rounded-lg p-4 select-none overflow-y-auto scrollbar-thin"
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
              className="absolute top-0 left-0 w-full grid gap-2 py-1"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {rowItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isVideo = item.mediaType === 'video';

                const getBgColor = () => {
                  if (isSelected) return 'bg-primary/10 border-primary/30';
                  if (item.reviewState === 'keep') return 'bg-green-500/10 border-green-500/30';
                  if (item.reviewState === 'delete') return 'bg-destructive/10 border-destructive/30 opacity-60';
                  return 'bg-background/40 border-border hover:bg-accent/40';
                };

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-1.5 rounded-lg border text-[0.6875rem] transition-all duration-150 group cursor-pointer ${getBgColor()}`}
                    onClick={(e) => onSelectToggle(item.id, e)}
                    onDoubleClick={() => onPreviewOpen(item)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Checkbox */}
                      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center pl-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onSelectToggle(item.id, { shiftKey: false } as any)}
                          className="h-3.5 w-3.5 border-border focus-visible:ring-1 cursor-pointer"
                        />
                      </div>

                      {/* Media Icon/Thumbnail */}
                      <div className="w-6 h-6 rounded overflow-hidden bg-muted/40 flex items-center justify-center shrink-0 relative select-none pointer-events-none">
                        {item.thumbnailPath ? (
                          <img
                            src={`media:///${item.thumbnailPath.replace(/\\/g, '/')}`}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : isVideo ? (
                          <Play className="w-3.5 h-3.5 text-primary fill-current" />
                        ) : (
                          <FileImage className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        
                        {/* Small play overlay on thumbnail */}
                        {isVideo && item.thumbnailPath && (
                          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                            <Play className="w-2.5 h-2.5 text-white fill-current" />
                          </div>
                        )}
                      </div>

                      {/* Filename & size info */}
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="font-semibold truncate text-2xs text-foreground" title={item.name}>
                          {item.name}
                        </span>
                        <span className="text-2xs text-muted-foreground font-mono">
                          {formatBytes(item.size)}
                        </span>
                      </div>
                    </div>

                    {/* Status Dot & Menu Controls */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Review status indicator dot */}
                      {item.reviewState === 'keep' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Marked to keep" />
                      )}
                      {item.reviewState === 'delete' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" title="Marked to delete" />
                      )}

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent opacity-60 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 border-border bg-card/95 backdrop-blur-md text-foreground font-sans text-xs">
                          <DropdownMenuItem onClick={() => onPreviewOpen(item)} className="gap-2.5 cursor-pointer">
                            <Eye className="w-3.5 h-3.5" />
                            Preview File
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onReviewAction(item.id, 'keep')} className="text-green-500 focus:text-green-500 gap-2.5 cursor-pointer">
                            <Check className="w-3.5 h-3.5" />
                            Mark to Keep
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onReviewAction(item.id, 'delete')} className="text-destructive focus:text-destructive gap-2.5 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                            Mark to Delete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenFile(item.path)} className="gap-2.5 cursor-pointer">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open in default app
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenFolder(item.path)} className="gap-2.5 cursor-pointer">
                            <FolderOpen className="w-3.5 h-3.5" />
                            Show in Explorer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No items match current filters
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import type { MediaItem } from '../../../shared/types/media';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Trash2,
  Bookmark,
  AlertTriangle,
  ExternalLink,
  Eye,
  Info,
  FolderOpen,
  MoreVertical,
} from 'lucide-react';
import { formatBytes } from '../../lib/format';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MediaCardProps {
  item: MediaItem;
  isSelected: boolean;
  onSelectToggle: (id: string, e: React.MouseEvent) => void;
  onPreviewOpen: (item: MediaItem) => void;
  onInfoOpen: (item: MediaItem) => void;
  onReviewAction: (id: string, state: 'keep' | 'delete' | 'skipped') => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  isSelected,
  onPreviewOpen,
  onInfoOpen,
  onReviewAction,
}) => {
  const isVideo = item.mediaType === 'video';
  const hasQuality = item.quality !== undefined;
  const hasWarning =
    hasQuality && (item.quality!.isBlurry || item.quality!.isDark) && item.reviewState === 'pending';

  const dateStr = new Date(item.dateTarget).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });

  const getBorderColor = () => {
    if (isSelected) return 'border-primary ring-1 ring-primary';
    if (item.reviewState === 'keep') return 'border-green-500/50 bg-green-500/5';
    if (item.reviewState === 'delete') return 'border-destructive/50 bg-destructive/5 opacity-60';
    return 'border-border hover:border-muted-foreground/45';
  };

  const handleOpenFolder = async () => {
    await window.api.showFile(item.path);
  };

  const handleOpenFile = async () => {
    await window.api.openFile(item.path);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          className={`overflow-hidden p-0 py-0 cursor-pointer transition-colors duration-150 select-none group border bg-card/40 ${getBorderColor()}`}
          onClick={() => onPreviewOpen(item)}
        >
          <CardHeader className="hidden">
            <CardTitle>{item.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative aspect-square flex flex-col justify-end bg-muted/20">
            {/* Thumbnail */}
            {(item.thumbnailPath || !isVideo) ? (
              <img
                src={`media:///${(item.thumbnailPath || item.path).replace(/\\/g, '/')}`}
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-muted-foreground">
                <span className="text-2xs uppercase font-bold">{item.extension}</span>
              </div>
            )}

            {/* Gradient overlay — grows on hover to make room for action bar */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            {/* Quality Score Badge */}
            {hasQuality && (
              <div className="absolute top-2 left-2 pointer-events-none z-10">
                <Badge
                  variant={item.quality!.compositeScore < 50 ? 'destructive' : 'secondary'}
                  className={`text-[0.5625rem] px-1.5 py-0 border-0 ${
                    item.quality!.compositeScore < 50
                      ? 'bg-destructive/90 text-destructive-foreground'
                      : 'bg-background/80 backdrop-blur text-foreground'
                  }`}
                >
                  {item.quality!.compositeScore}
                </Badge>
              </div>
            )}

            {/* Video Play Indicator */}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 group-hover:opacity-0 transition-opacity duration-200">
                <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-md">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>
            )}

            {/* Review state badges (top-right, always visible) */}
            {item.reviewState === 'keep' && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm z-20">
                <Bookmark className="w-3 h-3 fill-white" />
              </div>
            )}
            {item.reviewState === 'delete' && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm z-20">
                <Trash2 className="w-3 h-3" />
              </div>
            )}

            {/* Defect warning (bottom-right, always visible) */}
            {hasWarning && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-yellow-500 text-white flex items-center justify-center shadow-sm z-20 cursor-help">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">Flagged quality warnings</TooltipContent>
              </Tooltip>
            )}

            {/* Hover action bar — file info + quick action buttons */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 px-2 pb-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {/* Filename + meta */}
              <div className="pointer-events-none text-white">
                <span className="text-sm font-semibold truncate block leading-tight">{item.name}</span>
                <div className="flex items-center justify-between text-[0.5625rem] opacity-75 mt-0.5">
                  <span>{dateStr}</span>
                  <span>{formatBytes(item.size)}</span>
                </div>
              </div>

              {/* Action buttons row */}
              <div
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Keep */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-1 h-7 rounded-md bg-green-500/20 hover:bg-green-500/50! text-green-400 hover:text-green-200! border border-green-500/25 hover:border-green-500/50! cursor-pointer transition-colors"
                      onClick={() => onReviewAction(item.id, 'keep')}
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-current" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Keep File</TooltipContent>
                </Tooltip>

                {/* Delete */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-1 h-7 rounded-md bg-red-500/20 hover:bg-red-500/50! text-red-400 hover:text-red-200! border border-red-500/25 hover:border-red-500/50! cursor-pointer transition-colors"
                      onClick={() => onReviewAction(item.id, 'delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete File</TooltipContent>
                </Tooltip>

                {/* More (secondary actions) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className="shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md bg-white/10 hover:bg-white/30! text-white/80 hover:text-white! border border-white/15 hover:border-white/30! cursor-pointer transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">More Options</TooltipContent>
                      </Tooltip>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 border-border bg-card/95 backdrop-blur-md text-foreground font-sans text-sm">
                    <DropdownMenuItem onClick={() => onInfoOpen(item)} className="gap-2.5 cursor-pointer">
                      <Info className="w-3.5 h-3.5" />
                      File Info
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleOpenFile} className="gap-2.5 cursor-pointer">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in default app
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenFolder} className="gap-2.5 cursor-pointer">
                      <FolderOpen className="w-3.5 h-3.5" />
                      Show in Explorer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>

      {/* Right-click context menu */}
      <ContextMenuContent className="w-44 border-border bg-card text-foreground font-sans text-sm">
        <ContextMenuItem onClick={() => onPreviewOpen(item)} className="gap-2.5">
          <Eye className="w-3.5 h-3.5" />
          Preview File
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onInfoOpen(item)} className="gap-2.5">
          <Info className="w-3.5 h-3.5" />
          File Info
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onReviewAction(item.id, 'keep')} className="text-green-500 focus:text-green-500 gap-2.5">
          <Bookmark className="w-3.5 h-3.5" />
          Mark to Keep
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onReviewAction(item.id, 'delete')} className="text-destructive focus:text-destructive gap-2.5">
          <Trash2 className="w-3.5 h-3.5" />
          Mark to Delete
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleOpenFile} className="gap-2.5">
          <ExternalLink className="w-3.5 h-3.5" />
          Open in default app
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenFolder} className="gap-2.5">
          <FolderOpen className="w-3.5 h-3.5" />
          Show in Explorer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

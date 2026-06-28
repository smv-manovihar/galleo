import React from 'react';
import type { MediaItem } from '../../../shared/types/media';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Trash2, 
  Check, 
  AlertTriangle,
  ExternalLink,
  Eye,
  FolderOpen,
  MoreVertical
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
  onReviewAction: (id: string, state: 'keep' | 'delete' | 'skipped') => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  isSelected,
  onSelectToggle,
  onPreviewOpen,
  onReviewAction
}) => {
  const isVideo = item.mediaType === 'video';
  const hasQuality = item.quality !== undefined;
  const hasWarning = hasQuality && (item.quality!.isBlurry || item.quality!.isDark) && item.reviewState === 'pending';
  
  // Format target display date
  const dateStr = new Date(item.dateTarget).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: '25' === '25' ? '2-digit' : 'numeric' // compact format
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
          onClick={(e: React.MouseEvent) => onSelectToggle(item.id, e)}
          onDoubleClick={() => onPreviewOpen(item)}
        >
          <CardHeader className="hidden">
            <CardTitle>{item.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative aspect-square flex flex-col justify-end bg-muted/20">
            {/* Thumbnail Image */}
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

            {/* Dark overlay at bottom for text visibility */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

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

            {/* Video Play Overlay */}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-md">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>
            )}

            {/* File Info Overlay on Hover */}
            <CardFooter className={`absolute bottom-2 left-2 ${hasWarning ? 'right-9' : 'right-2'} z-10 flex flex-col items-start p-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-white`}>
              <span className="font-semibold truncate w-full">{item.name}</span>
              <div className="flex items-center justify-between text-2xs opacity-80 w-full mt-0.5">
                <span>{dateStr}</span>
                <span>{formatBytes(item.size)}</span>
              </div>
            </CardFooter>

            {/* Accessible Three-dot Menu Dropdown */}
            <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-white flex items-center justify-center transition-opacity opacity-60 group-hover:opacity-100 focus:opacity-100 shadow-sm cursor-pointer"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
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

            {/* Review Status Icons (offset to the left of the three-dot menu button to prevent overlap) */}
            {item.reviewState === 'keep' && (
              <div className="absolute top-2 right-9 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm z-10">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            {item.reviewState === 'delete' && (
              <div className="absolute top-2 right-9 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm z-10">
                <Trash2 className="w-3 h-3" />
              </div>
            )}

            {/* Defect Alerts (blurry / dark) */}
            {hasWarning && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-yellow-500 text-white flex items-center justify-center shadow-sm z-10 cursor-help">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Flagged quality warnings
                </TooltipContent>
              </Tooltip>
            )}
          </CardContent>
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44 border-border bg-card text-foreground font-sans text-xs">
        <ContextMenuItem onClick={() => onPreviewOpen(item)} className="gap-2.5">
          <Eye className="w-3.5 h-3.5" />
          Preview File
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onReviewAction(item.id, 'keep')} className="text-green-500 focus:text-green-500 gap-2.5">
          <Check className="w-3.5 h-3.5" />
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

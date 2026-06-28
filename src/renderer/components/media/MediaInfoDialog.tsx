import React from 'react';
import type { MediaItem } from '../../../shared/types/media';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileImage, FolderOpen } from 'lucide-react';
import { formatBytes, formatDate } from '../../lib/format';

interface MediaInfoDialogProps {
  item: MediaItem | null;
  onClose: () => void;
}

export const MediaInfoDialog: React.FC<MediaInfoDialogProps> = ({ item, onClose }) => {
  if (!item) return null;

  const hasQuality = item.quality !== undefined;
  const exifDate = item.dateOriginal ? formatDate(item.dateOriginal) : 'None';
  const inferredDate = item.dateInferred ? formatDate(item.dateInferred) : 'None';
  const fsDate = formatDate(item.dateFileSystem);

  const handleOpenFolder = async () => {
    await window.api.showFile(item.path);
  };

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-sm border-border bg-card text-foreground font-sans text-xs"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold truncate flex items-center gap-2">
            <FileImage className="w-4 h-4 text-primary shrink-0" />
            {item.name}
          </DialogTitle>
          <DialogDescription className="text-2xs text-muted-foreground truncate mt-0.5">
            {item.path}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Basic file attributes */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Size</span>
              <span className="font-medium text-foreground">{formatBytes(item.size)}</span>
            </div>
            {item.width && item.height && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span className="font-medium text-foreground">{item.width} × {item.height}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Extension</span>
              <span className="font-medium text-foreground uppercase">{item.extension}</span>
            </div>
          </div>

          {/* Quality details */}
          {hasQuality && (
            <div className="space-y-2 border-t border-border pt-3">
              <h5 className="font-semibold text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
                Quality Indicators
              </h5>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Composite Score</span>
                <Badge
                  variant={item.quality!.compositeScore < 50 ? 'destructive' : 'secondary'}
                  className="text-2xs font-bold"
                >
                  {item.quality!.compositeScore} / 100
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Blur</span>
                <span className={`font-semibold ${item.quality!.isBlurry ? 'text-destructive' : 'text-green-500'}`}>
                  {item.quality!.isBlurry ? `Blurry (${item.quality!.blurScore})` : 'Sharp'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exposure</span>
                <span className={`font-semibold ${item.quality!.isDark ? 'text-destructive' : 'text-green-500'}`}>
                  {item.quality!.isDark ? 'Underexposed' : 'Normal'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Screenshot</span>
                <span className="font-semibold text-foreground">
                  {item.quality!.isScreenshot ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          )}

          {/* Date chain */}
          <div className="space-y-2 border-t border-border pt-3">
            <h5 className="font-semibold text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
              Date Fallback Chain
            </h5>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> EXIF Original
              </span>
              <span className="font-medium text-foreground truncate max-w-36">{exifDate}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Filename Inferred
              </span>
              <span className="font-medium text-foreground truncate max-w-36">{inferredDate}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Filesystem
              </span>
              <span className="font-medium text-foreground truncate max-w-36">{fsDate}</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <Button variant="outline" className="w-full gap-2 text-xs" onClick={handleOpenFolder}>
            <FolderOpen className="w-4 h-4" />
            Show in Explorer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

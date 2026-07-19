import React from "react"
import type { MediaItem } from "../../../shared/types/media"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileImage, FolderOpen } from "lucide-react"
import { formatBytes, formatDate } from "../../lib/format"
import { getFileManagerName } from "../../lib/os"

interface MediaInfoDialogProps {
  item: MediaItem | null
  onClose: () => void
}

export const MediaInfoDialog: React.FC<MediaInfoDialogProps> = ({
  item,
  onClose,
}) => {
  if (!item) return null

  const hasQuality = item.quality !== undefined
  const exifDate = item.dateOriginal ? formatDate(item.dateOriginal) : "None"
  const inferredDate = item.dateInferred
    ? formatDate(item.dateInferred)
    : "None"
  const fsDate = formatDate(item.dateFileSystem)

  const handleOpenFolder = async () => {
    await window.api.showFile(item.path)
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-sm border-border bg-card font-sans text-xs text-foreground"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="flex items-center gap-2 truncate text-sm font-semibold">
            <FileImage className="h-4 w-4 shrink-0 text-primary" />
            {item.name}
          </DialogTitle>
          <DialogDescription className="mt-0.5 truncate text-2xs text-muted-foreground">
            {item.path}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Basic file attributes */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Size</span>
              <span className="font-medium text-foreground">
                {formatBytes(item.size)}
              </span>
            </div>
            {item.width && item.height && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span className="font-medium text-foreground">
                  {item.width} × {item.height}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Extension</span>
              <span className="font-medium text-foreground uppercase">
                {item.extension}
              </span>
            </div>
          </div>

          {/* Quality details */}
          {hasQuality && (
            <div className="space-y-2 border-t border-border pt-3">
              <h5 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                Quality Indicators
              </h5>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Composite Score</span>
                <Badge
                  variant={
                    item.quality!.compositeScore < 50
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-2xs font-bold"
                >
                  {item.quality!.compositeScore} / 100
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Blur</span>
                <span
                  className={`font-semibold ${item.quality!.isBlurry ? "text-destructive" : "text-green-500"}`}
                >
                  {item.quality!.isBlurry
                    ? `Blurry (${item.quality!.blurScore})`
                    : "Sharp"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exposure</span>
                <span
                  className={`font-semibold ${item.quality!.isDark ? "text-destructive" : "text-green-500"}`}
                >
                  {item.quality!.isDark ? "Underexposed" : "Normal"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Screenshot</span>
                <span className="font-semibold text-foreground">
                  {item.quality!.isScreenshot ? "Yes" : "No"}
                </span>
              </div>
            </div>
          )}

          {/* Resolved Target Date */}
          <div className="space-y-2 border-t border-border pt-3">
            <h5 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Canonical Organization Date
            </h5>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Resolved Date</span>
              <span className="font-bold text-primary">
                {formatDate(item.dateTarget)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Resolved Source</span>
              <Badge variant="secondary" className="text-2xs font-semibold">
                {item.dateTargetSource === "exif" && "EXIF Metadata"}
                {item.dateTargetSource === "filename" && "Filename Inferred"}
                {item.dateTargetSource === "filesystem" &&
                  "Filesystem Fallback"}
              </Badge>
            </div>
          </div>

          {/* Date chain */}
          <div className="space-y-2 border-t border-border pt-3">
            <h5 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Date Fallback Chain
            </h5>
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> EXIF Original
              </span>
              <span className="max-w-36 truncate font-medium text-foreground">
                {exifDate}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Filename Inferred
              </span>
              <span className="max-w-36 truncate font-medium text-foreground">
                {inferredDate}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Filesystem
              </span>
              <span className="max-w-36 truncate font-medium text-foreground">
                {fsDate}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <Button
            variant="outline"
            className="w-full gap-2 text-xs"
            onClick={handleOpenFolder}
          >
            <FolderOpen className="h-4 w-4" />
            Show in {getFileManagerName()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

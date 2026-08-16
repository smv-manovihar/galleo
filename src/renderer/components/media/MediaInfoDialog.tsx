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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

interface MediaInfoDialogProps {
  item: MediaItem | null
  onClose: () => void
}

const MediaInfoDialogComponent: React.FC<MediaInfoDialogProps> = ({
  item: propItem,
  onClose,
}) => {
  const [lastActiveItem, setLastActiveItem] = React.useState<MediaItem | null>(propItem)

  if (propItem && propItem !== lastActiveItem) {
    setLastActiveItem(propItem)
  }

  const item = propItem ?? lastActiveItem
  if (!item) return null

  const hasQuality = item.quality !== undefined
  const targetDate = formatDate(item.dateTarget)
  const sourceLabels: Record<string, string> = {
    exif: "EXIF",
    filename: "Filename",
    filesystem: "File System",
  }
  const resolvedSourceLabel = sourceLabels[item.dateTargetSource] || "Resolved"
  const exifDate = item.dateOriginal
    ? formatDate(item.dateOriginal)
    : item.dateTargetSource === "exif"
      ? formatDate(item.dateTarget)
      : "None"
  const inferredDate = item.dateInferred
    ? formatDate(item.dateInferred)
    : item.dateTargetSource === "filename"
      ? formatDate(item.dateTarget)
      : "None"
  const fsDate = formatDate(item.dateFileSystem)

  const parentFolderPath = item.path.substring(
    0,
    Math.max(item.path.lastIndexOf("/"), item.path.lastIndexOf("\\"))
  )

  const handleOpenFolder = async () => {
    await window.api.showFile(item.path)
  }

  return (
    <Dialog open={propItem !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-border bg-card p-5 font-sans text-foreground">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 truncate text-sm font-semibold">
            <FileImage className="size-4 shrink-0 text-primary" />
            <span className="truncate">{item.name}</span>
          </DialogTitle>
          <DialogDescription className="truncate text-xs text-muted-foreground">
            {parentFolderPath}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Parent Folder</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="max-w-44 cursor-pointer overflow-hidden text-left text-xs font-medium text-foreground"
                    onClick={handleOpenFolder}
                  >
                    <div className="inline-block whitespace-nowrap animate-marquee-pingpong">
                      {parentFolderPath}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs break-all select-text">
                  {parentFolderPath}
                </TooltipContent>
              </Tooltip>
            </div>
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

          {/* Dates */}
          <div className="space-y-2 border-t border-border pt-3">
            <h5 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Dates
            </h5>
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 font-semibold text-primary">
                <Calendar className="size-4 text-primary" /> Resolved Date ({resolvedSourceLabel})
              </span>
              <span className="max-w-36 truncate font-bold text-primary">
                {targetDate}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-4" /> EXIF Date
              </span>
              <span className="max-w-36 truncate font-medium text-foreground">
                {exifDate}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-4" /> Filename Inferred Date
              </span>
              <span className="max-w-36 truncate font-medium text-foreground">
                {inferredDate}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-4" /> File System Created
              </span>
              <span className="max-w-36 truncate font-medium text-foreground">
                {fsDate}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-4" /> File System Updated
              </span>
              <span className="max-w-36 truncate font-medium text-foreground">
                {item.dateModified ? formatDate(item.dateModified) : "None"}
              </span>
            </div>
          </div>

          {/* Quality details */}
          {hasQuality && (
            <div className="space-y-2 border-t border-border pt-3">
              <h5 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                  className="text-xs font-bold"
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

export const MediaInfoDialog = React.memo(MediaInfoDialogComponent)


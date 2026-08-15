import React, { useMemo } from "react"
import type { MediaItem } from "../../../../shared/types/media"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Calendar, FileImage, FolderOpen } from "lucide-react"
import { formatBytes, formatDate } from "../../../lib/format"
import { getFileManagerName } from "../../../lib/os"

interface MediaPropertiesPanelProps {
  item: MediaItem
}

const SOURCE_LABELS: Record<string, string> = {
  exif: "EXIF",
  filename: "Filename",
  filesystem: "File System",
}

export const MediaPropertiesPanel: React.FC<MediaPropertiesPanelProps> = React.memo(
  ({ item }) => {
    const parentFolder = item.path.substring(
      0,
      Math.max(item.path.lastIndexOf("/"), item.path.lastIndexOf("\\"))
    )

    const formattedDates = useMemo(() => {
      const resolvedSourceLabel = SOURCE_LABELS[item.dateTargetSource] || "Resolved"
      const targetDate = formatDate(item.dateTarget)
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
      const modifiedDate = item.dateModified ? formatDate(item.dateModified) : "None"

      return {
        resolvedSourceLabel,
        targetDate,
        exifDate,
        inferredDate,
        fsDate,
        modifiedDate,
      }
    }, [
      item.dateTargetSource,
      item.dateTarget,
      item.dateOriginal,
      item.dateInferred,
      item.dateFileSystem,
      item.dateModified,
    ])

    const handleOpenFolder = async () => {
      await window.api.showFile(item.path)
    }

    const hasQuality = item.quality !== undefined

    return (
      <div className="flex w-80 shrink-0 scrollbar-thin flex-col gap-4 overflow-y-auto border-r-0 border-l border-border bg-muted/10 p-5 font-sans text-xs select-none">
        <h4 className="flex items-center gap-2 font-heading text-sm font-bold text-foreground">
          <FileImage className="h-4 w-4 text-primary" />
          Properties Info
        </h4>

        {/* Basic file attributes */}
        <div className="space-y-2 border-b border-border pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground shrink-0">Parent Folder</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="max-w-44 cursor-pointer overflow-hidden text-left text-xs font-medium text-foreground"
                  onClick={handleOpenFolder}
                >
                  <div className="inline-block whitespace-nowrap animate-marquee-pingpong">
                    {parentFolder}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs break-all select-text">
                {parentFolder}
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
                {item.width} x {item.height}
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
        <div className="space-y-3 border-b border-border pb-4">
          <h5 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Dates
          </h5>

          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Calendar className="size-4 text-primary" /> Resolved Date ({formattedDates.resolvedSourceLabel})
            </span>
            <span className="max-w-44 truncate font-bold text-primary">
              {formattedDates.targetDate}
            </span>
          </div>

          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="size-4" /> EXIF Date
            </span>
            <span className="max-w-44 truncate font-medium text-foreground">
              {formattedDates.exifDate}
            </span>
          </div>

          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="size-4" /> Filename Inferred Date
            </span>
            <span className="max-w-44 truncate font-medium text-foreground">
              {formattedDates.inferredDate}
            </span>
          </div>

          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="size-4" /> File System Created
            </span>
            <span className="max-w-44 truncate font-medium text-foreground">
              {formattedDates.fsDate}
            </span>
          </div>

          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="size-4" /> File System Updated
            </span>
            <span className="max-w-44 truncate font-medium text-foreground">
              {formattedDates.modifiedDate}
            </span>
          </div>
        </div>

        {/* Quality details */}
        {hasQuality && item.quality && (
          <div className="space-y-3">
            <h5 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Quality Score Indicators
            </h5>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Composite Score
              </span>
              <Badge
                variant={
                  item.quality.compositeScore < 50
                    ? "destructive"
                    : "secondary"
                }
                className="text-xs font-bold"
              >
                {item.quality.compositeScore} / 100
              </Badge>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Blur Check</span>
              <span
                className={`font-semibold ${item.quality.isBlurry ? "text-destructive" : "text-green-500"}`}
              >
                {item.quality.isBlurry ? "Blurry" : "Sharp"} (
                {item.quality.blurScore})
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Exposure Check
              </span>
              <span
                className={`font-semibold ${item.quality.isDark ? "text-destructive" : "text-green-500"}`}
              >
                {item.quality.isDark
                  ? "Dark / Underexposed"
                  : "Normal Exposure"}{" "}
                ({item.quality.brightness})
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Screenshot Flag
              </span>
              <span className="font-semibold text-foreground">
                {item.quality.isScreenshot ? "Yes" : "No"}
              </span>
            </div>
          </div>
        )}

        {/* Action utilities */}
        <div className="mt-auto border-t border-border pt-4">
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl border-border text-xs cursor-pointer"
            onClick={handleOpenFolder}
          >
            <FolderOpen className="h-4 w-4" />
            Show in {getFileManagerName()}
          </Button>
        </div>
      </div>
    )
  }
)

MediaPropertiesPanel.displayName = "MediaPropertiesPanel"

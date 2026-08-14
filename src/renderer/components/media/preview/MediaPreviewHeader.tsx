import React from "react"
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Maximize, Minimize, Info, X } from "lucide-react"
import { MediaKeyboardShortcuts } from "./MediaKeyboardShortcuts"

interface MediaPreviewHeaderProps {
  name: string
  path: string
  isFullscreen: boolean
  showMetaPanel: boolean
  isVideo: boolean
  hasMultipleItems: boolean
  toggleFullscreen: () => void
  toggleMetaPanel: () => void
  onClose: () => void
}

export const MediaPreviewHeader: React.FC<MediaPreviewHeaderProps> = React.memo(
  ({
    name,
    path,
    isFullscreen,
    showMetaPanel,
    isVideo,
    hasMultipleItems,
    toggleFullscreen,
    toggleMetaPanel,
    onClose,
  }) => {
    return (
      <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border p-4">
        <div className="min-w-0 pr-4">
          <DialogTitle className="truncate text-sm leading-none font-semibold">
            {name}
          </DialogTitle>
          <DialogDescription className="mt-1 truncate text-xs text-muted-foreground">
            {path}
          </DialogDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 shrink-0 rounded-lg border-border hover:bg-accent cursor-pointer ${isFullscreen ? "border-primary/45 bg-accent text-primary" : ""}`}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 shrink-0 rounded-lg border-border hover:bg-accent cursor-pointer ${showMetaPanel ? "border-primary/45 bg-accent text-primary" : ""}`}
                onClick={toggleMetaPanel}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Toggle Properties Info (I)
            </TooltipContent>
          </Tooltip>

          <MediaKeyboardShortcuts
            isVideo={isVideo}
            hasMultipleItems={hasMultipleItems}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg border-border hover:bg-accent cursor-pointer"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close Preview (Esc / Q / Z)</TooltipContent>
          </Tooltip>
        </div>
      </DialogHeader>
    )
  }
)

MediaPreviewHeader.displayName = "MediaPreviewHeader"

import React from "react"
import { Keyboard } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface MediaKeyboardShortcutsProps {
  isVideo: boolean
  hasMultipleItems: boolean
}

export const MediaKeyboardShortcuts: React.FC<MediaKeyboardShortcutsProps> = React.memo(
  ({ isVideo, hasMultipleItems }) => {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg border-border hover:bg-accent cursor-pointer"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Keyboard Shortcuts</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-68 p-3 shadow-lg">
          <PopoverHeader className="border-b border-border pb-2">
            <PopoverTitle className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Keyboard className="size-3.5 text-primary" />
              {isVideo ? "Video Shortcuts & Controls" : "Shortcuts & Controls"}
            </PopoverTitle>
            <PopoverDescription className="text-2xs text-muted-foreground">
              {isVideo ? "Playback and navigation hotkeys" : "Media preview hotkeys"}
            </PopoverDescription>
          </PopoverHeader>
          <div className="divide-y divide-border/40 text-xs">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Close Preview</span>
              <div className="flex gap-1">
                <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                  Q
                </kbd>
                <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                  Z
                </kbd>
                <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-muted-foreground">
                  Esc
                </kbd>
              </div>
            </div>

            {isVideo ? (
              <>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Play / Pause</span>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                    Space
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Seek ±5s</span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      ←
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      →
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Volume Up / Down</span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      ↑
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      ↓
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Mute / Unmute</span>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                    M
                  </kbd>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Playback Speed</span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      Shift
                    </kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      ←
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      →
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Rotate Video</span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      Ctrl
                    </kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      ←
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      →
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Zoom In / Out</span>
                  <span className="font-mono text-2xs text-muted-foreground">Scroll Wheel</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Pan Video</span>
                  <span className="font-mono text-2xs text-muted-foreground">Click + Drag</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Rotate Image</span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      Ctrl
                    </kbd>
                    <span className="text-muted-foreground">+</span>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      ←
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                      →
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Zoom In / Out</span>
                  <span className="font-mono text-2xs text-muted-foreground">Scroll Wheel</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">Pan Image</span>
                  <span className="font-mono text-2xs text-muted-foreground">Click + Drag</span>
                </div>
              </>
            )}

            {hasMultipleItems && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">Previous / Next</span>
                <div className="flex gap-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                    A
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                    D
                  </kbd>
                  {!isVideo && (
                    <>
                      <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-muted-foreground">
                        ←
                      </kbd>
                      <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-muted-foreground">
                        →
                      </kbd>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Toggle Animations / Compare</span>
              <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                T
              </kbd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Properties Info</span>
              <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                I
              </kbd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Toggle Fullscreen</span>
              <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-2xs font-bold text-foreground">
                F
              </kbd>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

MediaKeyboardShortcuts.displayName = "MediaKeyboardShortcuts"

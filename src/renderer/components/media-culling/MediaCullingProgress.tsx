import React from "react"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface MediaCullingProgressProps {
  reviewed: number
  total: number
  percentage: number
  onlyShowFlagged: boolean
  onOnlyShowFlaggedChange: (checked: boolean) => void
  onViewSummary?: () => void
}

export const MediaCullingProgress: React.FC<MediaCullingProgressProps> = ({
  reviewed,
  total,
  percentage,
  onlyShowFlagged,
  onOnlyShowFlaggedChange,
  onViewSummary,
}) => {
  return (
    <div className="mx-auto w-full max-w-xl shrink-0 px-4 pb-6">
      {/* Progress & Toggle header */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
          <div className="flex items-center gap-1.5">
            <span>Progress</span>
            <span className="font-medium text-muted-foreground/60 normal-case">
              ({reviewed} / {total})
            </span>
            {reviewed === total && total > 0 && onViewSummary && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewSummary}
                className="ml-1.5 h-5 cursor-pointer px-2 text-3xs font-semibold normal-case hover:bg-accent"
              >
                View Summary
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 tracking-normal normal-case">
            <Label
              htmlFor="progress-cull-mode"
              className="cursor-pointer text-3xs font-medium text-muted-foreground transition-colors select-none hover:text-foreground"
            >
              Focus Low-Quality & Duplicates
            </Label>
            <Switch
              id="progress-cull-mode"
              size="sm"
              checked={onlyShowFlagged}
              onCheckedChange={onOnlyShowFlaggedChange}
              className="cursor-pointer"
            />
          </div>
        </div>
        <Progress value={percentage} className="h-1 w-full bg-muted" />
      </div>
    </div>
  )
}


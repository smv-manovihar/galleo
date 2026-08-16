import React from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Trash2 } from "lucide-react"

export interface BrowseBatchBarProps {
  selectedCount: number
  totalFilteredCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onBatchReviewAction: (state: "keep" | "delete") => void
}

const BrowseBatchBarComponent: React.FC<BrowseBatchBarProps> = ({
  selectedCount,
  totalFilteredCount,
  onSelectAll,
  onClearSelection,
  onBatchReviewAction,
}) => {
  if (selectedCount <= 0) return null

  return (
    <div className="flex shrink-0 flex-col justify-between gap-3 rounded-xl border border-primary/30 bg-card/95 px-4 py-2 font-sans text-xs shadow-2xl backdrop-blur-md ring-1 ring-primary/20 sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-3 font-medium text-foreground">
        <span>
          Selected: <strong>{selectedCount}</strong> items
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 cursor-pointer rounded text-xs text-primary hover:bg-primary/10"
          onClick={onSelectAll}
        >
          {selectedCount === totalFilteredCount ? "Deselect All" : "Select All"}
        </Button>
        <span className="text-muted-foreground/30">|</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 cursor-pointer rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={onClearSelection}
        >
          Clear Selection
        </Button>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-start">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 justify-center gap-2 border-green-500/20 bg-green-500/10 text-xs text-green-600 hover:bg-green-500/20 sm:flex-none"
          onClick={() => onBatchReviewAction("keep")}
        >
          <CheckCircle2 className="size-4" />
          Mark to Keep
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 justify-center gap-2 border-destructive/20 bg-destructive/10 text-xs text-destructive hover:bg-destructive/20 sm:flex-none"
          onClick={() => onBatchReviewAction("delete")}
        >
          <Trash2 className="size-4" />
          Mark to Delete
        </Button>
      </div>
    </div>
  )
}

export const BrowseBatchBar = React.memo(BrowseBatchBarComponent)

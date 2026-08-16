import React from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, ListX } from "lucide-react"
import { formatBytes } from "../../lib/format"

export interface BrowseCommitBannerProps {
  count: number
  size: number
  isCommitting: boolean
  onCommitClick: () => void
}

const BrowseCommitBannerComponent: React.FC<BrowseCommitBannerProps> = ({
  count,
  size,
  isCommitting,
  onCommitClick,
}) => {
  if (count <= 0) return null

  return (
    <div className="flex shrink-0 animate-in items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 font-sans text-xs duration-200 fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 font-medium text-destructive dark:text-red-400">
        <AlertCircle className="size-4" />
        <span>
          You have <strong>{count}</strong> files ({formatBytes(size)}) marked
          for deletion.
        </span>
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="h-8 cursor-pointer gap-2 px-4 font-semibold"
        onClick={onCommitClick}
        disabled={isCommitting}
      >
        <ListX className="size-4" />
        Commit Deletions
      </Button>
    </div>
  )
}

export const BrowseCommitBanner = React.memo(BrowseCommitBannerComponent)

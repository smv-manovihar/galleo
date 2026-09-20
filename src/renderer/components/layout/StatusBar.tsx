import React, { useState } from "react"
import { useMediaStore } from "../../stores/media-store"
import { useSessionStore } from "../../stores/session-store"
import { useScanStore } from "../../stores/scan-store"
import {
  HardDrive,
  ListX,
  Sparkles,
} from "lucide-react"
import { formatBytes } from "../../lib/format"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { CommitConfirmDialog } from "../browse/CommitConfirmDialog"
import { toast } from "sonner"

export const StatusBar: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const getDashboardMetrics = useMediaStore((s) => s.getDashboardMetrics)
  const checkpoint = useSessionStore((s) => s.checkpoint)
  const decisions = useSessionStore((s) => s.decisions)
  const startTrashingInBackground = useSessionStore((s) => s.startTrashingInBackground)
  const isCommitting = useSessionStore((s) => s.isCommitting)
  const aiIndexingProgress = useScanStore((s) => s.aiIndexingProgress)

  const [showConfirm, setShowConfirm] = useState(false)

  const metrics = getDashboardMetrics()

  const totalBytes = metrics.totalSize
  const reviewedCount = metrics.reviewedCount
  const progressPercentage = metrics.reviewProgress

  const deleteDetails = React.useMemo(() => {
    let count = 0
    let size = 0
    const folderMap = new Map<string, { count: number; size: number }>()

    for (const item of items) {
      const state = decisions[item.id] ?? item.reviewState
      if (state === "delete") {
        count++
        size += item.size

        const lastSep = Math.max(
          item.path.lastIndexOf("/"),
          item.path.lastIndexOf("\\")
        )
        const dirPath =
          lastSep > 0 ? item.path.substring(0, lastSep) : item.path
        const curr = folderMap.get(dirPath) || { count: 0, size: 0 }
        folderMap.set(dirPath, {
          count: curr.count + 1,
          size: curr.size + item.size,
        })
      }
    }

    const folderBreakdown = Array.from(folderMap.entries())
      .map(([path, data]) => ({
        path,
        folderName: path.split(/[\\/]/).pop() || path,
        count: data.count,
        size: data.size,
      }))
      .sort((a, b) => b.size - a.size)

    return { count, size, folderBreakdown }
  }, [decisions, items])

  const handleCommit = () => {
    const deleteIds = items
      .filter((item) => (decisions[item.id] ?? item.reviewState) === "delete")
      .map((item) => item.id)

    const size = deleteDetails.size
    const count = deleteIds.length
    if (deleteIds.length > 0) {
      void startTrashingInBackground(deleteIds, "Trashing files...")
      toast.success("Trashing started", {
        id: "trashing-status-toast",
        description: `${count} file${count !== 1 ? "s" : ""} queued for trashing (${formatBytes(size)}).`,
      })
    }
    setShowConfirm(false)
  }

  return (
    <>
      <footer className="flex h-10 items-center justify-between border-t border-border bg-card/60 px-6 font-sans text-xs text-muted-foreground backdrop-blur-md select-none">
        {/* Left: Library stats + review progress */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex items-center gap-2 truncate">
            <HardDrive className="size-4 shrink-0" />
            <span>
              Library Size: {items.length} items ({formatBytes(totalBytes)})
            </span>
            {(checkpoint || reviewedCount > 0) && items.length > 0 && (
              <>
                <span className="mx-2 text-muted-foreground/30">|</span>
                <span>
                  Reviewed: {reviewedCount} / {items.length} ({progressPercentage}%)
                </span>
              </>
            )}
            {aiIndexingProgress?.isIndexing && (
              <>
                <span className="mx-2 text-muted-foreground/30">|</span>
                <span className="flex items-center gap-2 font-medium text-amber-500">
                  <Sparkles className="size-4 animate-pulse shrink-0" />
                  AI Indexing: {aiIndexingProgress.processedCount}/{aiIndexingProgress.totalCount}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Commit Deletions */}
        {deleteDetails.count > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 animate-in cursor-pointer gap-2 px-3 text-xs font-medium duration-200 fade-in"
                onClick={() => setShowConfirm(true)}
                disabled={isCommitting}
              >
                <ListX className="size-4" />
                {isCommitting ? "Committing…" : "Commit"}
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-semibold tabular-nums">
                  {deleteDetails.count}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Move {deleteDetails.count} marked file
              {deleteDetails.count !== 1 ? "s" : ""} to trash (
              {formatBytes(deleteDetails.size)})
            </TooltipContent>
          </Tooltip>
        )}
      </footer>

      {/* Confirmation Dialog with Structured Breakdown */}
      <CommitConfirmDialog
        isOpen={showConfirm}
        count={deleteDetails.count}
        size={deleteDetails.size}
        folderBreakdown={deleteDetails.folderBreakdown}
        isCommitting={isCommitting}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleCommit}
      />
    </>
  )
}

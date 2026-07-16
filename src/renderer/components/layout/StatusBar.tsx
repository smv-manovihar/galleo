import React, { useState } from "react"
import { useMediaStore } from "../../stores/media-store"
import { useSessionStore } from "../../stores/session-store"
import { HardDrive, ListX } from "lucide-react"
import { formatBytes } from "../../lib/format"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from 'sonner'

export const StatusBar: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const checkpoint = useSessionStore((s) => s.checkpoint)
  const decisions = useSessionStore((s) => s.decisions)
  const commitDeletions = useSessionStore((s) => s.commitDeletions)
  const isCommitting = useSessionStore((s) => s.isCommitting)

  const [showConfirm, setShowConfirm] = useState(false)

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0)

  const reviewedCount = items.filter(
    (item) => decisions[item.id] !== undefined || item.reviewState !== 'pending'
  ).length

  const progressPercentage = items.length > 0 ? Math.round((reviewedCount / items.length) * 100) : 0

  const deleteDetails = React.useMemo(() => {
    const itemMap = new Map(items.map(i => [i.id, i]))
    let count = 0
    let size = 0
    for (const [mediaId, state] of Object.entries(decisions)) {
      if (state === 'delete') {
        count++
        size += itemMap.get(mediaId)?.size ?? 0
      }
    }
    return { count, size }
  }, [decisions, items])

  const handleCommit = async () => {
    const deleteIds = Object.entries(decisions)
      .filter(([_, state]) => state === 'delete')
      .map(([mediaId]) => mediaId)
    const size = deleteDetails.size
    const count = deleteIds.length
    if (deleteIds.length > 0) {
      await commitDeletions(deleteIds)
      toast.success("Files moved to trash successfully", {
        description: `${count} file${count !== 1 ? 's' : ''} deleted, reclaiming ${formatBytes(size)}.`
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
            <HardDrive className="h-3.5 w-3.5" />
            <span>
              Library Size: <strong>{items.length}</strong> items (
              <strong>{formatBytes(totalBytes)}</strong>)
            </span>
            {checkpoint && items.length > 0 && (
              <>
                <span className="mx-2 text-muted-foreground/30">|</span>
                <span>
                  Reviewed: <strong>{reviewedCount}</strong> / {items.length} (
                  <strong>{progressPercentage}%</strong>)
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
                className="h-7 gap-1.5 px-2.5 text-xs font-medium animate-in fade-in duration-200"
                onClick={() => setShowConfirm(true)}
                disabled={isCommitting}
              >
                <ListX className="h-3.5 w-3.5" />
                {isCommitting ? 'Committing…' : 'Commit'}
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-semibold tabular-nums">
                  {deleteDetails.count}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Move {deleteDetails.count} marked file{deleteDetails.count !== 1 ? 's' : ''} to trash ({formatBytes(deleteDetails.size)})
            </TooltipContent>
          </Tooltip>
        )}
      </footer>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-xs font-sans">
          <div className="w-full max-w-sm border border-border bg-card p-6 rounded-xl shadow-lg select-none text-foreground">
            <div className="text-center pb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto mb-3">
                <ListX className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-sm text-foreground">Commit Deletions</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-normal">
                Move <strong>{deleteDetails.count}</strong> marked file{deleteDetails.count !== 1 ? 's' : ''} to trash,
                recovering <strong>{formatBytes(deleteDetails.size)}</strong> of space. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs"
                onClick={() => setShowConfirm(false)}
                disabled={isCommitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-9 text-xs"
                onClick={handleCommit}
                disabled={isCommitting}
              >
                {isCommitting ? 'Moving to Trash…' : 'Move to Trash'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

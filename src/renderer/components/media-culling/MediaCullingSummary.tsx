import React, { useMemo } from "react"
import { useSessionStore } from "../../stores/session-store"
import { useMediaStore } from "../../stores/media-store"
import { useUIStore } from "../../stores/ui-store"
import { Button } from "@/components/ui/button"
import {
  HardDriveDownload,
  Bookmark,
  Trash2,
  CheckCircle2,
  ListX,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react"
import { formatBytes } from "../../lib/format"
import { toast } from "sonner"

interface MediaCullingSummaryProps {
  onBackToQueue: () => void
}

export const MediaCullingSummary: React.FC<MediaCullingSummaryProps> = ({
  onBackToQueue,
}) => {
  const { decisions, commitDeletions, isCommitting } = useSessionStore()
  const items = useMediaStore((s) => s.items)
  const setCurrentView = useUIStore((s) => s.setCurrentView)

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const details = useMemo(() => {
    const keepList: string[] = []
    const deleteList: string[] = []
    let deleteBytes = 0
    for (const [mediaId, state] of Object.entries(decisions)) {
      const item = itemMap.get(mediaId)
      if (!item) continue
      if (state === "keep") keepList.push(mediaId)
      else if (state === "delete") {
        deleteList.push(mediaId)
        deleteBytes += item.size
      }
    }
    return {
      keepCount: keepList.length,
      deleteCount: deleteList.length,
      reclaimableSize: deleteBytes,
      deleteIds: deleteList,
    }
  }, [decisions, itemMap])

  const handleCommit = async () => {
    const deleteIds = Object.entries(decisions)
      .filter(([_, s]) => s === "delete")
      .map(([id]) => id)
    const size = details.reclaimableSize
    const count = deleteIds.length
    if (count > 0) {
      await commitDeletions(deleteIds)
      toast.success("Files moved to trash successfully", {
        description: `${count} file${count !== 1 ? "s" : ""} deleted, reclaiming ${formatBytes(size)}.`,
      })
    }
    setCurrentView("dashboard")
  }

  // --- Summary state ---
  return (
    <div className="flex h-full animate-in flex-col items-center justify-center px-8 font-sans duration-300 select-none fade-in">
      <div className="w-full max-w-lg space-y-4">
        {/* Header card */}
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading text-sm font-bold tracking-tight text-foreground">
              Session complete
            </h2>
          </div>
          {/* Stat tiles */}
          <div className="grid w-full grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-3">
              <div className="mb-1 flex items-center justify-center gap-1 text-2xs font-semibold tracking-wider text-green-600/70 uppercase dark:text-green-400/70">
                <Bookmark className="h-2.5 w-2.5" /> Kept
              </div>
              <div className="font-heading text-xl font-bold text-green-600 tabular-nums dark:text-green-400">
                {details.keepCount}
              </div>
            </div>
            <div className="rounded-xl border border-destructive/15 bg-destructive/5 p-3">
              <div className="mb-1 flex items-center justify-center gap-1 text-2xs font-semibold tracking-wider text-destructive/70 uppercase">
                <Trash2 className="h-2.5 w-2.5" /> Delete
              </div>
              <div className="font-heading text-xl font-bold text-destructive tabular-nums">
                {details.deleteCount}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="mb-1 flex items-center justify-center gap-1 text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                <HardDriveDownload className="h-2.5 w-2.5" /> To be freed
              </div>
              <div className="font-heading text-xl font-bold text-foreground">
                {formatBytes(details.reclaimableSize)}
              </div>
            </div>
          </div>
          {details.deleteCount > 0 && (
            <div className="flex items-center gap-1.5 pt-1 text-2xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span>Files move to system trash (recoverable).</span>
            </div>
          )}
        </div>

        {/* File list card */}


        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="h-9 flex-1 cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={onBackToQueue}
            disabled={isCommitting}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Culling
          </Button>
          {details.deleteCount > 0 && (
            <Button
              variant="destructive"
              className="h-9 flex-1 cursor-pointer gap-1.5 text-xs"
              onClick={handleCommit}
              disabled={isCommitting}
            >
              <ListX className="h-3.5 w-3.5" />
              {isCommitting
                ? "Moving to Trash..."
                : `Commit ${details.deleteCount} deletion${details.deleteCount !== 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

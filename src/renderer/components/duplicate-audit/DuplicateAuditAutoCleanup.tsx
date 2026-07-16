import React, { useMemo, useState } from "react"
import { useSessionStore } from "../../stores/session-store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Trash2, CheckCircle2, Bookmark } from "lucide-react"
import { formatBytes } from "../../lib/format"
import type { MediaItem } from "../../../shared/types/media"

interface DuplicateAuditAutoCleanupProps {
  exactDupsToDelete: MediaItem[]
  exactDupsToKeep: MediaItem[]
  duplicateGroups: MediaItem[][]
}

export const DuplicateAuditAutoCleanup: React.FC<
  DuplicateAuditAutoCleanupProps
> = ({ exactDupsToDelete, exactDupsToKeep, duplicateGroups }) => {
  const { commitDeletions } = useSessionStore()
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null)

  const totalSize = useMemo(
    () => exactDupsToDelete.reduce((acc, item) => acc + item.size, 0),
    [exactDupsToDelete]
  )

  const groups = useMemo(() => {
    return duplicateGroups
      .map((group) => {
        const keep =
          group.find((i) => i.isBestInDuplicateGroup) ||
          exactDupsToKeep.find((k) => group.some((i) => i.id === k.id)) ||
          group[0]

        const deletes = group.filter((i) =>
          exactDupsToDelete.some((d) => d.id === i.id)
        )
        if (!deletes.length) return null

        return { keep, deletes }
      })
      .filter(Boolean) as { keep: MediaItem; deletes: MediaItem[] }[]
  }, [duplicateGroups, exactDupsToDelete, exactDupsToKeep])

  const handleAutoCleanup = async () => {
    if (exactDupsToDelete.length === 0 || isCleaning) return

    setIsCleaning(true)
    setCleanSuccess(null)

    try {
      const store = useSessionStore.getState()
      const checkpoint = store.checkpoint
      if (!checkpoint) return

      const updatedDecisions = { ...store.decisions }
      const reviewsToUpdate: { mediaId: string; state: "keep" | "delete" }[] =
        []

      for (const item of exactDupsToDelete) {
        updatedDecisions[item.id] = "delete"
        reviewsToUpdate.push({ mediaId: item.id, state: "delete" })
      }

      for (const item of exactDupsToKeep) {
        updatedDecisions[item.id] = "keep"
        reviewsToUpdate.push({ mediaId: item.id, state: "keep" })
      }

      const updatedCheckpoint = {
        ...checkpoint,
        decisions: updatedDecisions,
        savedAt: new Date().toISOString(),
      }

      useSessionStore.setState({
        decisions: updatedDecisions,
        checkpoint: updatedCheckpoint,
      })

      await window.api.saveSessionCheckpoint(updatedCheckpoint)
      await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate)

      const specificIds = [
        ...exactDupsToDelete.map((i) => i.id),
        ...exactDupsToKeep.map((i) => i.id),
      ]
      const { successCount } = await commitDeletions(specificIds)

      setCleanSuccess(
        `Trashed ${successCount} files and reclaimed ${formatBytes(totalSize)}.`
      )
    } catch (e) {
      console.error("Auto cleanup failed:", e)
    } finally {
      setIsCleaning(false)
    }
  }

  if (exactDupsToDelete.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-lg border border-dashed border-border bg-card/30 p-6 text-center select-none">
        <div>
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500 opacity-80" />
          <h3 className="text-sm font-medium text-foreground">
            No Exact Duplicates Found
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing to trash in this set.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col select-none">
      {cleanSuccess && (
        <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">{cleanSuccess}</span>
          </div>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="pr-3 pb-20">
          {groups.map((group, idx) => {
            const groupReclaimSize = group.deletes.reduce(
              (acc, item) => acc + item.size,
              0
            )

            return (
              <div
                key={`${group.keep.id}-${idx}`}
                className="mb-3 overflow-hidden rounded-md border border-border bg-card text-sm shadow-sm"
              >
                {/* Slim Header */}
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Group {idx + 1}
                  </span>
                  <span className="text-2xs font-medium text-muted-foreground">
                    Reclaiming {formatBytes(groupReclaimSize)}
                  </span>
                </div>

                {/* Flat List */}
                <div className="flex flex-col divide-y divide-border/40">
                  {/* Keep Row */}
                  <div className="relative flex items-center gap-2.5 bg-green-500/5 px-3 py-2">
                    <div className="absolute inset-y-0 left-0 w-[3px] bg-green-500/70" />
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-700 dark:text-green-400">
                      <Bookmark className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate font-medium text-foreground">
                        {group.keep.name}
                      </span>
                      <span className="truncate text-2xs text-muted-foreground">
                        {group.keep.path}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatBytes(group.keep.size)}
                    </span>
                  </div>

                  {/* Delete Rows */}
                  {group.deletes.map((item) => (
                    <div
                      key={item.id}
                      className="relative flex items-center gap-2.5 bg-destructive/5 px-3 py-2"
                    >
                      <div className="absolute inset-y-0 left-0 w-[3px] bg-destructive/60" />
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                        <Trash2 className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate text-foreground opacity-90">
                          {item.name}
                        </span>
                        <span className="truncate text-2xs text-muted-foreground">
                          {item.path}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatBytes(item.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Slim Action Bar */}
      <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-md">
          <div className="flex flex-col text-center leading-tight">
            <span className="text-[13px] font-semibold text-foreground">
              {exactDupsToDelete.length} files
            </span>
            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {formatBytes(totalSize)} total
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          <Button
            onClick={handleAutoCleanup}
            disabled={isCleaning}
            size="sm"
            className="h-8 rounded-full bg-green-600 px-5 text-xs font-semibold text-white hover:bg-green-700"
          >
            {isCleaning ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Trashing...
              </>
            ) : (
              <>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Trash All
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from "react"
import { useMediaStore } from "../../stores/media-store"
import { useSessionStore } from "../../stores/session-store"
import {
  HardDrive,
  ListX,
  Folder,
  Trash2,
  ShieldCheck,
  Loader2,
} from "lucide-react"
import { formatBytes } from "../../lib/format"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export const StatusBar: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const checkpoint = useSessionStore((s) => s.checkpoint)
  const decisions = useSessionStore((s) => s.decisions)
  const commitDeletions = useSessionStore((s) => s.commitDeletions)
  const isCommitting = useSessionStore((s) => s.isCommitting)

  const [showConfirm, setShowConfirm] = useState(false)

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0)

  const reviewedCount = items.filter(
    (item) => decisions[item.id] !== undefined || item.reviewState !== "pending"
  ).length

  const progressPercentage =
    items.length > 0 ? Math.round((reviewedCount / items.length) * 100) : 0

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

  const handleCommit = async () => {
    const deleteIds = items
      .filter((item) => (decisions[item.id] ?? item.reviewState) === "delete")
      .map((item) => item.id)

    const size = deleteDetails.size
    const count = deleteIds.length
    if (deleteIds.length > 0) {
      await commitDeletions(deleteIds)
      toast.success("Files moved to trash", {
        description: `${count} file${count !== 1 ? "s" : ""} deleted, reclaiming ${formatBytes(size)}.`,
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
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
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
          </div>
        </div>

        {/* Right: Commit Deletions */}
        {deleteDetails.count > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 animate-in cursor-pointer gap-1.5 px-2.5 text-xs font-medium duration-200 fade-in"
                onClick={() => setShowConfirm(true)}
                disabled={isCommitting}
              >
                <ListX className="h-3.5 w-3.5" />
                {isCommitting ? "Committing…" : "Commit"}
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-semibold tabular-nums">
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
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl border border-border bg-card p-5 font-sans shadow-xl outline-none select-none data-[size=default]:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
                <ListX className="h-4.5 w-4.5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle className="text-sm font-bold text-foreground">
                  Commit Marked Deletions
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-0.5 text-2xs text-muted-foreground">
                  Confirm moving marked files to system trash.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Metric Summary Tiles */}
          <div className="my-1 grid grid-cols-2 gap-3">
            <div className="space-y-0.5 rounded-xl border border-destructive/15 bg-destructive/5 p-3">
              <div className="flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-destructive/80 uppercase">
                <Trash2 className="h-3 w-3 shrink-0 text-destructive" />
                <span>Files to Delete</span>
              </div>
              <div className="font-heading text-xl font-bold text-destructive tabular-nums">
                {deleteDetails.count}{" "}
                <span className="text-xs font-normal text-muted-foreground font-sans">
                  files
                </span>
              </div>
            </div>

            <div className="space-y-0.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                <HardDrive className="h-3 w-3 shrink-0 text-emerald-500" />
                <span>To be Freed</span>
              </div>
              <div className="font-heading text-xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatBytes(deleteDetails.size)}
              </div>
            </div>
          </div>

          {/* Folder Breakdown List */}
          {deleteDetails.folderBreakdown.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Affected Directories
                </span>
                <span className="text-2xs text-muted-foreground">
                  {deleteDetails.folderBreakdown.length} folder
                  {deleteDetails.folderBreakdown.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="max-h-44 scrollbar-thin space-y-1.5 overflow-y-auto rounded-lg pr-1">
                {deleteDetails.folderBreakdown.map((folder) => (
                  <div
                    key={folder.path}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 p-2.5 transition-colors hover:bg-muted/20"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground">
                        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{folder.folderName}</span>
                      </div>
                      <span
                        className="block truncate text-2xs text-muted-foreground"
                        title={folder.path}
                      >
                        {folder.path}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-xs font-semibold text-destructive tabular-nums">
                        {folder.count} {folder.count === 1 ? "file" : "files"}
                      </span>
                      <span className="block text-2xs text-muted-foreground tabular-nums">
                        {formatBytes(folder.size)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-2xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>Files move to system trash (recoverable).</span>
          </div>

          <AlertDialogFooter className="mt-2 gap-2 border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={isCommitting}
              onClick={() => setShowConfirm(false)}
              className="h-8 cursor-pointer rounded-lg text-xs font-medium"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isCommitting}
              onClick={handleCommit}
              className="h-8 cursor-pointer gap-1.5 rounded-lg text-xs font-semibold"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Moving to Trash…
                </>
              ) : (
                <>
                  <ListX className="h-3.5 w-3.5" />
                  Move {deleteDetails.count} Files to Trash
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

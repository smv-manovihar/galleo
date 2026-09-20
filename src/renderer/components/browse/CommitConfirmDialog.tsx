import React from "react"
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
import { ListX, Trash2, HardDrive, Folder, ShieldCheck, Loader2 } from "lucide-react"
import { formatBytes } from "../../lib/format"

export interface FolderBreakdownItem {
  path: string
  folderName: string
  count: number
  size: number
}

export interface CommitConfirmDialogProps {
  isOpen: boolean
  count: number
  size: number
  isCommitting: boolean
  folderBreakdown?: FolderBreakdownItem[]
  title?: string
  description?: string
  onClose: () => void
  onConfirm: () => void
}

const CommitConfirmDialogComponent: React.FC<CommitConfirmDialogProps> = ({
  isOpen,
  count,
  size,
  isCommitting,
  folderBreakdown,
  title,
  description,
  onClose,
  onConfirm,
}) => {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isCommitting) {
          onClose()
        }
      }}
    >
      <AlertDialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 font-sans shadow-xl outline-none select-none data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
        {/* Fixed Header */}
        <AlertDialogHeader className="shrink-0 border-b border-border/60 pb-3 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
              <ListX className="size-5 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-sm font-bold text-foreground">
                {title || "Commit Marked Deletions"}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-0.5 text-xs text-muted-foreground">
                {description || "Confirm moving marked files to system trash."}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Scrollable Body Container */}
        <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto py-3 pr-1">
          {/* Summary Metric Tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 rounded-xl border border-destructive/15 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-destructive/80 uppercase">
                <Trash2 className="size-3.5 shrink-0 text-destructive" />
                <span>Files to Delete</span>
              </div>
              <div className="font-heading text-lg font-bold text-destructive tabular-nums">
                {count}{" "}
                <span className="font-sans text-xs font-normal text-muted-foreground">
                  files
                </span>
              </div>
            </div>

            <div className="space-y-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                <HardDrive className="size-3.5 shrink-0 text-emerald-500" />
                <span>To be Freed</span>
              </div>
              <div className="font-heading text-lg font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatBytes(size)}
              </div>
            </div>
          </div>

          {/* Affected Directories Breakdown */}
          {folderBreakdown && folderBreakdown.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Affected Directories
                </span>
                <span className="text-xs text-muted-foreground">
                  {folderBreakdown.length} folder
                  {folderBreakdown.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="scrollbar-thin max-h-36 space-y-2 overflow-y-auto rounded-lg pr-1">
                {folderBreakdown.map((folder) => (
                  <div
                    key={folder.path}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 p-2.5 transition-colors hover:bg-muted/20"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{folder.folderName}</span>
                      </div>
                      <span
                        className="block truncate text-xs text-muted-foreground"
                        title={folder.path}
                      >
                        {folder.path}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-xs font-semibold text-destructive tabular-nums">
                        {folder.count} {folder.count === 1 ? "file" : "files"}
                      </span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {formatBytes(folder.size)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
            <span>Files move to system trash (recoverable).</span>
          </div>
        </div>

        {/* Fixed Footer */}
        <AlertDialogFooter className="shrink-0 gap-2 border-t border-border/60 pt-3 sm:justify-end">
          <AlertDialogCancel
            disabled={isCommitting}
            onClick={onClose}
            className="h-8 cursor-pointer rounded-lg text-xs font-medium"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isCommitting || count === 0}
            onClick={onConfirm}
            className="h-8 cursor-pointer gap-2 rounded-lg text-xs font-semibold"
          >
            {isCommitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Moving to Trash…
              </>
            ) : (
              <>
                <ListX className="size-4" />
                Move {count} File{count !== 1 ? "s" : ""} to Trash
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const CommitConfirmDialog = React.memo(CommitConfirmDialogComponent)

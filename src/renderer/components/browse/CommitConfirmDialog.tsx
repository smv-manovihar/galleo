import React from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { formatBytes } from "../../lib/format"

export interface CommitConfirmDialogProps {
  isOpen: boolean
  count: number
  size: number
  isCommitting: boolean
  onClose: () => void
  onConfirm: () => void
}

const CommitConfirmDialogComponent: React.FC<CommitConfirmDialogProps> = ({
  isOpen,
  count,
  size,
  isCommitting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 font-sans text-xs backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-foreground shadow-lg select-none">
        <div className="pb-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h3 className="font-heading text-sm font-bold text-foreground">
            Confirm Midway Deletion
          </h3>
          <p className="mt-1 text-xs leading-normal text-muted-foreground">
            You are about to permanently delete <strong>{count}</strong> files
            from this folder, recovering <strong>{formatBytes(size)}</strong>{" "}
            space.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="outline"
            className="h-9 flex-1 text-xs"
            onClick={onClose}
            disabled={isCommitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="h-9 flex-1 text-xs"
            onClick={onConfirm}
            disabled={isCommitting}
          >
            {isCommitting ? "Trashing..." : "Move to Trash"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const CommitConfirmDialog = React.memo(CommitConfirmDialogComponent)

import React, { useState, useMemo } from "react"
import type { MediaItem } from "../../../shared/types/media"
import type { UndoableAction } from "../../../shared/types/session"
import { Button } from "@/components/ui/button"
import { Undo2, History, Bookmark, Trash2 } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  MediaCullingHistoryDialog,
  type MediaCullingHistoryDialogItem,
} from "./MediaCullingHistoryDialog"

interface MediaCullingControlsProps {
  undoStack: UndoableAction[]
  allItems: MediaItem[]
  onUndo: () => void
  onDelete: () => void
  onKeep: () => void
  onBulkChangeDecisions: (
    mediaIds: string[],
    decision: "keep" | "delete"
  ) => Promise<void>
}

export const MediaCullingControls: React.FC<MediaCullingControlsProps> = ({
  undoStack,
  allItems,
  onUndo,
  onDelete,
  onKeep,
  onBulkChangeDecisions,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Map UndoableActions to standard MediaCullingHistoryDialogItem format
  const historyItems = useMemo<MediaCullingHistoryDialogItem[]>(() => {
    return undoStack.map((action) => {
      const item = allItems.find((i) => i.id === action.mediaId)
      return {
        id: action.id,
        mediaId: action.mediaId,
        name: item?.name ?? action.mediaId,
        thumbnailPath: item?.thumbnailPath,
        path: item?.path ?? "",
        currentDecision: (action.type === "mark-keep" ? "keep" : "delete") as
          "keep" | "delete",
      }
    })
  }, [undoStack, allItems])

  const handleSingleAction = async (
    mediaId: string,
    action: "keep" | "delete"
  ) => {
    await onBulkChangeDecisions([mediaId], action)
  }

  return (
    <>
      {/* Control Buttons Panel */}
      <div className="relative mx-auto flex h-16 w-full max-w-xl shrink-0 items-center justify-center px-4">
        {/* Fast undo — left */}
        <div className="absolute left-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 cursor-pointer rounded-full border-border bg-card text-foreground shadow-sm hover:bg-accent"
                onClick={onUndo}
                disabled={undoStack.length === 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Undo (↓ or Ctrl+Z)</TooltipContent>
          </Tooltip>
        </div>

        {/* History Dialog Trigger — right */}
        <div className="absolute right-4 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 cursor-pointer rounded-full border-border bg-card text-foreground shadow-sm hover:bg-accent"
                onClick={() => setIsHistoryOpen(true)}
                disabled={undoStack.length === 0}
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Decision History</TooltipContent>
          </Tooltip>

          <MediaCullingHistoryDialog
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            items={historyItems}
            onBulkAction={onBulkChangeDecisions}
            onSingleAction={handleSingleAction}
          />
        </div>

        {/* Delete / Keep buttons — centered */}
        <div className="flex items-center gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-600 shadow-md transition-colors duration-200 hover:bg-red-500/20 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/45"
                onClick={onDelete}
              >
                <Trash2 className="h-6 w-6 fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete (← or D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-green-500/20 bg-green-500/10 text-green-600 shadow-md transition-colors duration-200 hover:bg-green-500/20 dark:border-green-500/30 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-900/45"
                onClick={onKeep}
              >
                <Bookmark className="h-6 w-6 fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Keep (→ or K)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Keyboard shortcuts & interaction hint */}
      <p className="shrink-0 text-center text-2xs text-muted-foreground">
        Swipe or use{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono font-bold">
          ←
        </kbd>{" "}
        Delete,{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono font-bold">
          →
        </kbd>{" "}
        Keep,{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono font-bold">
          ↓
        </kbd>{" "}
        Undo
      </p>
    </>
  )
}

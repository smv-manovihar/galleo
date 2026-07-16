import React, { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bookmark, Trash2, History, X } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"

export interface MediaCullingHistoryDialogItem {
  id: string // unique entry ID
  mediaId: string
  name: string
  thumbnailPath?: string
  path: string
  currentDecision: "keep" | "delete" | "skipped" | "pending"
}

const HistoryRow = React.memo(({
  item,
  isChecked,
  isKeep,
  isDelete,
  onSingleAction,
  toggleSelect,
  translateY,
  measureRef,
}: {
  item: MediaCullingHistoryDialogItem
  isChecked: boolean
  isKeep: boolean
  isDelete: boolean
  onSingleAction: (mediaId: string, action: "keep" | "delete") => Promise<void>
  toggleSelect: (id: string) => void
  translateY: number
  measureRef: (el: HTMLElement | null) => void
}) => {
  const rowStyle = React.useMemo(() => ({
    gridTemplateColumns: "40px 56px 1fr 96px 80px",
    height: "56px",
    transform: `translateY(${translateY}px)`,
  }), [translateY])

  return (
    <div
      ref={measureRef}
      className={cn(
        "absolute top-0 left-0 w-full grid items-center hover:bg-muted/20 transition-colors border-b border-border/50 text-[0.6875rem]",
        isChecked ? "bg-accent/25" : ""
      )}
      style={rowStyle}
    >
      <div className="p-3 flex items-center justify-start">
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => toggleSelect(item.id)}
          aria-label={`Select ${item.name}`}
        />
      </div>
      <div className="p-3 flex items-center">
        <div className="h-10 w-10 rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0">
          <img
            src={`media:///${(item.thumbnailPath || item.path).replace(/\\/g, "/")}`}
            alt={item.name}
            className="h-full w-full object-cover pointer-events-none select-none"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      </div>
      <div className="p-3 font-medium truncate" title={item.name}>
        {item.name}
      </div>
      <div className="p-3">
        <Badge
          variant="outline"
          className={cn(
            "text-[0.5625rem] px-2 py-0.5 uppercase tracking-wider",
            isKeep
              ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
              : isDelete
                ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                : "bg-muted border-border text-muted-foreground"
          )}
        >
          {item.currentDecision}
        </Badge>
      </div>
      <div className="p-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {!isKeep && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-green-600 hover:bg-green-500/10 dark:text-green-400"
                  onClick={() => onSingleAction(item.mediaId, "keep")}
                >
                  <Bookmark className="h-3.5 w-3.5 fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Change to Keep</TooltipContent>
            </Tooltip>
          )}
          {!isDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-red-600 hover:bg-red-500/10 dark:text-red-400"
                  onClick={() => onSingleAction(item.mediaId, "delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Change to Delete</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
})

interface MediaCullingHistoryDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  items: MediaCullingHistoryDialogItem[]
  onBulkAction: (mediaIds: string[], action: "keep" | "delete") => Promise<void>
  onSingleAction: (mediaId: string, action: "keep" | "delete") => Promise<void>
}

export const MediaCullingHistoryDialog: React.FC<MediaCullingHistoryDialogProps> = ({
  isOpen,
  onOpenChange,
  items,
  onBulkAction,
  onSingleAction,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scrollElement, setScrollElementState] = useState<HTMLDivElement | null>(null)

  const setScrollElement = useCallback((node: HTMLDivElement | null) => {
    setScrollElementState(node)
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 56,
    overscan: 5,
  })

  // Reset selection when modal closes or items change
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set())
    }
  }, [isOpen, items])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const handleBulkApply = async (action: "keep" | "delete") => {
    const selectedMediaIds = items
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.mediaId)

    if (selectedMediaIds.length === 0) return

    await onBulkAction(selectedMediaIds, action)
    setSelectedIds(new Set())
  }

  const isAllSelected = items.length > 0 && selectedIds.size === items.length

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent width="2xl" height="lg" className="flex flex-col p-6 gap-4 outline-none">
        <DialogHeader className="shrink-0 border-b border-border pb-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <History className="h-4.5 w-4.5 text-primary" />
              Decision History
            </DialogTitle>
            <DialogDescription className="text-[0.6875rem] text-muted-foreground">
              Review your decisions in this session. Select multiple items to apply bulk actions.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Bulk operations bar */}
        {selectedIds.size > 0 && (
          <div className="shrink-0 flex items-center justify-between bg-accent/40 border border-border p-3 rounded-lg transition-all duration-200 gap-3">
            <span className="text-[0.6875rem] font-medium text-foreground px-1">
              {selectedIds.size} {selectedIds.size === 1 ? "item" : "items"} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400 hover:bg-green-500/10 text-2xs font-medium"
                onClick={() => handleBulkApply("keep")}
              >
                <Bookmark className="h-3.5 w-3.5" />
                Keep Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-2xs font-medium"
                onClick={() => handleBulkApply("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-2xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 min-h-0 flex flex-col rounded-lg border border-border bg-card/20">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground text-xs gap-2 select-none">
              <History className="h-8 w-8 text-muted-foreground opacity-30" />
              <span>No decisions made in this session yet.</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div
                className="bg-muted border-b border-border grid items-center text-[0.6875rem] font-semibold text-muted-foreground shrink-0 pr-[8px]"
                style={{ gridTemplateColumns: "40px 56px 1fr 96px 80px" }}
              >
                <div className="p-3 flex items-center justify-start">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </div>
                <div className="p-3 text-left">Preview</div>
                <div className="p-3 text-left">File Name</div>
                <div className="p-3 text-left">Decision</div>
                <div className="p-3 text-right">Actions</div>
              </div>

              {/* Scroll Container */}
              <div
                ref={setScrollElement}
                className="flex-1 min-h-0 overflow-y-auto scrollbar-thin relative"
              >
                <div
                  className="w-full relative"
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = items[virtualRow.index]
                    if (!item) return null
                    const isChecked = selectedIds.has(item.id)
                    const isKeep = item.currentDecision === "keep"
                    const isDelete = item.currentDecision === "delete"

                    return (
                      <HistoryRow
                        key={item.id}
                        item={item}
                        isChecked={isChecked}
                        isKeep={isKeep}
                        isDelete={isDelete}
                        onSingleAction={onSingleAction}
                        toggleSelect={toggleSelect}
                        translateY={virtualRow.start}
                        measureRef={rowVirtualizer.measureElement}
                      />
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

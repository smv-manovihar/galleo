import React, { useState, useCallback, useEffect, useMemo, memo } from "react"
import type { MediaItem } from "../../../shared/types/media"
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"
import { MediaPreview } from "../media/MediaPreview"
import { useMediaStore } from "../../stores/media-store"
import { resolveHistoryMediaItem } from "../../lib/history-dialog-utils"

export interface MediaCullingHistoryDialogItem {
  id: string // unique entry ID
  mediaId: string
  name: string
  thumbnailPath?: string
  path: string
  currentDecision: "keep" | "delete" | "skipped" | "pending"
  mediaItem?: MediaItem
}

const HistoryRow = memo(
  ({
    index,
    item,
    isChecked,
    isKeep,
    isDelete,
    onSingleAction,
    toggleSelect,
    onPreview,
    translateY,
    measureRef,
  }: {
    index: number
    item: MediaCullingHistoryDialogItem
    isChecked: boolean
    isKeep: boolean
    isDelete: boolean
    onSingleAction: (
      mediaId: string,
      action: "keep" | "delete"
    ) => Promise<void>
    toggleSelect: (id: string) => void
    onPreview: (item: MediaCullingHistoryDialogItem) => void
    translateY: number
    measureRef: (el: HTMLElement | null) => void
  }) => {
    const rowStyle = useMemo(
      () => ({
        gridTemplateColumns: "40px 56px 1fr 96px 80px",
        height: "56px",
        transform: `translateY(${translateY}px)`,
      }),
      [translateY]
    )

    const handleThumbnailKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onPreview(item)
      }
    }

    return (
      <div
        ref={measureRef}
        data-index={index}
        onDoubleClick={() => onPreview(item)}
        className={cn(
          "absolute top-0 left-0 grid w-full items-center border-b border-border/50 text-xs transition-colors hover:bg-muted/20",
          isChecked ? "bg-accent/25" : ""
        )}
        style={rowStyle}
      >
        <div className="flex items-center justify-start p-3">
          <Checkbox
            checked={isChecked}
            onCheckedChange={() => toggleSelect(item.id)}
            aria-label={`Select ${item.name}`}
          />
        </div>
        <div className="flex items-center p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="group relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/40 transition-all hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onPreview(item)}
                onKeyDown={handleThumbnailKeyDown}
                aria-label={`Preview ${item.name}`}
              >
                <img
                  src={`media:///${(item.thumbnailPath || item.path).replace(/\\/g, "/")}`}
                  alt={item.name}
                  className="pointer-events-none h-full w-full object-cover select-none transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Click to preview</TooltipContent>
          </Tooltip>
        </div>
        <button
          type="button"
          onClick={() => onPreview(item)}
          className="truncate p-3 text-left font-medium text-foreground transition-colors hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:underline"
          title={item.name}
        >
          {item.name}
        </button>
        <div className="p-3">
          <Badge
            variant="outline"
            className={cn(
              "px-2 py-0.5 text-xs tracking-wider uppercase",
              isKeep
                ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
                : isDelete
                  ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                  : "border-border bg-muted text-muted-foreground"
            )}
          >
            {item.currentDecision}
          </Badge>
        </div>
        <div className="p-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {!isKeep && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-green-600 hover:bg-green-500/10 dark:text-green-400"
                    onClick={() => onSingleAction(item.mediaId, "keep")}
                  >
                    <Bookmark className="size-4 fill-current" />
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
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Change to Delete</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    )
  }
)

interface MediaCullingHistoryDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  items: MediaCullingHistoryDialogItem[]
  onBulkAction: (mediaIds: string[], action: "keep" | "delete") => Promise<void>
  onSingleAction: (mediaId: string, action: "keep" | "delete") => Promise<void>
}

export const MediaCullingHistoryDialog: React.FC<
  MediaCullingHistoryDialogProps
> = ({ isOpen, onOpenChange, items, onBulkAction, onSingleAction }) => {
  const storeItems = useMediaStore((s) => s.items)
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scrollElement, setScrollElementState] =
    useState<HTMLDivElement | null>(null)

  const setScrollElement = useCallback((node: HTMLDivElement | null) => {
    setScrollElementState(node)
  }, [])

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 56,
    overscan: 5,
  })

  const previewMediaList = useMemo(
    () => items.map((i) => resolveHistoryMediaItem(i, storeItems)),
    [items, storeItems]
  )

  const handlePreview = useCallback(
    (item: MediaCullingHistoryDialogItem) => {
      setPreviewItem(resolveHistoryMediaItem(item, storeItems))
    },
    [storeItems]
  )

  // Reset selection and preview when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set())
      setPreviewItem(null)
    }
  }, [isOpen])

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
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          width="2xl"
          height="lg"
          className="flex flex-col gap-4 p-6 outline-none"
        >
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border pb-4">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <History className="size-5 text-primary" />
                Decision History
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Review your decisions in this session. Select multiple items to
                apply bulk actions.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Bulk operations bar */}
          {selectedIds.size > 0 && (
            <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-accent/40 p-3 transition-all duration-200">
              <span className="px-1 text-xs font-medium text-foreground">
                {selectedIds.size} {selectedIds.size === 1 ? "item" : "items"}{" "}
                selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border-green-500/20 bg-green-500/5 text-xs font-medium text-green-600 hover:bg-green-500/10 dark:text-green-400"
                  onClick={() => handleBulkApply("keep")}
                >
                  <Bookmark className="size-4" />
                  Keep Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border-red-500/20 bg-red-500/5 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                  onClick={() => handleBulkApply("delete")}
                >
                  <Trash2 className="size-4" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="mr-1 size-4" />
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
          {/* Content list */}
          <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card/20">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-xs text-muted-foreground select-none">
                <History className="h-8 w-8 text-muted-foreground opacity-30" />
                <span>No decisions made in this session yet.</span>
              </div>
            ) : (
              <>
                {/* Header */}
                <div
                  className="grid shrink-0 items-center border-b border-border bg-muted pr-2 text-xs font-semibold text-muted-foreground"
                  style={{ gridTemplateColumns: "40px 56px 1fr 96px 80px" }}
                >
                  <div className="flex items-center justify-start p-3">
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
                  className="relative min-h-0 flex-1 scrollbar-thin overflow-y-auto"
                >
                  <div
                    className="relative w-full"
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
                          index={virtualRow.index}
                          item={item}
                          isChecked={isChecked}
                          isKeep={isKeep}
                          isDelete={isDelete}
                          onSingleAction={onSingleAction}
                          toggleSelect={toggleSelect}
                          onPreview={handlePreview}
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

      <MediaPreview
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        items={previewMediaList}
        onItemChange={(item) => setPreviewItem(item)}
      />
    </>
  )
}


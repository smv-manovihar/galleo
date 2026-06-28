import React, { useState } from "react"
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
import { Check, Trash2, History, X } from "lucide-react"

export interface HistoryDialogItem {
  id: string // unique entry ID
  mediaId: string
  name: string
  thumbnailPath?: string
  path: string
  currentDecision: "keep" | "delete" | "skipped" | "pending"
}

interface HistoryDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  items: HistoryDialogItem[]
  onBulkAction: (mediaIds: string[], action: "keep" | "delete") => Promise<void>
  onSingleAction: (mediaId: string, action: "keep" | "delete") => Promise<void>
}

export const HistoryDialog: React.FC<HistoryDialogProps> = ({
  isOpen,
  onOpenChange,
  items,
  onBulkAction,
  onSingleAction,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Reset selection when modal closes or items change
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set())
    }
  }, [isOpen, items])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

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
                <Check className="h-3.5 w-3.5" />
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
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin rounded-lg border border-border bg-card/20">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground text-xs gap-2 select-none">
              <History className="h-8 w-8 text-muted-foreground opacity-30" />
              <span>No decisions made in this session yet.</span>
            </div>
          ) : (
            <table className="w-full border-collapse text-[0.6875rem] text-foreground">
              <thead className="sticky top-0 bg-muted/95 backdrop-blur-md border-b border-border z-10">
                <tr>
                  <th className="p-3 text-left w-10">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="p-3 text-left w-14">Preview</th>
                  <th className="p-3 text-left">File Name</th>
                  <th className="p-3 text-left w-24">Decision</th>
                  <th className="p-3 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((item) => {
                  const isChecked = selectedIds.has(item.id)
                  const isKeep = item.currentDecision === "keep"
                  const isDelete = item.currentDecision === "delete"

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isChecked ? "bg-accent/25" : ""
                      }`}
                    >
                      <td className="p-3 text-left">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                      <td className="p-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0">
                          <img
                            src={`media:///${(item.thumbnailPath || item.path).replace(/\\/g, "/")}`}
                            alt={item.name}
                            className="h-full w-full object-cover pointer-events-none select-none"
                            onError={(e) => {
                              // fallback if image fails to render
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-3 font-medium truncate max-w-[200px]" title={item.name}>
                        {item.name}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[0.5625rem] px-2 py-0.5 uppercase tracking-wider ${
                            isKeep
                              ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                              : isDelete
                                ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                                : "bg-muted border-border text-muted-foreground"
                          }`}
                        >
                          {item.currentDecision}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isKeep && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Change to Keep"
                              className="h-7 w-7 rounded-full text-green-600 hover:bg-green-500/10 dark:text-green-400"
                              onClick={() => onSingleAction(item.mediaId, "keep")}
                            >
                              <Check className="h-3.5 w-3.5 stroke-[2.5px]" />
                            </Button>
                          )}
                          {!isDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Change to Delete"
                              className="h-7 w-7 rounded-full text-red-600 hover:bg-red-500/10 dark:text-red-400"
                              onClick={() => onSingleAction(item.mediaId, "delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

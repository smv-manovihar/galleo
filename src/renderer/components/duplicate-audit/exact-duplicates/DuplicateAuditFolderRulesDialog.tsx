import React, { useState, useMemo, useEffect } from "react"
import type { FolderRuleType } from "./types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover"
import {
  SlidersHorizontal,
  Bookmark,
  Trash2,
  Folder,
  Search,
  Info,
} from "lucide-react"

interface DuplicateAuditFolderRulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableFolders: string[]
  folderItemCounts: Map<string, number>
  preferredKeepFolderPaths?: string[]
  preferredDeleteFolderPaths?: string[]
  onApplyRules: (keepPaths: string[], deletePaths: string[]) => void
}

export const DuplicateAuditFolderRulesDialog: React.FC<
  DuplicateAuditFolderRulesDialogProps
> = ({
  open,
  onOpenChange,
  availableFolders,
  folderItemCounts,
  preferredKeepFolderPaths,
  preferredDeleteFolderPaths,
  onApplyRules,
}) => {
  const [folderRules, setFolderRules] = useState<Record<string, FolderRuleType>>({})
  const [activeFilter, setActiveFilter] = useState<"all" | "keep" | "delete" | "off">("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Initialize rules when dialog opens
  useEffect(() => {
    if (open) {
      const rules: Record<string, FolderRuleType> = {}
      for (const f of preferredKeepFolderPaths ?? []) {
        rules[f] = "keep"
      }
      for (const f of preferredDeleteFolderPaths ?? []) {
        rules[f] = "delete"
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFolderRules(rules)
      setSearchQuery("")
      setActiveFilter("all")
    }
  }, [open, preferredKeepFolderPaths, preferredDeleteFolderPaths])

  const ruleCounts = useMemo(() => {
    let keep = 0
    let del = 0
    for (const rule of Object.values(folderRules)) {
      if (rule === "keep") keep++
      if (rule === "delete") del++
    }
    const off = availableFolders.length - (keep + del)
    return { keep, del, off, total: availableFolders.length }
  }, [folderRules, availableFolders])

  const filteredFolders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return availableFolders.filter((f) => {
      if (q && !f.toLowerCase().includes(q)) return false
      const rule = folderRules[f] ?? "off"
      if (activeFilter === "keep") return rule === "keep"
      if (activeFilter === "delete") return rule === "delete"
      if (activeFilter === "off") return rule === "off"
      return true
    })
  }, [availableFolders, searchQuery, folderRules, activeFilter])

  const setSingleFolderRule = (folder: string, rule: FolderRuleType) => {
    setFolderRules((prev) => {
      const next = { ...prev }
      if (rule === "off") {
        delete next[folder]
      } else {
        next[folder] = rule
      }
      return next
    })
  }

  const handleApply = () => {
    onOpenChange(false)
    const keepPaths: string[] = []
    const deletePaths: string[] = []
    for (const [folder, rule] of Object.entries(folderRules)) {
      if (rule === "keep") keepPaths.push(folder)
      if (rule === "delete") deletePaths.push(folder)
    }
    onApplyRules(keepPaths, deletePaths)
  }

  const handleClearAll = () => {
    setFolderRules({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        width="lg"
        height="lg"
        className="flex flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-border px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <DialogTitle className="text-sm font-semibold">
              Configure Folder Priority Rules
            </DialogTitle>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <Info className="size-4" />
                  <span className="sr-only">Folder rules info</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="w-80 space-y-2 p-4 select-none"
              >
                <PopoverHeader>
                  <PopoverTitle className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Info className="size-4 text-sky-500" />
                    <span>How Folder Rules Work</span>
                  </PopoverTitle>
                  <PopoverDescription className="text-xs text-muted-foreground">
                    Assign rules to folders to control automated duplicate cleanup.
                  </PopoverDescription>
                </PopoverHeader>

                <div className="space-y-2 border-t border-border/50 pt-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <strong className="font-semibold text-foreground">Keep:</strong>{" "}
                      Always preserves copies in this folder.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-destructive" />
                    <div>
                      <strong className="font-semibold text-foreground">Delete:</strong>{" "}
                      Always trashes copies in this folder.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50" />
                    <div>
                      <strong className="font-semibold text-foreground">Default:</strong>{" "}
                      Follows baseline strategy (Oldest, Newest, Most Grouped).
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-2 text-xs font-medium text-muted-foreground">
                  Priority:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Keep</span>{" "}
                  &gt;{" "}
                  <span className="font-semibold text-destructive">Delete</span>{" "}
                  &gt;{" "}
                  <span className="font-semibold text-foreground">Baseline</span>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Set automatic Keep or Delete rules per folder. Folders set to Default will follow the baseline strategy.
          </DialogDescription>
        </DialogHeader>

        {/* Filter bar & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-5 py-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                activeFilter === "all"
                  ? "border border-border bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({ruleCounts.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("keep")}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                activeFilter === "keep"
                  ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark className="h-3 w-3 text-emerald-500" />
              <span>Keep ({ruleCounts.keep})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("delete")}
              className={`flex cursor-pointer items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                activeFilter === "delete"
                  ? "border border-destructive/30 bg-destructive/15 text-destructive shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
              <span>Delete ({ruleCounts.del})</span>
            </button>
          </div>

          <div className="relative w-48">
            <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 scrollbar-thin space-y-2 overflow-y-auto p-4">
          {filteredFolders.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
              No matching folders found.
            </div>
          ) : (
            filteredFolders.map((folder) => {
              const rule = folderRules[folder] ?? "off"
              const count = folderItemCounts.get(folder) ?? 0

              return (
                <div
                  key={folder}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-xs transition-colors select-none ${
                    rule === "keep"
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                      : rule === "delete"
                        ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10"
                        : "border-border/60 bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Folder
                      className={`h-4 w-4 shrink-0 ${
                        rule === "keep"
                          ? "text-emerald-500"
                          : rule === "delete"
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate font-medium text-foreground">
                        {folder}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "duplicate file" : "duplicate files"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setSingleFolderRule(folder, "keep")}
                      className={`flex cursor-pointer items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                        rule === "keep"
                          ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 shadow-2xs dark:text-emerald-300"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Bookmark className="size-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Keep</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSingleFolderRule(folder, "delete")}
                      className={`flex cursor-pointer items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                        rule === "delete"
                          ? "border border-destructive/40 bg-destructive/15 text-destructive shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Trash2 className="size-3 text-destructive" />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSingleFolderRule(folder, "off")}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                        rule === "off"
                          ? "border border-border bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground/70 hover:text-foreground"
                      }`}
                    >
                      Default
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={handleClearAll}
            className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear all folder rules
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 bg-primary text-xs font-medium text-primary-foreground"
            >
              Apply Folder Rules
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

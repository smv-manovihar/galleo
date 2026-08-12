import React, { useMemo, useState, useCallback } from "react"
import { useSessionStore } from "../../stores/session-store"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Trash2,
  CheckCircle2,
  Bookmark,
  ArrowLeftRight,
  X,
} from "lucide-react"
import { formatBytes } from "../../lib/format"
import type { MediaItem } from "../../../shared/types/media"
import type { DuplicateStrategy } from "../../../shared/types/settings"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { useVirtualizer } from "@tanstack/react-virtual"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover"
import { Folder, Search, SlidersHorizontal, Info } from "lucide-react"

const STRATEGY_OPTIONS: {
  value: DuplicateStrategy
  label: string
  description: string
}[] = [
  {
    value: "keep_oldest",
    label: "Oldest",
    description: "Keep earliest capture date",
  },
  {
    value: "keep_newest",
    label: "Newest",
    description: "Keep latest capture date",
  },
  {
    value: "keep_most_grouped",
    label: "Most Grouped",
    description: "Keep copy in folder with most photos",
  },
  {
    value: "keep_shortest_path",
    label: "Shortest Path",
    description: "Keep shortest file path",
  },
]

interface DuplicateAuditGroupCardProps {
  group: {
    keep: MediaItem
    deletes: MediaItem[]
    groupIdx: number
  }
  hasOverride: boolean
  onSwapKeep: (groupIdx: number, newKeepId: string) => void
  onResetOverride: (groupIdx: number) => void
  measureRef: (el: HTMLElement | null) => void
  style: React.CSSProperties
  index: number
}

const getDirPath = (filePath: string) => {
  return filePath.replace(/\\/g, "/").split("/").slice(0, -1).join("/")
}

const areEqual = (
  prevProps: DuplicateAuditGroupCardProps,
  nextProps: DuplicateAuditGroupCardProps
) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.hasOverride === nextProps.hasOverride &&
    prevProps.group.keep.id === nextProps.group.keep.id &&
    prevProps.group.deletes.length === nextProps.group.deletes.length &&
    prevProps.group.deletes.every(
      (item, i) => item.id === nextProps.group.deletes[i]?.id
    ) &&
    prevProps.style.transform === nextProps.style.transform &&
    prevProps.style.height === nextProps.style.height
  )
}

const DuplicateAuditGroupCard = React.memo<DuplicateAuditGroupCardProps>(
  ({
    group,
    hasOverride,
    onSwapKeep,
    onResetOverride,
    measureRef,
    style,
    index,
  }) => {
    const groupReclaimSize = group.deletes.reduce(
      (acc, item) => acc + item.size,
      0
    )

    return (
      <div ref={measureRef} data-index={index} style={style}>
        <div className="overflow-hidden rounded-md border border-border bg-card text-sm shadow-sm">
          {/* Slim Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              Group {group.groupIdx + 1}
              {hasOverride && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onResetOverride(group.groupIdx)
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
                    >
                      <span>Manual selection</span>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Click to reset to default strategy selection
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-2xs font-semibold text-amber-600 select-text dark:bg-amber-500/20 dark:text-amber-400">
              Reclaiming {formatBytes(groupReclaimSize)}
            </span>
          </div>

          {/* Flat List */}
          <div className="flex flex-col divide-y divide-border/40">
            {/* Keep Row */}
            <div className="relative flex items-center gap-2.5 bg-green-500/5 px-3 py-2">
              <div className="absolute inset-y-0 left-0 w-[3px] bg-green-500/70" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-700 dark:text-green-400">
                    <Bookmark className="h-3 w-3" strokeWidth={3} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  This copy will be kept
                </TooltipContent>
              </Tooltip>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate font-medium text-foreground">
                  {group.keep.name}
                </span>
                <span className="truncate text-2xs text-muted-foreground">
                  {getDirPath(group.keep.path)}
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
                onClick={() => onSwapKeep(group.groupIdx, item.id)}
                className="group/deleterow relative flex cursor-pointer items-center gap-2.5 bg-destructive/5 px-3 py-2 transition-all select-none hover:bg-amber-500/5"
              >
                <div className="absolute inset-y-0 left-0 w-[3px] bg-destructive/60 transition-colors group-hover/deleterow:bg-amber-500/60" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive transition-colors group-hover/deleterow:bg-amber-500/20 group-hover/deleterow:text-amber-600">
                      <Trash2
                        className="block h-2.5 w-2.5 group-hover/deleterow:hidden"
                        strokeWidth={2.5}
                      />
                      <ArrowLeftRight
                        className="hidden h-2.5 w-2.5 group-hover/deleterow:block"
                        strokeWidth={2.5}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    To be trashed (click to keep this copy instead)
                  </TooltipContent>
                </Tooltip>
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-foreground opacity-90 transition-colors group-hover/deleterow:text-amber-700 dark:group-hover/deleterow:text-amber-400">
                    {item.name}
                  </span>
                  <span className="truncate text-2xs text-muted-foreground">
                    {getDirPath(item.path)}
                  </span>
                </div>

                {/* Centered Keep Indicator */}
                <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/deleterow:opacity-100">
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-2xs font-semibold text-amber-600 shadow-sm backdrop-blur-xs dark:bg-amber-500/20 dark:text-amber-400">
                    <ArrowLeftRight className="h-3 w-3" />
                    Keep this copy instead
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatBytes(item.size)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  areEqual
)

interface DuplicateAuditExactDuplicatesProps {
  exactDupsToDelete: MediaItem[]
  exactDupsToKeep: MediaItem[]
  duplicateGroups: MediaItem[][]
  strategy: DuplicateStrategy
  preferredKeepFolderPaths?: string[]
  preferredDeleteFolderPaths?: string[]
  onStrategyChange: (
    s: DuplicateStrategy,
    keepPaths?: string[],
    deletePaths?: string[]
  ) => void
}

export const DuplicateAuditExactDuplicates: React.FC<
  DuplicateAuditExactDuplicatesProps
> = ({
  exactDupsToDelete,
  exactDupsToKeep,
  duplicateGroups,
  strategy,
  preferredKeepFolderPaths,
  preferredDeleteFolderPaths,
  onStrategyChange,
}) => {
  const { startTrashingInBackground } = useSessionStore()
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null)

  const [scrollElement, setScrollElementState] =
    useState<HTMLDivElement | null>(null)

  const setScrollElement = useCallback((node: HTMLDivElement | null) => {
    setScrollElementState(node)
  }, [])

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  type RuleType = "keep" | "delete" | "off"
  const [folderRules, setFolderRules] = useState<Record<string, RuleType>>({})
  const [activeFilter, setActiveFilter] = useState<
    "all" | "keep" | "delete" | "off"
  >("all")
  const [searchQuery, setSearchQuery] = useState("")

  const { availableFolders, folderItemCounts } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const group of duplicateGroups) {
      for (const item of group) {
        const dir = getDirPath(item.path)
        counts.set(dir, (counts.get(dir) ?? 0) + 1)
      }
    }
    const folders = Array.from(counts.keys()).sort()
    return { availableFolders: folders, folderItemCounts: counts }
  }, [duplicateGroups])

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
    return availableFolders.filter((f) => {
      if (searchQuery.trim()) {
        if (!f.toLowerCase().includes(searchQuery.toLowerCase())) return false
      }
      const rule = folderRules[f] ?? "off"
      if (activeFilter === "keep") return rule === "keep"
      if (activeFilter === "delete") return rule === "delete"
      if (activeFilter === "off") return rule === "off"
      return true
    })
  }, [availableFolders, searchQuery, folderRules, activeFilter])

  const handleOpenDialog = () => {
    const rules: Record<string, RuleType> = {}
    for (const f of preferredKeepFolderPaths ?? []) {
      rules[f] = "keep"
    }
    for (const f of preferredDeleteFolderPaths ?? []) {
      rules[f] = "delete"
    }
    setFolderRules(rules)
    setSearchQuery("")
    setActiveFilter("all")
    setIsFolderDialogOpen(true)
  }

  const setSingleFolderRule = (folder: string, rule: RuleType) => {
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

  const handleApplyRules = () => {
    setIsFolderDialogOpen(false)
    const keepPaths: string[] = []
    const deletePaths: string[] = []
    for (const [folder, rule] of Object.entries(folderRules)) {
      if (rule === "keep") keepPaths.push(folder)
      if (rule === "delete") deletePaths.push(folder)
    }
    onStrategyChange("folder_rules", keepPaths, deletePaths)
  }

  // Per-group overrides: groupIndex -> overrideKeepId chosen by the user
  const [overrides, setOverrides] = useState<Map<number, string>>(new Map())

  // Optimistically tracks IDs that have been trashed so they disappear immediately
  const [trashedIds, setTrashedIds] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    return duplicateGroups
      .map((group, idx) => {
        // Optimistically hide any group that has already been trashed
        const visibleGroup = trashedIds.size > 0
          ? group.filter((i) => !trashedIds.has(i.id))
          : group
        if (visibleGroup.length < 2) return null

        const overrideKeepId = overrides.get(idx)

        const keep = overrideKeepId
          ? (visibleGroup.find((i) => i.id === overrideKeepId) ?? visibleGroup[0])
          : exactDupsToKeep.find((k) => visibleGroup.some((i) => i.id === k.id)) ||
            visibleGroup.find((i) => i.isBestInDuplicateGroup) ||
            visibleGroup[0]

        const deletes = visibleGroup.filter((i) => i.id !== keep.id)
        if (!deletes.length) return null

        return { keep, deletes, groupIdx: idx }
      })
      .filter(Boolean) as {
      keep: MediaItem
      deletes: MediaItem[]
      groupIdx: number
    }[]
  }, [duplicateGroups, exactDupsToKeep, overrides, trashedIds])

  const rowVirtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 140,
    overscan: 5,
  })

  const handleSwapKeep = useCallback((groupIdx: number, newKeepId: string) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(groupIdx, newKeepId)
      return next
    })
  }, [])

  const handleResetOverride = useCallback((groupIdx: number) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      next.delete(groupIdx)
      return next
    })
  }, [])

  const handleAutoCleanup = async () => {
    if (groups.length === 0 || isCleaning) return

    setIsCleaning(true)
    setCleanSuccess(null)

    try {
      const store = useSessionStore.getState()
      const checkpoint = store.checkpoint
      if (!checkpoint) return

      const updatedDecisions = { ...store.decisions }
      const reviewsToUpdate: { mediaId: string; state: "keep" | "delete" }[] =
        []

      // Build keep/delete sets from the (possibly overridden) resolved groups
      const resolvedKeepIds = new Set(groups.map((g) => g.keep.id))
      const resolvedDeleteIds = new Set(
        groups.flatMap((g) => g.deletes.map((d) => d.id))
      )

      for (const id of resolvedDeleteIds) {
        updatedDecisions[id] = "delete"
        reviewsToUpdate.push({ mediaId: id, state: "delete" })
      }
      for (const id of resolvedKeepIds) {
        updatedDecisions[id] = "keep"
        reviewsToUpdate.push({ mediaId: id, state: "keep" })
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

      const specificIds = [...resolvedDeleteIds, ...resolvedKeepIds]
      const reclaimedSize = groups.reduce(
        (acc, g) => acc + g.deletes.reduce((s, d) => s + d.size, 0),
        0
      )

      // Immediately hide trashed items from the list before the store re-propagates
      setTrashedIds(resolvedDeleteIds)
      setOverrides(new Map())

      setCleanSuccess(
        `Trashing ${resolvedDeleteIds.size} files in background (${formatBytes(reclaimedSize)} reclaimed).`
      )

      void startTrashingInBackground(specificIds, "Trashing duplicates...")
    } catch (e) {
      console.error("Auto cleanup failed:", e)
    } finally {
      setIsCleaning(false)
    }
  }

  if (exactDupsToDelete.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center select-none font-sans animate-in fade-in duration-300">
        <div className="w-full max-w-md space-y-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-sm font-bold tracking-tight text-foreground">
                Exact Duplicates Cleaned
              </h3>
              <p className="text-2xs text-muted-foreground">
                No exact file matches remaining in this folder.
              </p>
            </div>

            {cleanSuccess ? (
              <div className="w-full rounded-lg border border-green-500/30 bg-green-500/10 px-3.5 py-2.5 text-2xs font-medium text-green-700 dark:text-green-400">
                {cleanSuccess}
              </div>
            ) : (
              <div className="w-full rounded-lg border border-border bg-muted/20 px-3.5 py-2.5 text-2xs text-muted-foreground">
                All exact file copies have been processed or resolved. You can switch to the <strong className="font-semibold text-foreground">Similar Media</strong> tab to review photos with visual differences.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const totalReclaimSize = groups.reduce(
    (acc, g) => acc + g.deletes.reduce((s, d) => s + d.size, 0),
    0
  )
  const totalDeleteCount = groups.reduce((acc, g) => acc + g.deletes.length, 0)

  return (
    <div className="relative flex h-full min-h-0 flex-col select-none">
      {/* Strategy pill selector */}
      <div className="-mt-3 mb-3 flex shrink-0 flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="text-2xs font-medium text-muted-foreground">
          Auto-keep:
        </span>
        {STRATEGY_OPTIONS.map((opt) => (
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onStrategyChange(opt.value)}
                className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-2xs font-medium transition-colors ${
                  strategy === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{opt.description}</TooltipContent>
          </Tooltip>
        ))}

        {availableFolders.length > 0 &&
          (() => {
            const keepCount = preferredKeepFolderPaths?.length ?? 0
            const deleteCount = preferredDeleteFolderPaths?.length ?? 0
            const totalRuleCount = keepCount + deleteCount
            const hasActiveFolderRules =
              strategy === "folder_rules" ||
              strategy === "keep_preferred_folder" ||
              strategy === "delete_preferred_folder" ||
              totalRuleCount > 0

            return (
              <>
                <div className="mx-1 h-3.5 w-px bg-border" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleOpenDialog}
                      className={`group flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-0.5 text-2xs font-medium transition-all duration-200 select-none ${
                        hasActiveFolderRules
                          ? "border-primary/40 bg-primary/10 text-foreground shadow-2xs hover:border-primary/50 hover:bg-primary/15"
                          : "border-border/80 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <SlidersHorizontal
                        className={`h-3 w-3 transition-transform duration-200 group-hover:scale-110 ${
                          hasActiveFolderRules
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span>Folder Rules</span>

                      {totalRuleCount > 0 && (
                        <div className="ml-0.5 flex items-center gap-1">
                          {keepCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              {keepCount}
                            </span>
                          )}
                          {deleteCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.2 text-[9px] font-bold text-destructive">
                              {deleteCount}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Configure automated keep and delete rules by target folder
                  </TooltipContent>
                </Tooltip>
              </>
            )
          })()}
      </div>

      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
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

              {/* Popover "i" Info Trigger Button */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span className="sr-only">Folder rules info</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-80 space-y-2 p-3.5 select-none"
                >
                  <PopoverHeader>
                    <PopoverTitle className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Info className="h-3.5 w-3.5 text-sky-500" />
                      <span>How Folder Rules Work</span>
                    </PopoverTitle>
                    <PopoverDescription className="text-2xs text-muted-foreground">
                      Assign rules to folders to control automated duplicate
                      cleanup.
                    </PopoverDescription>
                  </PopoverHeader>

                  <div className="space-y-1.5 border-t border-border/50 pt-1.5 text-2xs">
                    <div className="flex items-start gap-1.5">
                      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <div>
                        <strong className="font-semibold text-foreground">
                          Keep:
                        </strong>{" "}
                        Always preserves photos in this folder.
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-destructive" />
                      <div>
                        <strong className="font-semibold text-foreground">
                          Delete:
                        </strong>{" "}
                        Always trashes photos in this folder.
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50" />
                      <div>
                        <strong className="font-semibold text-foreground">
                          Default:
                        </strong>{" "}
                        Follows baseline strategy (Oldest, Newest, Most
                        Grouped).
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-1.5 text-2xs font-medium text-muted-foreground">
                    Priority:{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Keep
                    </span>{" "}
                    &gt;{" "}
                    <span className="font-semibold text-destructive">
                      Delete
                    </span>{" "}
                    &gt;{" "}
                    <span className="font-semibold text-foreground">
                      Baseline
                    </span>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <DialogDescription className="text-2xs text-muted-foreground">
              Set automatic Keep or Delete rules per folder. Folders set to
              Default will follow the baseline strategy.
            </DialogDescription>
          </DialogHeader>



          {/* Quick Filter Bar & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-5 py-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-2xs font-semibold transition-colors ${
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
                className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-2xs font-semibold transition-colors ${
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
                className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-2xs font-semibold transition-colors ${
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
                className="h-7 pl-7 text-2xs"
              />
            </div>
          </div>

          {/* Scrollable Folder Rules List */}
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
                    className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-xs transition-colors select-none ${
                      rule === "keep"
                        ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                        : rule === "delete"
                          ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10"
                          : "border-border/60 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
                        <span className="text-2xs text-muted-foreground">
                          {count}{" "}
                          {count === 1 ? "duplicate file" : "duplicate files"}
                        </span>
                      </div>
                    </div>

                    {/* 3-way segmented action selector */}
                    <div className="flex shrink-0 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
                      <button
                        type="button"
                        onClick={() => setSingleFolderRule(folder, "keep")}
                        className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-2xs font-semibold transition-all ${
                          rule === "keep"
                            ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 shadow-2xs dark:text-emerald-300"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Bookmark className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Keep</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSingleFolderRule(folder, "delete")}
                        className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-2xs font-semibold transition-all ${
                          rule === "delete"
                            ? "border border-destructive/40 bg-destructive/15 text-destructive shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Trash2 className="h-2.5 w-2.5 text-destructive" />
                        <span>Delete</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSingleFolderRule(folder, "off")}
                        className={`cursor-pointer rounded-md px-2 py-1 text-2xs font-medium transition-all ${
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
              onClick={() => setFolderRules({})}
              className="cursor-pointer text-2xs text-muted-foreground underline hover:text-foreground"
            >
              Clear all folder rules
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFolderDialogOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyRules}
                className="h-8 bg-primary text-xs font-medium text-primary-foreground"
              >
                Apply Folder Rules
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cleanSuccess && (
        <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">{cleanSuccess}</span>
          </div>
        </div>
      )}

      <div
        ref={setScrollElement}
        className="relative min-h-0 flex-1 scrollbar-thin overflow-y-auto pr-3"
      >
        <div
          className="relative w-full"
          style={{
            height: `${rowVirtualizer.getTotalSize() + 80}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const group = groups[virtualRow.index]
            if (!group) return null
            const hasOverride = overrides.has(group.groupIdx)

            return (
              <DuplicateAuditGroupCard
                key={virtualRow.key}
                index={virtualRow.index}
                group={group}
                hasOverride={hasOverride}
                onSwapKeep={handleSwapKeep}
                onResetOverride={handleResetOverride}
                measureRef={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: "12px",
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Slim Action Bar */}
      <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-md">
          <div className="flex flex-col text-center leading-tight">
            <span className="text-[13px] font-semibold text-foreground">
              {totalDeleteCount} files
            </span>
            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {formatBytes(totalReclaimSize)} total
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          <Button
            onClick={handleAutoCleanup}
            disabled={isCleaning || totalDeleteCount === 0}
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

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

interface DuplicateAuditAutoCleanupProps {
  exactDupsToDelete: MediaItem[]
  exactDupsToKeep: MediaItem[]
  duplicateGroups: MediaItem[][]
  strategy: DuplicateStrategy
  onStrategyChange: (s: DuplicateStrategy) => void
}

export const DuplicateAuditAutoCleanup: React.FC<
  DuplicateAuditAutoCleanupProps
> = ({
  exactDupsToDelete,
  exactDupsToKeep,
  duplicateGroups,
  strategy,
  onStrategyChange,
}) => {
  const { commitDeletions } = useSessionStore()
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null)

  const [scrollElement, setScrollElementState] = useState<HTMLDivElement | null>(null)

  const setScrollElement = useCallback((node: HTMLDivElement | null) => {
    setScrollElementState(node)
  }, [])

  // Per-group overrides: groupIndex -> overrideKeepId chosen by the user
  const [overrides, setOverrides] = useState<Map<number, string>>(new Map())

  const groups = useMemo(() => {
    return duplicateGroups
      .map((group, idx) => {
        const overrideKeepId = overrides.get(idx)

        const keep = overrideKeepId
          ? (group.find((i) => i.id === overrideKeepId) ?? group[0])
          : exactDupsToKeep.find((k) => group.some((i) => i.id === k.id)) ||
            group.find((i) => i.isBestInDuplicateGroup) ||
            group[0]

        const deletes = group.filter((i) => i.id !== keep.id)
        if (!deletes.length) return null

        return { keep, deletes, groupIdx: idx }
      })
      .filter(Boolean) as {
      keep: MediaItem
      deletes: MediaItem[]
      groupIdx: number
    }[]
  }, [duplicateGroups, exactDupsToDelete, exactDupsToKeep, overrides])

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
      const { successCount } = await commitDeletions(specificIds)

      setCleanSuccess(
        `Trashed ${successCount} files and reclaimed ${formatBytes(reclaimedSize)}.`
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
            <TooltipContent side="top">
              {opt.description}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

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
        className="relative min-h-0 flex-1 overflow-y-auto pr-3 scrollbar-thin"
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

import React, { useState } from "react"
import type { DuplicateStrategy } from "../../../../shared/types/settings"
import { STRATEGY_OPTIONS } from "./types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  SlidersHorizontal,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  Search,
  X,
  Sparkles,
  FolderTree,
  History,
  CalendarClock,
  Folder,
} from "lucide-react"
import { formatBytes } from "../../../lib/format"

interface DuplicateAuditExactBottomBarProps {
  strategy: DuplicateStrategy
  onStrategyChange: (strategy: DuplicateStrategy) => void
  onOpenFolderRules: () => void
  keepFolderCount: number
  deleteFolderCount: number
  totalDeleteCount: number
  totalReclaimSize: number
  isCleaning: boolean
  onTrashAll: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  showOverridesOnly?: boolean
  onToggleOverridesOnly?: () => void
  overridesCount?: number
  totalGroupsCount?: number
  filteredGroupsCount?: number
}

export const DuplicateAuditExactBottomBar = React.memo<
  DuplicateAuditExactBottomBarProps
>(({
  strategy,
  onStrategyChange,
  onOpenFolderRules,
  keepFolderCount,
  deleteFolderCount,
  totalDeleteCount,
  totalReclaimSize,
  isCleaning,
  onTrashAll,
  searchQuery = "",
  onSearchChange,
  showOverridesOnly = false,
  onToggleOverridesOnly,
  overridesCount = 0,
  totalGroupsCount = 0,
  filteredGroupsCount = 0,
}) => {
  const [isStrategyPopoverOpen, setIsStrategyPopoverOpen] = useState(false)
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false)

  const currentStrategy =
    STRATEGY_OPTIONS.find((s) => s.value === strategy) ?? STRATEGY_OPTIONS[0]

  const totalFolderRules = keepFolderCount + deleteFolderCount
  const isFolderRulesActive =
    strategy === "folder_rules" ||
    strategy === "keep_preferred_folder" ||
    strategy === "delete_preferred_folder" ||
    totalFolderRules > 0

  const hasActiveFilter = Boolean(searchQuery.trim() || showOverridesOnly)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4 select-none">
      <div className="pointer-events-auto flex h-11 items-center flex-nowrap shrink-0 whitespace-nowrap gap-2.5 rounded-xl border border-border/80 bg-card/60 px-2.5 shadow-xl backdrop-blur-xl ring-1 ring-foreground/5 overflow-x-auto scrollbar-none">
        {/* Auto-Keep & Folder Rules Popover */}
        <div className="shrink-0">
          <Popover open={isStrategyPopoverOpen} onOpenChange={setIsStrategyPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                  isStrategyPopoverOpen || isFolderRulesActive
                    ? "border-primary/50 bg-primary/15 text-foreground shadow-2xs"
                    : "border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="text-xs text-muted-foreground">Auto-Keep:</span>
                <span className="font-semibold text-foreground">{currentStrategy.shortLabel}</span>
                {totalFolderRules > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/20 px-1.5 py-0.2 text-2xs font-bold text-primary">
                    {totalFolderRules} {totalFolderRules === 1 ? "rule" : "rules"}
                  </span>
                )}
                <ChevronDown
                  className={`size-3 text-muted-foreground transition-transform duration-200 ${
                    isStrategyPopoverOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="top"
              sideOffset={12}
              alignOffset={-4}
              className="w-84 p-3 select-none rounded-xl border border-border/80 bg-card/70 shadow-2xl backdrop-blur-xl ring-1 ring-foreground/5 gap-2.5"
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Sparkles className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground leading-none">
                      Auto-Keep Strategy
                    </h4>
                    <p className="text-2xs text-muted-foreground mt-0.5">
                      Automate best duplicate resolution
                    </p>
                  </div>
                </div>
              </div>

              {/* Strategy Presets */}
              <div className="flex flex-col gap-1">
                <div className="text-3xs font-bold uppercase tracking-wider text-muted-foreground px-1 pb-0.5">
                  Algorithm Presets
                </div>
                {STRATEGY_OPTIONS.map((opt) => {
                  const isSelected = strategy === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onStrategyChange(opt.value)
                        setIsStrategyPopoverOpen(false)
                      }}
                      className={`group flex cursor-pointer items-start gap-2.5 rounded-lg p-2 text-left transition-all ${
                        isSelected
                          ? "border border-primary/40 bg-primary/10 text-foreground shadow-2xs"
                          : "border border-transparent hover:border-border/60 hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {opt.value === "keep_most_grouped" && <FolderTree className="size-3.5" />}
                        {opt.value === "keep_oldest" && <History className="size-3.5" />}
                        {opt.value === "keep_newest" && <CalendarClock className="size-3.5" />}
                        {opt.value === "keep_shortest_path" && <Folder className="size-3.5" />}
                      </div>

                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                          {isSelected && (
                            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-2.5 stroke-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-2xs text-muted-foreground leading-tight mt-0.5">
                          {opt.description}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Folder Priority Rules Section */}
              <div className="border-t border-border/50 pt-2 flex flex-col gap-1">
                <div className="text-3xs font-bold uppercase tracking-wider text-muted-foreground px-1 pb-0.5">
                  Custom Rules
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsStrategyPopoverOpen(false)
                    onOpenFolderRules()
                  }}
                  className={`group flex w-full cursor-pointer items-center justify-between rounded-lg border p-2 text-left transition-all ${
                    isFolderRulesActive
                      ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                      : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                        isFolderRulesActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <SlidersHorizontal className="size-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-semibold text-foreground">
                        Folder Priority Rules...
                      </span>
                      <span className="truncate text-2xs text-muted-foreground">
                        {totalFolderRules > 0
                          ? `${keepFolderCount} keep, ${deleteFolderCount} delete configured`
                          : "Define custom folder priority rules"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 pl-1">
                    {totalFolderRules > 0 ? (
                      <>
                        {keepFolderCount > 0 && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-2xs font-bold text-emerald-600 dark:text-emerald-400">
                            +{keepFolderCount}
                          </span>
                        )}
                        {deleteFolderCount > 0 && (
                          <span className="inline-flex items-center rounded-full bg-destructive/20 px-1.5 py-0.2 text-2xs font-bold text-destructive">
                            -{deleteFolderCount}
                          </span>
                        )}
                      </>
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="h-5 w-px bg-border shrink-0" />

        {/* Search & Filter Popover Button */}
        {onSearchChange && (
          <>
            <div className="shrink-0">
              <Popover open={isSearchPopoverOpen} onOpenChange={setIsSearchPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`relative flex size-7 cursor-pointer items-center justify-center rounded-md transition-all active:scale-95 ${
                          hasActiveFilter
                            ? "border border-primary bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90"
                            : isSearchPopoverOpen
                            ? "border border-primary/50 bg-primary/15 text-primary"
                            : "border border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Search className="size-3.5" />
                        {hasActiveFilter && (
                          <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-2.5 rounded-full border border-background bg-emerald-500" />
                          </span>
                        )}
                        <span className="sr-only">Filter duplicates</span>
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {hasActiveFilter
                      ? `Filters active (${filteredGroupsCount} groups) - Click to adjust`
                      : "Filter duplicate groups"}
                  </TooltipContent>
                </Tooltip>

                <PopoverContent
                  align="center"
                  side="top"
                  sideOffset={12}
                  className="w-84 p-3 select-none rounded-xl border border-border/80 bg-card/70 shadow-2xl backdrop-blur-xl ring-1 ring-foreground/5 gap-2.5"
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Search className="size-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-foreground leading-none">
                          Filter Duplicates
                        </h4>
                        <p className="text-2xs text-muted-foreground mt-0.5">
                          Search by filename or folder path
                        </p>
                      </div>
                    </div>
                    {hasActiveFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange("")
                          if (showOverridesOnly && onToggleOverridesOnly) {
                            onToggleOverridesOnly()
                          }
                        }}
                        className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-0.5">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search filename or path..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-8.5 rounded-lg border-border/70 bg-muted/40 pl-8 pr-7 text-xs transition-colors focus-visible:bg-background/90"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => onSearchChange("")}
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                          <span className="sr-only">Clear</span>
                        </button>
                      )}
                    </div>

                    {/* Overrides Quick Filter */}
                    {overridesCount > 0 && onToggleOverridesOnly && (
                      <button
                        type="button"
                        onClick={onToggleOverridesOnly}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition-all ${
                          showOverridesOnly
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-medium shadow-2xs"
                            : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`flex size-5 shrink-0 items-center justify-center rounded-md ${
                              showOverridesOnly
                                ? "bg-amber-500 text-white"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            <Sparkles className="size-3" />
                          </div>
                          <span className="truncate font-semibold">Custom Choices Only</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-2xs font-bold text-amber-700 dark:text-amber-300">
                            {overridesCount}
                          </span>
                          {showOverridesOnly && (
                            <Check className="size-3 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                      </button>
                    )}

                    {/* Footer Stats */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-2 text-2xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-primary" />
                        Showing <strong className="font-semibold text-foreground">{filteredGroupsCount}</strong> of {totalGroupsCount} groups
                      </span>
                      {filteredGroupsCount < totalGroupsCount && (
                        <span className="text-3xs font-medium text-muted-foreground">
                          {totalGroupsCount - filteredGroupsCount} hidden
                        </span>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="h-5 w-px bg-border shrink-0" />
          </>
        )}

        {/* Reclaim Stats Summary */}
        <div className="flex flex-col items-start px-1 leading-tight text-xs shrink-0">
          <span className="font-semibold text-foreground">
            {totalDeleteCount} to trash
          </span>
          <span className="text-2xs text-muted-foreground">
            {formatBytes(totalReclaimSize)}
          </span>
        </div>

        <div className="h-5 w-px bg-border shrink-0" />

        {/* Primary Action Button */}
        <Button
          type="button"
          onClick={onTrashAll}
          disabled={isCleaning || totalDeleteCount === 0}
          size="sm"
          className="h-8 shrink-0 cursor-pointer rounded-lg bg-green-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-green-700 active:scale-98"
        >
          {isCleaning ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              <span>Trashing...</span>
            </>
          ) : (
            <>
              <Trash2 className="mr-1.5 size-3.5" />
              <span>Trash All</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
})

DuplicateAuditExactBottomBar.displayName = "DuplicateAuditExactBottomBar"


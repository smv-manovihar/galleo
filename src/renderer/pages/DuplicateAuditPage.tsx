import React, { useState, useMemo, useEffect, useRef, useCallback, startTransition } from "react"
import { useMediaStore } from "../stores/media-store"
import { useSessionStore } from "../stores/session-store"
import { useScanStore } from "../stores/scan-store"
import { useSettingsStore, selectIsScanned } from "../stores/settings-store"
import { DuplicateAuditSimilarMedia } from "../components/duplicate-audit/DuplicateAuditSimilarMedia"
import { DuplicateAuditSummary } from "../components/duplicate-audit/DuplicateAuditSummary"
import { DuplicateAuditExactDuplicates } from "../components/duplicate-audit/DuplicateAuditExactDuplicates"
import { PageContainer } from "@/components/ui/page-layout"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CopyMinus, Images, FolderSearch } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useUIStore } from "../stores/ui-store"
import type { MediaItem } from "../../shared/types/media"
import type { DuplicateStrategy } from "../../shared/types/settings"
import { getNormalizedFilenameBase } from "../../shared/filename-utils"
import { withViewTransition } from "../lib/view-transition"

/** Fast directory path extractor avoiding regex split / array allocations */
const getDirPath = (filePath: string): string => {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"))
  return lastSlash > 0 ? filePath.substring(0, lastSlash) : ""
}

export const DuplicateAuditPage: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const isScanning = useScanStore((s) => s.isScanning)
  const isPostProcessing = useScanStore((s) => s.isPostProcessing)
  const isBusyScanning = isScanning || isPostProcessing
  const organization = useSettingsStore((s) => s.settings.organization)
  const saveSettings = useSettingsStore((s) => s.saveSettings)
  const initSession = useSessionStore((s) => s.initSession)

  const activeTab = useUIStore((s) => s.activeDuplicatesTab)
  const setActiveTab = useUIStore((s) => s.setActiveDuplicatesTab)
  const decisions = useSessionStore((s) => s.decisions)
  const [manualGroupIndex, setManualGroupIndex] = useState(0)

  const strategy: DuplicateStrategy =
    organization.duplicateStrategy ?? "keep_most_grouped"

  const preferredKeepFolderPaths = useMemo(() => {
    if (organization.preferredKeepFolderPaths !== undefined) {
      return organization.preferredKeepFolderPaths
    }
    if (organization.duplicateStrategy === "keep_preferred_folder") {
      return organization.preferredFolderPaths ?? (organization.preferredFolderPath ? [organization.preferredFolderPath] : [])
    }
    return []
  }, [organization.preferredKeepFolderPaths, organization.duplicateStrategy, organization.preferredFolderPaths, organization.preferredFolderPath])

  const preferredDeleteFolderPaths = useMemo(() => {
    if (organization.preferredDeleteFolderPaths !== undefined) {
      return organization.preferredDeleteFolderPaths
    }
    if (organization.duplicateStrategy === "delete_preferred_folder") {
      return organization.preferredFolderPaths ?? (organization.preferredFolderPath ? [organization.preferredFolderPath] : [])
    }
    return []
  }, [organization.preferredDeleteFolderPaths, organization.duplicateStrategy, organization.preferredFolderPaths, organization.preferredFolderPath])

  const handleStrategyChange = useCallback(
    (
      s: DuplicateStrategy,
      keepPaths?: string[],
      deletePaths?: string[]
    ) => {
      const updatedKeep = keepPaths !== undefined ? keepPaths : preferredKeepFolderPaths
      const updatedDelete = deletePaths !== undefined ? deletePaths : preferredDeleteFolderPaths
      const currentSettings = useSettingsStore.getState().settings
      saveSettings({
        ...currentSettings,
        organization: {
          ...currentSettings.organization,
          duplicateStrategy: s,
          preferredKeepFolderPaths: updatedKeep,
          preferredDeleteFolderPaths: updatedDelete,
        },
      })
    },
    [preferredKeepFolderPaths, preferredDeleteFolderPaths, saveSettings]
  )

  const duplicateGroups = useMediaStore((s) => s.cachedDuplicateGroups)

  // Pre-compute folder sibling counts for the most_grouped/keep_newest strategy
  const folderSiblingCount = useMemo(() => {
    const map = new Map<string, number>()
    if (strategy === "keep_most_grouped" || strategy === "keep_newest") {
      for (let i = 0; i < items.length; i++) {
        const dir = getDirPath(items[i].path).replace(/\\/g, "/")
        map.set(dir, (map.get(dir) ?? 0) + 1)
      }
    }
    return map
  }, [items, strategy])

  // Partition duplicates into exact copies vs similar files
  const {
    exactDupsToDelete,
    exactDupsToKeep,
    exactDupsGroups,
    manualReviewGroups,
  } = useMemo(() => {
    const dupsToDelete: MediaItem[] = []
    const dupsToKeep: MediaItem[] = []
    const exactGroups: MediaItem[][] = []
    const manualGroups: MediaItem[][] = []

    const normKeepFolders = preferredKeepFolderPaths.map((p) =>
      p.replace(/\\/g, "/").toLowerCase()
    )
    const normDeleteFolders = preferredDeleteFolderPaths.map((p) =>
      p.replace(/\\/g, "/").toLowerCase()
    )

    const isInKeepFolder = (dirPath: string) => {
      return normKeepFolders.some(
        (pref) => dirPath === pref || dirPath.startsWith(pref + "/")
      )
    }

    const isInDeleteFolder = (dirPath: string) => {
      return normDeleteFolders.some(
        (pref) => dirPath === pref || dirPath.startsWith(pref + "/")
      )
    }

    /**
     * Elects a single canonical item from a group of exact duplicates.
     * Pre-decorates items to avoid repeated date parsing, directory slicing, and folder lookups in reduce.
     */
    const electCanonical = (subGroup: MediaItem[]): MediaItem => {
      if (subGroup.length === 1) return subGroup[0]

      const decorated = subGroup.map((item) => {
        const dir = getDirPath(item.path).replace(/\\/g, "/").toLowerCase()
        return {
          item,
          dir,
          dateTargetMs: new Date(item.dateTarget).getTime(),
          inKeep: normKeepFolders.length > 0 && isInKeepFolder(dir),
          inDelete: normDeleteFolders.length > 0 && isInDeleteFolder(dir),
          siblingCount: folderSiblingCount.get(dir) ?? 0,
        }
      })

      const bestDecorated = decorated.reduce((best, cur) => {
        const isFolderRulesStrategy =
          strategy === "folder_rules" ||
          strategy === "keep_preferred_folder" ||
          strategy === "delete_preferred_folder"

        if (isFolderRulesStrategy && (normKeepFolders.length > 0 || normDeleteFolders.length > 0)) {
          if (cur.inKeep !== best.inKeep) return cur.inKeep ? cur : best
          if (cur.inDelete !== best.inDelete) return cur.inDelete ? best : cur
        }

        if (strategy === "keep_most_grouped") {
          if (cur.siblingCount !== best.siblingCount)
            return cur.siblingCount > best.siblingCount ? cur : best
          if (cur.dateTargetMs !== best.dateTargetMs)
            return cur.dateTargetMs < best.dateTargetMs ? cur : best
        } else if (strategy === "keep_oldest") {
          if (cur.dateTargetMs !== best.dateTargetMs)
            return cur.dateTargetMs < best.dateTargetMs ? cur : best
        } else if (strategy === "keep_newest") {
          if (cur.dateTargetMs !== best.dateTargetMs)
            return cur.dateTargetMs > best.dateTargetMs ? cur : best
          if (cur.siblingCount !== best.siblingCount)
            return cur.siblingCount > best.siblingCount ? cur : best
        } else if (strategy === "keep_shortest_path") {
          const curLen = cur.item.path.length
          const bestLen = best.item.path.length
          if (curLen !== bestLen) return curLen < bestLen ? cur : best
          if (cur.dateTargetMs !== best.dateTargetMs)
            return cur.dateTargetMs < best.dateTargetMs ? cur : best
        }

        // Final tiebreaker: alphabetically first path
        return cur.item.path.toLowerCase() < best.item.path.toLowerCase() ? cur : best
      })

      return bestDecorated.item
    }

    for (let gIdx = 0; gIdx < duplicateGroups.length; gIdx++) {
      const rawGroup = duplicateGroups[gIdx]

      // Filter out items already marked for deletion in session decisions or reviewState
      const group = rawGroup.filter((item) => {
        const dec = decisions[item.id]
        return dec !== "delete" && item.reviewState !== "delete"
      })
      if (group.length < 2) continue

      // Group items in this perceptual group by their exact duplicates key: (normalizedFilenameBase, size)
      const exactSubGroupsMap = new Map<string, MediaItem[]>()
      for (let i = 0; i < group.length; i++) {
        const item = group[i]
        const key = `${getNormalizedFilenameBase(item.name).toLowerCase()}_${item.size}`
        let arr = exactSubGroupsMap.get(key)
        if (!arr) {
          arr = []
          exactSubGroupsMap.set(key, arr)
        }
        arr.push(item)
      }

      const similarCandidates: MediaItem[] = []

      for (const subGroup of exactSubGroupsMap.values()) {
        if (subGroup.length > 1) {
          const bestInSubGroup = electCanonical(subGroup)
          dupsToKeep.push(bestInSubGroup)
          for (let sIdx = 0; sIdx < subGroup.length; sIdx++) {
            if (subGroup[sIdx].id !== bestInSubGroup.id) {
              dupsToDelete.push(subGroup[sIdx])
            }
          }
          exactGroups.push(subGroup)
          similarCandidates.push(bestInSubGroup)
        } else {
          similarCandidates.push(subGroup[0])
        }
      }

      if (similarCandidates.length > 1) {
        manualGroups.push(similarCandidates)
      }
    }

    // Fast O(N) pre-pass for sorting groups without re-running O(M) .reduce() in O(N log N) comparisons
    const sortGroups = (groups: MediaItem[][]): MediaItem[][] => {
      const meta = groups.map((g) => {
        let size = 0
        for (let i = 0; i < g.length; i++) {
          size += g[i].size || 0
        }
        return { group: g, length: g.length, size, firstId: g[0]?.id ?? "" }
      })
      meta.sort((a, b) => {
        if (b.length !== a.length) return b.length - a.length
        if (b.size !== a.size) return b.size - a.size
        return a.firstId.localeCompare(b.firstId)
      })
      return meta.map((m) => m.group)
    }

    const sortedManualGroups = sortGroups(manualGroups)
    const sortedExactGroups = sortGroups(exactGroups)

    return {
      exactDupsToDelete: dupsToDelete,
      exactDupsToKeep: dupsToKeep,
      exactDupsGroups: sortedExactGroups,
      manualReviewGroups: sortedManualGroups,
    }
  }, [
    duplicateGroups,
    strategy,
    preferredKeepFolderPaths,
    preferredDeleteFolderPaths,
    folderSiblingCount,
    decisions,
  ])

  const manualReviewItems = useMemo(() => {
    return manualReviewGroups.flat()
  }, [manualReviewGroups])

  // Clamp manualGroupIndex when items are deleted mid-review and the groups array shrinks.
  useEffect(() => {
    if (manualReviewGroups.length === 0) return
    if (manualGroupIndex >= manualReviewGroups.length) {
      const clamped = manualReviewGroups.length - 1
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setManualGroupIndex(clamped)
      if (activeRootPath) {
        localStorage.setItem(
          `duplicates_manual_group_index_${activeRootPath}`,
          clamped.toString()
        )
      }
    }
  }, [manualReviewGroups.length, manualGroupIndex, activeRootPath])

  // Early-exit check for completed review
  const isAllManualReviewed = useMemo(() => {
    if (manualReviewGroups.length === 0) return false
    for (let i = 0; i < manualReviewGroups.length; i++) {
      const g = manualReviewGroups[i]
      for (let j = 0; j < g.length; j++) {
        const dec = decisions[g[j].id]
        if (dec !== "keep" && dec !== "delete") {
          return false
        }
      }
    }
    return true
  }, [manualReviewGroups, decisions])

  const [showManualSummary, setShowManualSummary] = useState<boolean>(() => isAllManualReviewed)

  const lastLoadedFolderRef = useRef<string | null>(null)

  // Initialize review session when activeRootPath changes or is loaded
  useEffect(() => {
    if (isScanning) return
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length)
    }
  }, [activeRootPath, items.length, isScanning, initSession])

  // Restore and initialize local tab/index states when activeRootPath changes or items load
  useEffect(() => {
    if (
      activeRootPath &&
      activeRootPath !== lastLoadedFolderRef.current &&
      items.length > 0
    ) {
      lastLoadedFolderRef.current = activeRootPath

      // Restore active tab
      const savedTab = localStorage.getItem(
        `duplicates_active_tab_${activeRootPath}`
      )
      if (savedTab === "auto" || savedTab === "manual") {
        setActiveTab(savedTab as "auto" | "manual")
      } else {
        setActiveTab("auto")
      }

      // Restore group index
      const savedIndex = localStorage.getItem(
        `duplicates_manual_group_index_${activeRootPath}`
      )
      if (savedIndex !== null) {
        const parsed = parseInt(savedIndex, 10)
        if (
          !isNaN(parsed) &&
          parsed >= 0 &&
          parsed < manualReviewGroups.length
        ) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setManualGroupIndex(parsed)
          return
        }
      }

      // Fallback: find the first group that has at least one pending item to review
      const currentDecisions = useSessionStore.getState().decisions
      const firstUncompleted = manualReviewGroups.findIndex((group) =>
        group.some(
          (item) =>
            currentDecisions[item.id] === undefined &&
            (!item.reviewState || item.reviewState === "pending")
        )
      )
      if (firstUncompleted !== -1) {
        setManualGroupIndex(firstUncompleted)
      } else if (manualReviewGroups.length > 0) {
        setManualGroupIndex(manualReviewGroups.length - 1)
      } else {
        setManualGroupIndex(0)
      }
    }
  }, [activeRootPath, items.length, manualReviewGroups, setActiveTab])

  const handleTabChange = useCallback(
    (tab: "auto" | "manual") => {
      startTransition(() => {
        setActiveTab(tab)
      })
      if (activeRootPath) {
        localStorage.setItem(`duplicates_active_tab_${activeRootPath}`, tab)
      }
    },
    [activeRootPath, setActiveTab]
  )

  const handleGroupIndexChange = useCallback(
    (indexOrUpdater: number | ((prev: number) => number)) => {
      setManualGroupIndex((prev) => {
        const next =
          typeof indexOrUpdater === "function" ? indexOrUpdater(prev) : indexOrUpdater
        if (activeRootPath) {
          localStorage.setItem(
            `duplicates_manual_group_index_${activeRootPath}`,
            next.toString()
          )
        }
        return next
      })
    },
    [activeRootPath]
  )

  const isScanned = useSettingsStore((s) =>
    selectIsScanned(s.settings, activeRootPath)
  )

  if (!activeRootPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 font-sans text-xs text-muted-foreground select-none">
        <span>
          Please select a folder from the sidebar directory listing to begin.
        </span>
      </div>
    )
  }

  if (isBusyScanning) {
    return (
      <PageContainer className="h-full p-0 select-none md:p-0" maxWidth="xl">
        <div className="relative flex min-h-0 flex-1 flex-col gap-4 px-6 pt-4">
          <div className="flex flex-1 flex-col items-center justify-center gap-2 font-sans text-xs text-muted-foreground select-none text-center">
            <FolderSearch className="h-8 w-8 text-primary animate-pulse mb-1" />
            <span className="text-sm font-medium text-foreground">Duplicate Calculation Paused</span>
            <span className="max-w-md text-xs text-muted-foreground">
              A library scan or background analysis is currently in progress. Duplicate media calculation is paused and will run automatically once scanning completes.
            </span>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (items.length === 0) {
    return (
      <PageContainer className="h-full p-0 select-none md:p-0" maxWidth="xl">
        <div className="relative flex min-h-0 flex-1 flex-col gap-4 px-6 pt-4">
          <div className="flex flex-1 flex-col items-center justify-center gap-2 font-sans text-xs text-muted-foreground select-none">
            {!isScanned ? (
              <>
                <FolderSearch className="h-8 w-8 text-amber-500/80 mb-1" />
                <span className="text-sm font-medium text-foreground">Folder not scanned</span>
                <span className="text-xs text-muted-foreground">Use the Scan Folders button above to index media files.</span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">No photos or videos found</span>
                <span className="text-xs text-muted-foreground">This folder contains no duplicate candidates.</span>
              </>
            )}
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="h-full p-0 select-none md:p-0" maxWidth="xl">
      <div className="relative flex min-h-0 flex-1 flex-col px-6">
        <Tabs
          value={activeTab}
          onValueChange={(val) => handleTabChange(val as "auto" | "manual")}
          className="relative flex min-h-0 w-full flex-1 flex-col"
        >
          {/* Floating Top Tabs Bar */}
          <div className="pointer-events-none absolute top-3 inset-x-0 z-30 flex justify-center px-4">
            <TabsList
              variant={"animated"}
              className="pointer-events-auto h-11 rounded-xl border border-border/80 bg-card/60 p-1 shadow-xl backdrop-blur-xl ring-1 ring-foreground/5"
            >
              <TabsTrigger
                value="auto"
                className="group h-full gap-2 px-4 py-1.5 text-xs data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
              >
                <CopyMinus className="size-4 transition-colors group-data-[state=active]:text-amber-600 dark:group-data-[state=active]:text-amber-400" />
                <span>Exact Duplicates</span>
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums leading-none transition-colors group-data-[state=active]:bg-amber-500/15 group-data-[state=active]:text-amber-700 dark:group-data-[state=active]:text-amber-300"
                >
                  {exactDupsGroups?.length || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="group h-full gap-2 px-4 py-1.5 text-xs data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400"
              >
                <Images className="size-4 transition-colors group-data-[state=active]:text-sky-600 dark:group-data-[state=active]:text-sky-400" />
                <span>Similar Media</span>
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums leading-none transition-colors group-data-[state=active]:bg-sky-500/15 group-data-[state=active]:text-sky-700 dark:group-data-[state=active]:text-sky-300"
                >
                  {manualReviewGroups.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1">
            <TabsContent
              value="auto"
              forceMount
              className="m-0 flex h-full min-h-0 flex-col"
            >
              <DuplicateAuditExactDuplicates
                exactDupsToDelete={exactDupsToDelete}
                exactDupsToKeep={exactDupsToKeep}
                duplicateGroups={exactDupsGroups}
                strategy={strategy}
                preferredKeepFolderPaths={preferredKeepFolderPaths}
                preferredDeleteFolderPaths={preferredDeleteFolderPaths}
                onStrategyChange={handleStrategyChange}
              />
            </TabsContent>

            <TabsContent
              value="manual"
              forceMount
              className="m-0 flex h-full min-h-0 flex-col"
            >
              {manualReviewItems.length > 0 && (showManualSummary || isAllManualReviewed) ? (
                <DuplicateAuditSummary
                  similarMediaItems={manualReviewItems}
                  onBackToQueue={() => {
                    withViewTransition(() => {
                      setShowManualSummary(false)
                      setManualGroupIndex(Math.max(0, manualReviewGroups.length - 1))
                    })
                  }}
                />
              ) : (
                <DuplicateAuditSimilarMedia
                  groups={manualReviewGroups}
                  items={manualReviewItems}
                  onComplete={() => {
                    withViewTransition(() => setShowManualSummary(true))
                  }}
                  activeGroupIndex={manualGroupIndex}
                  onGroupIndexChange={handleGroupIndexChange}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </PageContainer>
  )
}

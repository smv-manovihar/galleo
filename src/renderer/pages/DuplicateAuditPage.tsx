import React, { useState } from "react"
import { useMediaStore } from "../stores/media-store"
import { useSessionStore } from "../stores/session-store"
import { useScanStore } from "../stores/scan-store"
import { useSettingsStore } from "../stores/settings-store"
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

export const DuplicateAuditPage: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const isScanning = useScanStore((s) => s.isScanning)
  const isPostProcessing = useScanStore((s) => s.isPostProcessing)
  const isBusyScanning = isScanning || isPostProcessing
  const organization = useSettingsStore((s) => s.settings.organization)
  const folderRoots = useSettingsStore((s) => s.settings.folders.roots)
  const saveSettings = useSettingsStore((s) => s.saveSettings)
  const initSession = useSessionStore((s) => s.initSession)

  const { activeDuplicatesTab: activeTab, setActiveDuplicatesTab: setActiveTab } = useUIStore()
  const decisions = useSessionStore((s) => s.decisions)
  const [manualGroupIndex, setManualGroupIndex] = useState(0)

  const strategy: DuplicateStrategy =
    organization.duplicateStrategy ?? "keep_most_grouped"

  const preferredKeepFolderPaths = React.useMemo(() => {
    if (organization.preferredKeepFolderPaths !== undefined) {
      return organization.preferredKeepFolderPaths
    }
    if (organization.duplicateStrategy === "keep_preferred_folder") {
      return organization.preferredFolderPaths ?? (organization.preferredFolderPath ? [organization.preferredFolderPath] : [])
    }
    return []
  }, [organization.preferredKeepFolderPaths, organization.duplicateStrategy, organization.preferredFolderPaths, organization.preferredFolderPath])

  const preferredDeleteFolderPaths = React.useMemo(() => {
    if (organization.preferredDeleteFolderPaths !== undefined) {
      return organization.preferredDeleteFolderPaths
    }
    if (organization.duplicateStrategy === "delete_preferred_folder") {
      return organization.preferredFolderPaths ?? (organization.preferredFolderPath ? [organization.preferredFolderPath] : [])
    }
    return []
  }, [organization.preferredDeleteFolderPaths, organization.duplicateStrategy, organization.preferredFolderPaths, organization.preferredFolderPath])

  const handleStrategyChange = (
    s: DuplicateStrategy,
    keepPaths?: string[],
    deletePaths?: string[]
  ) => {
    const updatedKeep = keepPaths !== undefined ? keepPaths : preferredKeepFolderPaths
    const updatedDelete = deletePaths !== undefined ? deletePaths : preferredDeleteFolderPaths
    saveSettings({
      ...useSettingsStore.getState().settings,
      organization: {
        ...useSettingsStore.getState().settings.organization,
        duplicateStrategy: s,
        preferredKeepFolderPaths: updatedKeep,
        preferredDeleteFolderPaths: updatedDelete,
      },
    })
  }

  const duplicateGroups = useMediaStore((s) => s.cachedDuplicateGroups)

  // Partition duplicates into exact copies vs similar files
  const {
    exactDupsToDelete,
    exactDupsToKeep,
    exactDupsGroups,
    manualReviewGroups,
  } = React.useMemo(() => {
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

    // Pre-compute folder sibling counts for the most_grouped strategy
    const folderSiblingCount = new Map<string, number>()
    if (strategy === "keep_most_grouped") {
      for (const item of items) {
        const dir = item.path
          .replace(/\\/g, "/")
          .split("/")
          .slice(0, -1)
          .join("/")
        folderSiblingCount.set(dir, (folderSiblingCount.get(dir) ?? 0) + 1)
      }
    }

    /**
     * Elects a single canonical item from a group of exact duplicates.
     */
    const electCanonical = (subGroup: MediaItem[]): MediaItem => {
      return subGroup.reduce((best, item) => {
        const itemDir = item.path
          .replace(/\\/g, "/")
          .split("/")
          .slice(0, -1)
          .join("/")
          .toLowerCase()
        const bestDir = best.path
          .replace(/\\/g, "/")
          .split("/")
          .slice(0, -1)
          .join("/")
          .toLowerCase()
        const itemDate = new Date(item.dateTarget).getTime()
        const bestDate = new Date(best.dateTarget).getTime()

        const isFolderRulesStrategy =
          strategy === "folder_rules" ||
          strategy === "keep_preferred_folder" ||
          strategy === "delete_preferred_folder"

        if (isFolderRulesStrategy && (normKeepFolders.length > 0 || normDeleteFolders.length > 0)) {
          const itemInKeep = normKeepFolders.length > 0 && isInKeepFolder(itemDir)
          const bestInKeep = normKeepFolders.length > 0 && isInKeepFolder(bestDir)

          if (itemInKeep !== bestInKeep) return itemInKeep ? item : best

          const itemInDelete = normDeleteFolders.length > 0 && isInDeleteFolder(itemDir)
          const bestInDelete = normDeleteFolders.length > 0 && isInDeleteFolder(bestDir)

          if (itemInDelete !== bestInDelete) return itemInDelete ? best : item
        }

        if (strategy === "keep_most_grouped") {
          const itemCount = folderSiblingCount.get(itemDir) ?? 0
          const bestCount = folderSiblingCount.get(bestDir) ?? 0
          if (itemCount !== bestCount)
            return itemCount > bestCount ? item : best
          if (itemDate !== bestDate) return itemDate < bestDate ? item : best
        } else if (strategy === "keep_oldest") {
          if (itemDate !== bestDate) return itemDate < bestDate ? item : best
        } else if (strategy === "keep_newest") {
          if (itemDate !== bestDate) return itemDate > bestDate ? item : best
          const itemCount = folderSiblingCount.get(itemDir) ?? 0
          const bestCount = folderSiblingCount.get(bestDir) ?? 0
          if (itemCount !== bestCount)
            return itemCount > bestCount ? item : best
        } else if (strategy === "keep_shortest_path") {
          const itemLen = item.path.length
          const bestLen = best.path.length
          if (itemLen !== bestLen) return itemLen < bestLen ? item : best
          if (itemDate !== bestDate) return itemDate < bestDate ? item : best
        }

        // Final tiebreaker: alphabetically first path
        return item.path.toLowerCase() < best.path.toLowerCase() ? item : best
      })
    }

    for (const group of duplicateGroups) {
      // Group items in this perceptual group by their exact duplicates key: (normalizedFilenameBase, size)
      const exactSubGroupsMap = new Map<string, MediaItem[]>()
      for (const item of group) {
        const key = `${getNormalizedFilenameBase(item.name).toLowerCase()}_${item.size}`
        if (!exactSubGroupsMap.has(key)) {
          exactSubGroupsMap.set(key, [])
        }
        exactSubGroupsMap.get(key)!.push(item)
      }

      const similarCandidates: MediaItem[] = []

      for (const subGroup of exactSubGroupsMap.values()) {
        if (subGroup.length > 1) {
          const bestInSubGroup = electCanonical(subGroup)
          dupsToKeep.push(bestInSubGroup)
          dupsToDelete.push(
            ...subGroup.filter((i) => i.id !== bestInSubGroup.id)
          )
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

    return {
      exactDupsToDelete: dupsToDelete,
      exactDupsToKeep: dupsToKeep,
      exactDupsGroups: exactGroups,
      manualReviewGroups: manualGroups,
    }
  }, [
    duplicateGroups,
    items,
    strategy,
    preferredKeepFolderPaths,
    preferredDeleteFolderPaths,
  ])

  const manualReviewItems = React.useMemo(() => {
    return manualReviewGroups.flat()
  }, [manualReviewGroups])

  // Clamp manualGroupIndex when items are deleted mid-review and the groups array shrinks.
  // Without this, the index stays at its old value while duplicateGroups is shorter,
  // causing a stale "N of M" counter or a null currentGroup.
  React.useEffect(() => {
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

  const isAllManualReviewed = React.useMemo(() => {
    if (manualReviewGroups.length === 0) return false
    return manualReviewGroups.every((group) =>
      group.every(
        (item) =>
          decisions[item.id] === "keep" || decisions[item.id] === "delete"
      )
    )
  }, [manualReviewGroups, decisions])

  const [showManualSummary, setShowManualSummary] = useState<boolean>(() => isAllManualReviewed)

  const lastLoadedFolderRef = React.useRef<string | null>(null)

  // Initialize review session when activeRootPath changes or is loaded
  React.useEffect(() => {
    if (isScanning) return
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length)
    }
  }, [activeRootPath, items.length, isScanning, initSession])

  // Restore and initialize local tab/index states when activeRootPath changes or items load
  React.useEffect(() => {
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
      const firstUncompleted = manualReviewGroups.findIndex((group) =>
        group.some(
          (item) =>
            decisions[item.id] === undefined &&
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
  }, [activeRootPath, items.length, manualReviewGroups, setActiveTab, decisions])

  const handleTabChange = (tab: "auto" | "manual") => {
    setActiveTab(tab)
    if (activeRootPath) {
      localStorage.setItem(`duplicates_active_tab_${activeRootPath}`, tab)
    }
  }

  const handleGroupIndexChange = (
    indexOrUpdater: number | ((prev: number) => number)
  ) => {
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
  }

  const isScanned = React.useMemo(() => {
    if (!activeRootPath || activeRootPath === "all") {
      return folderRoots.some((r) => r.enabled && r.scanned)
    }
    return !!folderRoots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned
  }, [activeRootPath, folderRoots])

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
      <div className="relative flex min-h-0 flex-1 flex-col gap-4 px-6 pt-4">
        <Tabs
          value={activeTab}
          onValueChange={(val) => handleTabChange(val as "auto" | "manual")}
          className="flex min-h-0 w-full flex-1 flex-col"
        >
          <div className="flex shrink-0 items-center justify-center border-b border-border/60 pb-3">
            <TabsList variant={"animated"}>
              <TabsTrigger
                value="auto"
                className="group gap-2 px-4 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
              >
                <CopyMinus className="size-4 transition-colors group-data-[state=active]:text-amber-600 dark:group-data-[state=active]:text-amber-400" />
                <span>Exact Duplicates</span>
                <Badge
                  variant="secondary"
                  className="ml-1 rounded-full px-2 py-0 text-xs transition-colors group-data-[state=active]:bg-amber-500/15 group-data-[state=active]:text-amber-700 dark:group-data-[state=active]:text-amber-300"
                >
                  {exactDupsGroups?.length || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="group gap-2 px-4 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400"
              >
                <Images className="size-4 transition-colors group-data-[state=active]:text-sky-600 dark:group-data-[state=active]:text-sky-400" />
                <span>Similar Media</span>
                <Badge
                  variant="secondary"
                  className="ml-1 rounded-full px-2 py-0 text-xs transition-colors group-data-[state=active]:bg-sky-500/15 group-data-[state=active]:text-sky-700 dark:group-data-[state=active]:text-sky-300"
                >
                  {manualReviewGroups.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-4 min-h-0 flex-1">
            <TabsContent
              value="auto"
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
              className="m-0 flex h-full min-h-0 flex-col pb-6 md:pb-8"
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

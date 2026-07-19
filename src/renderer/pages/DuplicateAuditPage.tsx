import React, { useState } from "react"
import { useMediaStore } from "../stores/media-store"
import { useSessionStore } from "../stores/session-store"
import { useScanStore } from "../stores/scan-store"
import { useSettingsStore } from "../stores/settings-store"
import { FolderNotScanned } from "../components/media/FolderNotScanned"
import { DuplicateAuditReview } from "../components/duplicate-audit/DuplicateAuditReview"
import { DuplicateAuditSummary } from "../components/duplicate-audit/DuplicateAuditSummary"
import { DuplicateAuditAutoCleanup } from "../components/duplicate-audit/DuplicateAuditAutoCleanup"
import { PageContainer } from "@/components/ui/page-layout"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Bookmark, CopyMinus, Images } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useUIStore } from "../stores/ui-store"
import type { MediaItem } from "../../shared/types/media"
import type { DuplicateStrategy } from "../../shared/types/settings"
import { getNormalizedFilenameBase } from "../../shared/filename-utils"

export const DuplicateAuditPage: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const isScanning = useScanStore((s) => s.isScanning)
  const { settings, saveSettings } = useSettingsStore()
  const { initSession } = useSessionStore()

  const isScanned = React.useMemo(() => {
    if (!activeRootPath) return false
    if (activeRootPath === "all") {
      return settings.folders.roots.some((r) => r.scanned)
    }
    return !!settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned
  }, [activeRootPath, settings.folders.roots])

  const { activeDuplicatesTab: activeTab, setActiveDuplicatesTab: setActiveTab } = useUIStore()
  const [showSummary, setShowSummary] = useState(false)
  const [manualGroupIndex, setManualGroupIndex] = useState(0)

  const lastLoadedFolderRef = React.useRef<string | null>(null)

  // Initialize review session when activeRootPath changes or is loaded
  React.useEffect(() => {
    if (isScanning) return
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length)
    }
  }, [activeRootPath, items.length, isScanning, initSession])

  const strategy: DuplicateStrategy =
    settings.organization.duplicateStrategy ?? "keep_most_grouped"

  const handleStrategyChange = (s: DuplicateStrategy) => {
    saveSettings({
      ...settings,
      organization: { ...settings.organization, duplicateStrategy: s },
    })
  }

  // Group duplicate items
  const duplicateGroups = React.useMemo(() => {
    const groups: Record<string, MediaItem[]> = {}
    for (const item of items) {
      if (item.isDuplicate && item.duplicateGroupId) {
        if (!groups[item.duplicateGroupId]) {
          groups[item.duplicateGroupId] = []
        }
        groups[item.duplicateGroupId].push(item)
      }
    }
    return Object.values(groups).filter((g) => g.length > 1)
  }, [items])

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
     * Tiebreaker chain:
     *   1. Strategy metric (most siblings / oldest date / newest date)
     *   2. Oldest dateTarget
     *   3. Alphabetically first path
     */
    const electCanonical = (subGroup: MediaItem[]): MediaItem => {
      return subGroup.reduce((best, item) => {
        const itemDir = item.path
          .replace(/\\/g, "/")
          .split("/")
          .slice(0, -1)
          .join("/")
        const bestDir = best.path
          .replace(/\\/g, "/")
          .split("/")
          .slice(0, -1)
          .join("/")
        const itemDate = new Date(item.dateTarget).getTime()
        const bestDate = new Date(best.dateTarget).getTime()

        if (strategy === "keep_most_grouped") {
          const itemCount = folderSiblingCount.get(itemDir) ?? 0
          const bestCount = folderSiblingCount.get(bestDir) ?? 0
          if (itemCount !== bestCount)
            return itemCount > bestCount ? item : best
          // Tiebreaker 2: oldest date
          if (itemDate !== bestDate) return itemDate < bestDate ? item : best
        } else if (strategy === "keep_oldest") {
          if (itemDate !== bestDate) return itemDate < bestDate ? item : best
        } else if (strategy === "keep_newest") {
          if (itemDate !== bestDate) return itemDate > bestDate ? item : best
          // Tiebreaker 2: most grouped
          const itemCount = folderSiblingCount.get(itemDir) ?? 0
          const bestCount = folderSiblingCount.get(bestDir) ?? 0
          if (itemCount !== bestCount)
            return itemCount > bestCount ? item : best
        } else if (strategy === "keep_shortest_path") {
          const itemLen = item.path.length
          const bestLen = best.path.length
          if (itemLen !== bestLen) return itemLen < bestLen ? item : best
          // Tiebreaker 2: oldest date
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
  }, [duplicateGroups, items, strategy])

  const manualReviewItems = React.useMemo(() => {
    return manualReviewGroups.flat()
  }, [manualReviewGroups])

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
          setManualGroupIndex(parsed)
          return
        }
      }

      // Fallback: find the first group that has at least one pending item to review
      const firstUncompleted = manualReviewGroups.findIndex((group) =>
        group.some(
          (item) => !item.reviewState || item.reviewState === "pending"
        )
      )
      if (firstUncompleted !== -1) {
        setManualGroupIndex(firstUncompleted)
        setShowSummary(false)
      } else if (manualReviewGroups.length > 0) {
        setManualGroupIndex(manualReviewGroups.length - 1)
        setShowSummary(true)
      } else {
        setManualGroupIndex(0)
        setShowSummary(false)
      }
    }
  }, [activeRootPath, items.length, manualReviewGroups, setActiveTab])

  const handleTabChange = (tab: "auto" | "manual") => {
    setActiveTab(tab)
    if (activeRootPath) {
      localStorage.setItem(`duplicates_active_tab_${activeRootPath}`, tab)
    }
  }

  const handleGroupIndexChange = (index: number) => {
    setManualGroupIndex(index)
    if (activeRootPath) {
      localStorage.setItem(
        `duplicates_manual_group_index_${activeRootPath}`,
        index.toString()
      )
    }
  }

  if (!activeRootPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 font-sans text-xs text-muted-foreground select-none">
        <span>
          Please select a folder from the sidebar directory listing to begin.
        </span>
      </div>
    )
  }

  if (!isScanned) {
    return (
      <FolderNotScanned
        activeRootPath={activeRootPath}
        featureDescription="and audit duplicates"
      />
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 font-sans text-xs text-muted-foreground select-none">
        <span>This folder contains no photos or videos.</span>
      </div>
    )
  }

  return (
    <PageContainer className="h-full p-0 select-none md:p-0" maxWidth="xl">
      <div className="relative flex min-h-0 flex-1 flex-col gap-4 px-6 pt-4">
        {showSummary ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <DuplicateAuditSummary
              onBackToQueue={() => {
                setShowSummary(false)
                setManualGroupIndex(Math.max(0, manualReviewGroups.length - 1))
              }}
            />
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(val) => handleTabChange(val as any)}
            className="flex min-h-0 w-full flex-1 flex-col"
          >
            <div className="flex shrink-0 items-center justify-center border-b border-border pb-3">
              <TabsList className="h-9 rounded-lg border border-border bg-muted/50 p-0.5">
                <TabsTrigger
                  value="auto"
                  className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-4 text-xs"
                >
                  <CopyMinus className="h-3.5 w-3.5 text-amber-500" />
                  <span>Exact Duplicates</span>
                  <Badge
                    variant="outline"
                    className="h-4.5 rounded-full border-amber-500/20 bg-amber-500/10 px-1.5 text-3xs font-bold text-amber-600 select-none dark:text-amber-400"
                  >
                    {exactDupsGroups?.length || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="manual"
                  className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-4 text-xs"
                >
                  <Images className="h-3.5 w-3.5 text-primary" />
                  <span>Similar Media</span>
                  <Badge
                    variant="outline"
                    className="h-4.5 rounded-full border-primary/20 bg-primary/10 px-1.5 text-3xs font-bold text-primary select-none"
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
                <DuplicateAuditAutoCleanup
                  exactDupsToDelete={exactDupsToDelete}
                  exactDupsToKeep={exactDupsToKeep}
                  duplicateGroups={exactDupsGroups}
                  strategy={strategy}
                  onStrategyChange={handleStrategyChange}
                />
              </TabsContent>

              <TabsContent
                value="manual"
                className="m-0 flex h-full min-h-0 flex-col pb-6 md:pb-8"
              >
                {manualReviewItems.length > 0 ? (
                  <DuplicateAuditReview
                    items={manualReviewItems}
                    onComplete={() => setShowSummary(true)}
                    activeGroupIndex={manualGroupIndex}
                    onGroupIndexChange={handleGroupIndexChange}
                  />
                ) : (
                  <div className="flex h-64 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/10 p-8">
                    <Bookmark className="mb-3 h-10 w-10 text-primary" />
                    <h3 className="text-xs font-semibold text-foreground">
                      All Similar Photos Reviewed
                    </h3>
                    <p className="mt-1 max-w-sm text-center text-2xs text-muted-foreground">
                      No groups of similar files are currently left to review.
                      Great job!
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </PageContainer>
  )
}

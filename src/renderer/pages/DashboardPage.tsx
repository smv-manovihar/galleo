import React from "react"
import { useMediaStore } from "../stores/media-store"
import { useUIStore } from "../stores/ui-store"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageContainer } from "@/components/ui/page-layout"
import { Progress } from "@/components/ui/progress"
import {
  Sparkles,
  FolderOpen,
  ArrowRight,
  TrendingDown,
  Copy,
  CalendarDays,
  Settings,
  Library,
  Image as ImageIcon,
  Film,
  HardDrive,
  CheckSquare,
  Focus,
  SunMoon,
  Monitor,
  Trash2,
  Clock,
  Bookmark,
  Minimize,
} from "lucide-react"
import { formatBytes } from "../lib/format"

export const DashboardPage: React.FC = () => {
  const items = useMediaStore((s) => s.items)
  const setFilterQuality = useMediaStore((s) => s.setFilterQuality)
  const setFilterType = useMediaStore((s) => s.setFilterType)
  const setSortBy = useMediaStore((s) => s.setSortBy)
  const setFilterReviewState = useMediaStore((s) => s.setFilterReviewState)
  const { setCurrentView, setActiveSettingsTab } = useUIStore()

  const metrics = React.useMemo(() => {
    let photoCount = 0
    let videoCount = 0
    let totalSize = 0
    let keptCount = 0
    let trashCount = 0
    let pendingCount = 0
    const blurryItems: typeof items = []
    const darkItems: typeof items = []
    const duplicateItems: typeof items = []
    const screenshotItems: typeof items = []
    const smallItems: typeof items = []
    const groups = new Set<string>()

    for (const i of items) {
      if (i.mediaType === "photo") photoCount++
      else if (i.mediaType === "video") videoCount++
      totalSize += i.size || 0

      if (i.reviewState === "keep") keptCount++
      else if (i.reviewState === "delete") trashCount++
      else pendingCount++

      if (i.quality?.isBlurry) blurryItems.push(i)
      if (i.quality?.isDark) darkItems.push(i)
      if (i.isDuplicate) {
        if (!i.isBestInDuplicateGroup) duplicateItems.push(i)
        if (i.duplicateGroupId) groups.add(i.duplicateGroupId)
      }
      if (i.quality?.isScreenshot) screenshotItems.push(i)
      if (i.quality?.isSmall) smallItems.push(i)
    }

    const totalFiles = items.length
    const reviewedCount = keptCount + trashCount
    const reviewProgress = totalFiles > 0 ? Math.round((reviewedCount / totalFiles) * 100) : 0
    const duplicateSavedBytes = duplicateItems.reduce((sum, i) => sum + (i.size || 0), 0)
    const blurrySavedBytes = blurryItems.reduce((sum, i) => sum + (i.size || 0), 0)

    return {
      totalFiles,
      photoCount,
      videoCount,
      totalSize,
      keptCount,
      trashCount,
      pendingCount,
      reviewedCount,
      reviewProgress,
      blurryItems,
      darkItems,
      duplicateItems,
      screenshotItems,
      smallItems,
      duplicateGroupsCount: groups.size,
      duplicateSavedBytes,
      blurrySavedBytes,
    }
  }, [items])

  const {
    totalFiles,
    photoCount,
    videoCount,
    totalSize,
    keptCount,
    trashCount,
    pendingCount,
    reviewedCount,
    reviewProgress,
    blurryItems,
    darkItems,
    duplicateItems,
    screenshotItems,
    smallItems,
    duplicateGroupsCount,
    duplicateSavedBytes,
    blurrySavedBytes,
  } = metrics
  const smallSavedBytes = smallItems.reduce((sum, i) => sum + i.size, 0)
  const totalWastedBytes =
    duplicateSavedBytes + blurrySavedBytes + smallSavedBytes

  const navigateToFiltered = (
    quality: "all" | "blurry" | "dark" | "duplicates" | "screenshots" | "small",
    sortByVal:
      | "date-desc"
      | "date-asc"
      | "score-desc"
      | "score-asc"
      | "size-desc" = "date-desc",
    type: "all" | "photo" | "video" = "all"
  ) => {
    setFilterQuality(quality)
    setSortBy(sortByVal)
    setFilterType(type)
    setCurrentView("browse")
  }

  return (
    <PageContainer className="font-sans text-xs select-none" maxWidth="xl">

      {/* 1. Stat Cards Grid: Strict "Label ------ Icon" Consistency */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card/65">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-2xs font-semibold text-muted-foreground uppercase">
              Total Files
            </CardDescription>
            <Library className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="mt-0.5 font-heading text-xl font-bold text-foreground">
              {totalFiles}
            </CardTitle>
            <div className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ImageIcon className="size-3 text-muted-foreground" />{" "}
                {photoCount}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Film className="size-3 text-muted-foreground" /> {videoCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/65">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-2xs font-semibold text-muted-foreground uppercase">
              Library Size
            </CardDescription>
            <HardDrive className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="mt-0.5 font-heading text-xl font-bold text-foreground">
              {formatBytes(totalSize)}
            </CardTitle>
            <p className="mt-1 text-2xs text-muted-foreground">
              Total disk space utilized
            </p>
          </CardContent>
        </Card>

        {/* Wasted Space Card - Strict "Label ------ Icon" matching structure with Color Differentiation */}
        <Card className="border-primary/20 bg-card/65">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-2xs font-semibold text-primary uppercase">
              Wasted Space
            </CardDescription>
            <TrendingDown className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <CardTitle className="mt-0.5 font-heading text-xl font-bold text-foreground">
              {formatBytes(totalWastedBytes)}
            </CardTitle>
            <p className="mt-1 text-2xs text-muted-foreground">
              From duplicates and blurry media
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/65">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-2xs font-semibold text-muted-foreground uppercase">
              Duplicates
            </CardDescription>
            <Copy className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="mt-0.5 font-heading text-xl font-bold text-foreground">
              {duplicateItems.length}
            </CardTitle>
            <p className="mt-1 text-2xs text-muted-foreground">
              {duplicateGroupsCount > 0
                ? `${duplicateGroupsCount} duplicate stacks`
                : "No redundant files"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Main 2:1 Ratio Section */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Review Status + Cleanup Shortcuts */}
        <div className="space-y-6 lg:col-span-2">
          {/* Library Review Status Hero */}
          {totalFiles > 0 && (
            <Card className="border-border bg-card/60">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <span className="font-heading text-sm font-semibold text-foreground">
                      Library Review Status
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-2xs font-medium">
                    {reviewProgress}% Reviewed ({reviewedCount}/{totalFiles})
                  </Badge>
                </div>

                <Progress value={reviewProgress} className="h-2 w-full" />

                <div className="flex flex-wrap items-center gap-5 pt-1 text-2xs">
                  <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <Bookmark className="size-3.5 text-emerald-500" />
                    <span>
                      <strong className="font-bold">{keptCount}</strong> Kept
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-destructive">
                    <Trash2 className="size-3.5 text-destructive" />
                    <span>
                      <strong className="font-bold">{trashCount}</strong> Marked
                      for Delete
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                    <Clock className="size-3.5 text-amber-500" />
                    <span>
                      <strong className="font-bold">{pendingCount}</strong>{" "}
                      Pending Review
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cleanup Shortcuts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold text-foreground">
                Browse Shortcuts
              </h2>
              <span className="text-2xs text-muted-foreground">
                Click to view filtered items
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Duplicate Media */}
              <Card
                className="group cursor-pointer border-primary/20 bg-card/50 transition-all hover:bg-card/80"
                onClick={() => navigateToFiltered("duplicates")}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-md bg-muted p-2">
                      <Copy className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        Duplicate Media
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-2xs text-muted-foreground">
                        {duplicateItems.length} copies ({duplicateGroupsCount}{" "}
                        stacks)
                      </CardDescription>
                    </div>
                  </div>
                  {duplicateSavedBytes > 0 && (
                    <Badge variant="secondary" className="text-2xs">
                      Save {formatBytes(duplicateSavedBytes)}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-2xs text-muted-foreground">
                  <span>Review duplicate media</span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>

              {/* Blurry Media */}
              <Card
                className="group cursor-pointer border-border bg-card/50 transition-all hover:bg-card/80"
                onClick={() => navigateToFiltered("blurry")}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-md bg-muted p-2 text-foreground">
                      <Focus className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        Blurry Media
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-2xs text-muted-foreground">
                        {blurryItems.length} failed sharpness check
                      </CardDescription>
                    </div>
                  </div>
                  {blurrySavedBytes > 0 ? (
                    <Badge variant="secondary" className="text-2xs">
                      Save {formatBytes(blurrySavedBytes)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-2xs">
                      {blurryItems.length} items
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-2xs text-muted-foreground">
                  <span>Review blurry media</span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>

              {/* Screenshots */}
              <Card
                className="group cursor-pointer border-border bg-card/50 transition-all hover:bg-card/80"
                onClick={() => navigateToFiltered("screenshots")}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-md bg-muted p-2 text-foreground">
                      <Monitor className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        Screenshots
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-2xs text-muted-foreground">
                        {screenshotItems.length} screen captures
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-2xs">
                    {screenshotItems.length} items
                  </Badge>
                </CardHeader>
                <CardContent className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-2xs text-muted-foreground">
                  <span>Review screenshots</span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>

              {/* Dark Media */}
              <Card
                className="group cursor-pointer border-border bg-card/50 transition-all hover:bg-card/80"
                onClick={() => navigateToFiltered("dark")}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-md bg-muted p-2 text-foreground">
                      <SunMoon className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        Dark Media
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-2xs text-muted-foreground">
                        {darkItems.length} low-light media
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-2xs">
                    {darkItems.length} items
                  </Badge>
                </CardHeader>
                <CardContent className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-2xs text-muted-foreground">
                  <span>Review dark media</span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>

              {/* Low Resolution */}
              <Card
                className="group cursor-pointer border-border bg-card/50 transition-all hover:bg-card/80"
                onClick={() => navigateToFiltered("small")}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-md bg-muted p-2 text-foreground">
                      <Minimize className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        Low Resolution
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-2xs text-muted-foreground">
                        {smallItems.length} small files
                      </CardDescription>
                    </div>
                  </div>
                  {smallSavedBytes > 0 ? (
                    <Badge variant="secondary" className="text-2xs">
                      Save {formatBytes(smallSavedBytes)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-2xs">
                      {smallItems.length} items
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-2xs text-muted-foreground">
                  <span>Review small files</span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>

              {/* Space Hogs */}
              <Card
                className="group cursor-pointer border-border bg-card/50 transition-all hover:bg-card/80"
                onClick={() => navigateToFiltered("all", "size-desc")}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-md bg-muted p-2 text-foreground">
                      <HardDrive className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        Space Hogs
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-2xs text-muted-foreground">
                        Largest files in library
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-2xs">
                    Size Sort
                  </Badge>
                </CardHeader>
                <CardContent className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-2xs text-muted-foreground">
                  <span>Find largest space-wasting files</span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Vertical Quick Actions Card */}
        <div className="space-y-3 lg:col-span-1">
          <h2 className="font-heading text-sm font-bold text-foreground">
            Quick Actions
          </h2>
          <Card className="border-border bg-card/60">
            <CardContent className="space-y-3 p-4">
              {/* Main Feature 1: Start Culling Session */}
              <button
                type="button"
                className="group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setFilterReviewState("pending")
                  setCurrentView("review")
                }}
                disabled={totalFiles === 0}
              >
                <div className="shrink-0 rounded-md bg-primary p-2 text-primary-foreground transition-transform group-hover:scale-105">
                  <CheckSquare className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                    Start Culling Session
                  </span>
                  <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                    Decide which media to keep or delete
                  </p>
                </div>
              </button>

              {/* Main Feature 2: Resolve Duplicates */}
              <button
                type="button"
                className="group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setCurrentView("duplicates")}
                disabled={totalFiles === 0}
              >
                <div className="shrink-0 rounded-md bg-primary p-2 text-primary-foreground transition-transform group-hover:scale-105">
                  <Copy className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                    Resolve Duplicates
                  </span>
                  <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                    Audit duplicate stacks & pick the best shot
                  </p>
                </div>
              </button>

              {/* Main Feature 3: Organize Files by Date */}
              <button
                type="button"
                className="group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setCurrentView("organize")}
                disabled={totalFiles === 0}
              >
                <div className="shrink-0 rounded-md bg-primary p-2 text-primary-foreground transition-transform group-hover:scale-105">
                  <CalendarDays className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                    Organize Files by Date
                  </span>
                  <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                    Sort media into Year/Month folders
                  </p>
                </div>
              </button>

              {/* Divider for Secondary Actions */}
              <div className="my-1 border-t border-border opacity-50" />

              {/* Secondary Feature 1: Browse Media Library */}
              <button
                type="button"
                className="group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background/40 p-3 text-left transition-colors hover:bg-accent/30"
                onClick={() => setCurrentView("browse")}
              >
                <div className="shrink-0 rounded-md bg-muted/80 p-2 text-foreground transition-transform group-hover:scale-105">
                  <FolderOpen className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground transition-colors group-hover:text-foreground/90">
                    Browse Media Library
                  </span>
                  <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                    Search & filter media collection
                  </p>
                </div>
              </button>

              {/* Secondary Feature 2: Library Settings */}
              <button
                type="button"
                className="group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background/40 p-3 text-left transition-colors hover:bg-accent/30"
                onClick={() => {
                  setActiveSettingsTab("folders")
                  setCurrentView("settings")
                }}
              >
                <div className="shrink-0 rounded-md bg-muted/80 p-2 text-foreground transition-transform group-hover:scale-105">
                  <Settings className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground transition-colors group-hover:text-foreground/90">
                    Library Settings
                  </span>
                  <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                    Manage root folders & options
                  </p>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}

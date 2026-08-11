import React from "react"
import { useUIStore } from "../../stores/ui-store"
import { useMediaStore } from "../../stores/media-store"
import { useSettingsStore } from "../../stores/settings-store"
import { useScanStore } from "../../stores/scan-store"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import {
  Play,
  Square,
  Moon,
  Sun,
  Laptop,
  ChevronDown,
  RefreshCw,
  Loader2,
  Search,
  Info,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useSessionStore } from "../../stores/session-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"
import { ENABLE_AI_FEATURES } from "../../../shared/constants"
import { helpComponentsMap, DefaultHelp } from "./help"

// Isolated subcomponents for active task pills so high-frequency progress ticks
// (e.g. per-file scanning progress) only re-render the individual pill's progress/text elements,
// keeping the main TopBar (title, search bar, icons, and CSS animations) from re-rendering.

const ScanningPill = React.memo<{
  isStopping: boolean
  onStopScan: () => void
}>(({ isStopping, onStopScan }) => {
  const scanProgress = useScanStore((state) => state.scanProgress)
  const pct =
    scanProgress.totalCount > 0
      ? Math.round((scanProgress.scannedCount / scanProgress.totalCount) * 100)
      : 0
  const fileName =
    scanProgress.currentFile && !isStopping
      ? scanProgress.currentFile.split(/[/\\]/).pop()
      : ""

  return (
    <div
      style={{ viewTransitionName: "scan-pill-container" }}
      className="flex h-9 shrink-0 items-center gap-2 sm:gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 sm:px-3.5 animate-in fade-in duration-200"
    >
      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0 stroke-[2.5]" />
      <div className="flex flex-col min-w-0 justify-center leading-tight">
        <span className="text-xs font-semibold text-foreground truncate">
          {isStopping ? "Stopping..." : "Scanning"}
        </span>
        {fileName && (
          <span
            className="hidden xl:inline-block max-w-[120px] truncate text-2xs font-mono text-muted-foreground"
            title={scanProgress.currentFile}
          >
            {fileName}
          </span>
        )}
      </div>

      <div className="hidden lg:block w-12 xl:w-16 shrink-0 h-1 rounded-full bg-primary/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs font-bold text-primary tabular-nums shrink-0">
        {pct}%
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 cursor-pointer rounded-md bg-primary/10 hover:bg-primary/20 text-primary"
            onClick={onStopScan}
            disabled={isStopping}
          >
            {isStopping ? (
              <Loader2 className="h-3 w-3 animate-spin stroke-[2.5]" />
            ) : (
              <Square className="h-2.5 w-2.5 fill-current" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isStopping ? "Stopping scan..." : "Stop Scan"}
        </TooltipContent>
      </Tooltip>
    </div>
  )
})
ScanningPill.displayName = "ScanningPill"

const AIDownloadPill = React.memo(() => {
  const aiDownloadProgress = useScanStore((state) => state.aiDownloadProgress)
  return (
    <div
      style={{ viewTransitionName: "scan-pill-container" }}
      className="flex h-9 shrink-0 items-center gap-2 sm:gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 sm:px-3.5 animate-in fade-in duration-200"
    >
      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="hidden md:inline-block text-xs font-semibold text-foreground shrink-0">AI Model</span>
      <div className="hidden lg:block w-12 xl:w-16 shrink-0 h-1 rounded-full bg-primary/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${aiDownloadProgress}%` }}
        />
      </div>
      <span className="font-mono text-xs font-bold text-primary tabular-nums shrink-0">
        {aiDownloadProgress}%
      </span>
    </div>
  )
})
AIDownloadPill.displayName = "AIDownloadPill"

const PostProcessingPill = React.memo(() => {
  return (
    <div
      style={{ viewTransitionName: "scan-pill-container" }}
      className="flex h-9 shrink-0 items-center gap-2 sm:gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 sm:px-3.5 animate-in fade-in duration-200"
    >
      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0 stroke-[2.5]" />
      <span className="text-xs font-semibold text-foreground shrink-0">Post-Processing</span>
      <div className="relative hidden lg:block w-12 xl:w-16 shrink-0 h-1 overflow-hidden rounded-full bg-primary/20">
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ width: "50%", animation: "shimmer-slide 1.4s ease-in-out infinite" }}
        />
      </div>
    </div>
  )
})
PostProcessingPill.displayName = "PostProcessingPill"

const AIIndexingPill = React.memo(() => {
  const aiIndexingProgress = useScanStore((state) => state.aiIndexingProgress)
  const pct =
    aiIndexingProgress.totalCount > 0
      ? Math.round(
          (aiIndexingProgress.processedCount / aiIndexingProgress.totalCount) *
            100
        )
      : 0
  return (
    <div
      style={{ viewTransitionName: "scan-pill-container" }}
      className="flex h-9 shrink-0 items-center gap-2 sm:gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 sm:px-3.5 animate-in fade-in duration-200"
    >
      <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
      <span className="hidden md:inline-block text-xs font-semibold text-foreground shrink-0">AI Indexing</span>
      <div className="hidden lg:block w-12 xl:w-16 shrink-0 h-1 rounded-full bg-primary/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs font-bold text-primary tabular-nums shrink-0">
        {pct}%
      </span>
    </div>
  )
})
AIIndexingPill.displayName = "AIIndexingPill"

const TrashingPill = React.memo(() => {
  const trashingProgress = useSessionStore((state) => state.trashingProgress)
  const pct =
    trashingProgress && trashingProgress.totalCount > 0
      ? Math.round(
          (trashingProgress.successCount / trashingProgress.totalCount) * 100
        )
      : 0
  return (
    <div
      style={{ viewTransitionName: "scan-pill-container" }}
      className="flex h-9 shrink-0 items-center gap-2 sm:gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 sm:px-3.5 animate-in fade-in duration-200"
    >
      <Trash2 className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
      <span className="hidden md:inline-block text-xs font-semibold text-foreground shrink-0">
        {trashingProgress?.isDone ? "Trashed" : "Trashing..."}
      </span>
      <div className="hidden lg:block w-12 xl:w-16 shrink-0 h-1 rounded-full bg-primary/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs font-bold text-primary tabular-nums shrink-0">
        {pct}%
      </span>
    </div>
  )
})
TrashingPill.displayName = "TrashingPill"

const MultiTaskPill = React.memo<{
  isScanActive: boolean
  isStopping: boolean
  isPostProcessingActive: boolean
  isAIIndexingActive: boolean
  isAIDownloadingActive: boolean
  isTrashingActive: boolean
  onStopScan: () => void
}>(
  ({
    isScanActive,
    isStopping,
    isPostProcessingActive,
    isAIIndexingActive,
    isAIDownloadingActive,
    isTrashingActive,
    onStopScan,
  }) => {
    const scanProgress = useScanStore((state) => state.scanProgress)
    const aiDownloadProgress = useScanStore((state) => state.aiDownloadProgress)
    const aiIndexingProgress = useScanStore((state) => state.aiIndexingProgress)
    const trashingProgress = useSessionStore((state) => state.trashingProgress)

    const activeTasks: Array<{
      id: string
      title: string
      subtitle: string
      progress: number
      icon: React.ReactNode
      action?: React.ReactNode
    }> = []

    if (isAIDownloadingActive) {
      activeTasks.push({
        id: "ai-download",
        title: "AI Search Model",
        subtitle: "Downloading weights (~200MB)",
        progress: aiDownloadProgress,
        icon: <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />,
      })
    }

    if (isScanActive) {
      const pct =
        scanProgress.totalCount > 0
          ? Math.round((scanProgress.scannedCount / scanProgress.totalCount) * 100)
          : 0
      activeTasks.push({
        id: "scan",
        title: "Folder Scanning",
        subtitle: isStopping
          ? "Stopping..."
          : scanProgress.currentFile || "Reading files...",
        progress: pct,
        icon: <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />,
        action: (
          <Tooltip key="stop-scan-item">
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="h-6 w-6 shrink-0 cursor-pointer rounded-md"
                onClick={onStopScan}
                disabled={isStopping}
              >
                {isStopping ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Square className="h-2.5 w-2.5 fill-current" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isStopping ? "Stopping scan..." : "Stop Scan"}
            </TooltipContent>
          </Tooltip>
        ),
      })
    }

    if (isPostProcessingActive) {
      activeTasks.push({
        id: "post-processing",
        title: "Post-Processing",
        subtitle: "Analyzing duplicates & similarity...",
        progress: 100,
        icon: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />,
      })
    }

    if (isAIIndexingActive) {
      const pct =
        aiIndexingProgress.totalCount > 0
          ? Math.round(
              (aiIndexingProgress.processedCount /
                aiIndexingProgress.totalCount) *
                100
            )
          : 0
      activeTasks.push({
        id: "ai-index",
        title: "AI Indexing",
        subtitle: aiIndexingProgress.currentFile || "Indexing background...",
        progress: pct,
        icon: <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-500 shrink-0" />,
      })
    }

    if (isTrashingActive && trashingProgress) {
      const pct =
        trashingProgress.totalCount > 0
          ? Math.round(
              (trashingProgress.successCount / trashingProgress.totalCount) * 100
            )
          : 0
      activeTasks.push({
        id: "trashing",
        title: trashingProgress.label,
        subtitle: trashingProgress.isDone
          ? `Trashed ${trashingProgress.successCount} files`
          : `Trashing ${trashingProgress.successCount} / ${trashingProgress.totalCount}`,
        progress: trashingProgress.isDone ? 100 : pct,
        icon: <Trash2 className="h-3.5 w-3.5 text-destructive animate-pulse shrink-0" />,
      })
    }

    const combinedProgress =
      activeTasks.length > 0
        ? Math.round(
            activeTasks.reduce((acc, task) => acc + task.progress, 0) /
              activeTasks.length
          )
        : 0

    return (
      <HoverCard openDelay={100} closeDelay={150}>
        <HoverCardTrigger asChild>
          <div
            style={{ viewTransitionName: "scan-pill-container" }}
            className="flex h-9 shrink-0 items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 select-none cursor-pointer hover:bg-primary/10 transition-colors animate-in fade-in duration-200"
          >
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
            <span className="text-xs font-semibold text-foreground shrink-0">
              {activeTasks.length} Operations
            </span>
            <div className="hidden lg:block w-12 xl:w-16 shrink-0 h-1 rounded-full bg-primary/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${combinedProgress}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-primary tabular-nums shrink-0">
              {combinedProgress}%
            </span>
            {isScanActive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 cursor-pointer rounded-md bg-primary/10 hover:bg-primary/20 text-primary"
                    onClick={onStopScan}
                    disabled={isStopping}
                  >
                    {isStopping ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Square className="h-2.5 w-2.5 fill-current" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isStopping ? "Stopping scan..." : "Stop Scan"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </HoverCardTrigger>

        <HoverCardContent
          align="end"
          className="w-80 border-border bg-card/95 p-3.5 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
            <span className="text-xs font-bold text-foreground">
              Active Operations ({activeTasks.length})
            </span>
            <span className="font-mono text-xs font-semibold text-primary tabular-nums">
              Avg {combinedProgress}%
            </span>
          </div>

          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="space-y-1.5 rounded-lg border border-border/40 bg-background/50 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {task.icon}
                    <span className="text-2xs font-semibold text-foreground truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-2xs font-semibold text-muted-foreground tabular-nums">
                      {task.progress}%
                    </span>
                    {task.action}
                  </div>
                </div>
                <Progress
                  value={task.progress}
                  className="h-1 rounded-full bg-muted/60"
                />
                <p
                  className="truncate text-2xs text-muted-foreground"
                  title={task.subtitle}
                >
                  {task.subtitle}
                </p>
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }
)
MultiTaskPill.displayName = "MultiTaskPill"

export const TopBar: React.FC = () => {
  const { currentView, setCurrentView } = useUIStore()
  const { theme, setTheme } = useTheme()
  const searchQuery = useMediaStore((state) => state.searchQuery)
  const setSearchQuery = useMediaStore((state) => state.setSearchQuery)
  const isScanning = useScanStore((state) => state.isScanning)
  const isStopping = useScanStore((state) => state.isStopping)
  const isPostProcessing = useScanStore((state) => state.isPostProcessing)
  const startScan = useScanStore((state) => state.startScan)
  const cancelScan = useScanStore((state) => state.cancelScan)
  const aiStatus = useScanStore((state) => state.aiStatus)
  const checkAIStatus = useScanStore((state) => state.checkAIStatus)
  const isDownloadingAI = useScanStore((state) => state.isDownloadingAI)
  const isAIIndexing = useScanStore((state) => Boolean(state.aiIndexingProgress?.isIndexing))
  const isTrashing = useSessionStore((state) => Boolean(state.trashingProgress))
  const folderCounts = useScanStore((state) => state.folderCounts)
  const { settings, saveSettings } = useSettingsStore()

  const [showRescanDialog, setShowRescanDialog] = React.useState(false)
  const [showSelectiveScanDialog, setShowSelectiveScanDialog] = React.useState(false)
  const [selectedPaths, setSelectedPaths] = React.useState<string[]>([])
  const [showInfoDialog, setShowInfoDialog] = React.useState(false)

  const [localSearch, setLocalSearch] = React.useState(searchQuery)
  const [prevSearchQuery, setPrevSearchQuery] = React.useState(searchQuery)
  const searchTimeoutRef = React.useRef<number | null>(null)
  const scanGroupRef = React.useRef<HTMLDivElement>(null)
  const [scanGroupWidth, setScanGroupWidth] = React.useState(0)

  React.useEffect(() => {
    checkAIStatus()
  }, [checkAIStatus])

  React.useEffect(() => {
    const el = scanGroupRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setScanGroupWidth(el.offsetWidth)
    })
    observer.observe(el)
    setScanGroupWidth(el.offsetWidth)
    return () => observer.disconnect()
  }, [])

  // Sync global search query back to local input (e.g. if cleared from store)
  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery)
    setLocalSearch(searchQuery)
  }

  // Onboarding: Auto-open page info dialog on first visit to Media Culling
  React.useEffect(() => {
    if (currentView === "review") {
      const hasVisited = localStorage.getItem("galleo_visited_review")
      if (!hasVisited) {
        localStorage.setItem("galleo_visited_review", "true")
        setTimeout(() => setShowInfoDialog(true), 0)
      }
    }
  }, [currentView])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleSearchSubmit = () => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }
    setSearchQuery(localSearch)
    if (currentView === "dashboard" && localSearch.trim().length > 0) {
      setCurrentView("browse")
    }
  }

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      setSearchQuery(value)
      if (currentView === "dashboard" && value.trim().length > 0) {
        setCurrentView("browse")
      }
    }, 300)
  }

  const handleOpenRescanDialog = () => {
    const enabledRoots = settings.folders.roots
      .filter((r) => r.enabled)
      .map((r) => r.path)
    setSelectedPaths(enabledRoots)
    setShowRescanDialog(true)
  }

  const handleOpenSelectiveScanDialog = () => {
    const enabledRoots = settings.folders.roots
      .filter((r) => r.enabled)
      .map((r) => r.path)
    setSelectedPaths(enabledRoots)
    setShowSelectiveScanDialog(true)
  }

  const handleStartSelectiveScan = () => {
    if (selectedPaths.length > 0) {
      startScan(selectedPaths)
      setShowSelectiveScanDialog(false)
    }
  }

  const handleToggleFolder = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const handleToggleSelectAll = () => {
    const allPaths = settings.folders.roots.map((r) => r.path)
    if (selectedPaths.length === allPaths.length) {
      setSelectedPaths([])
    } else {
      setSelectedPaths(allPaths)
    }
  }

  const handleStartForcedRescan = () => {
    if (selectedPaths.length > 0) {
      startScan(selectedPaths, true)
      setShowRescanDialog(false)
    }
  }

  const getTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard"
      case "browse":
        return "Browse Media"
      case "review":
        return "Media Culling"
      case "duplicates":
        return "Duplicate Audit"
      case "organize":
        return "Date Organizer"
      case "settings":
        return "Settings"
      default:
        return "Galleo"
    }
  }

  const activeRootPath = useMediaStore((state) => state.activeRootPath)
  const isFolderViewActive = Boolean(
    activeRootPath && activeRootPath !== "all"
  )
  const activeFolderName = React.useMemo(() => {
    if (!activeRootPath || activeRootPath === "all") return null
    const root = settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )
    return (
      root?.label ||
      activeRootPath.split(/[\\/]/).filter(Boolean).pop() ||
      "Active Folder"
    )
  }, [activeRootPath, settings.folders.roots])

  const handleScanClick = () => {
    if (isScanning) {
      cancelScan()
    } else {
      const enabledRoots = settings.folders.roots.filter((r) => r.enabled)
      if (activeRootPath && activeRootPath !== "all") {
        const match = enabledRoots.find(
          (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
        )
        if (match) {
          startScan([match.path])
          return
        }
      }
      const enabledPaths = enabledRoots.map((r) => r.path)
      if (enabledPaths.length > 0) {
        startScan(enabledPaths)
      }
    }
  }

  const handleScanAllFolders = () => {
    if (isScanning) {
      cancelScan()
    } else {
      const enabledRoots = settings.folders.roots
        .filter((r) => r.enabled)
        .map((r) => r.path)
      if (enabledRoots.length > 0) {
        startScan(enabledRoots)
      }
    }
  }

  const handleScanVisualIndex = async () => {
    if (typeof window !== "undefined" && window.api?.ai?.startIndexing) {
      try {
        await window.api.ai.startIndexing()
      } catch (e) {
        console.error("Failed to start visual indexing", e)
      }
    }
  }

  const cycleTheme = async () => {
    const nextTheme: "dark" | "light" | "system" =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system"
    setTheme(nextTheme)

    // Persist theme to database settings
    const updated = {
      ...settings,
      ui: {
        ...settings.ui,
        theme: nextTheme,
      },
    }
    await saveSettings(updated)
  }

  const renderThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4 text-foreground" />
      case "dark":
        return <Moon className="h-4 w-4 text-foreground" />
      default:
        return <Laptop className="h-4 w-4 text-foreground" />
    }
  }

  // Active task boolean flags for TopBar (none of these change during scanning progress ticks!)
  const isAIDownloadingActive = ENABLE_AI_FEATURES && isDownloadingAI
  const isScanActive = isScanning
  const isPostProcessingActive = isPostProcessing && !isScanning
  const isAIIndexingActive =
    ENABLE_AI_FEATURES &&
    !isScanning &&
    !isPostProcessing &&
    isAIIndexing
  const isTrashingActive = isTrashing

  const activeTaskCount =
    (isAIDownloadingActive ? 1 : 0) +
    (isScanActive ? 1 : 0) +
    (isPostProcessingActive ? 1 : 0) +
    (isAIIndexingActive ? 1 : 0) +
    (isTrashingActive ? 1 : 0)

  return (
    <header className="flex h-16 items-center justify-between gap-2 sm:gap-3 border-b border-border bg-card/45 px-3 sm:px-6 backdrop-blur-sm select-none min-w-0">
      {/* Title & Trigger */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 min-w-0">
        <SidebarTrigger className="h-8 w-8 rounded-lg border border-border bg-background/50 text-muted-foreground hover:text-foreground shrink-0" />
        <h2 className="font-heading text-base sm:text-lg leading-none font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">
          {getTitle()}
        </h2>

        {/* Subtle Page Info Help Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              onClick={() => setShowInfoDialog(true)}
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Help</TooltipContent>
        </Tooltip>
      </div>

      {/* Centered Search Bar (Only shown on Browse/Dashboard views) */}
      <div className="flex flex-1 items-center justify-center px-1 sm:px-2 min-w-0">
        {(currentView === "browse" || currentView === "dashboard") && (
          <div className="relative w-full max-w-sm min-w-0">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground shrink-0" />
            <Input
              type="text"
              placeholder={
                ENABLE_AI_FEATURES && aiStatus?.isDownloaded
                  ? "Search by concept..."
                  : "Search files..."
              }
              className="h-9 w-full min-w-0 truncate rounded-lg border-border bg-background/50 pl-9 pr-8 text-xs focus-visible:ring-1 focus-visible:ring-primary"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit()
                }
              }}
            />
            {ENABLE_AI_FEATURES && aiStatus?.isDownloaded && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Sparkles className="absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-2xs">
                  Visual AI Search Active
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Global Actions */}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* Scan Controls & Unified Progress */}
        {settings.folders.roots.some((r) => r.enabled) && (
          <div className="flex items-center gap-2">
            {activeTaskCount > 1 ? (
              <MultiTaskPill
                isScanActive={isScanActive}
                isStopping={isStopping}
                isPostProcessingActive={isPostProcessingActive}
                isAIIndexingActive={isAIIndexingActive}
                isAIDownloadingActive={isAIDownloadingActive}
                isTrashingActive={isTrashing}
                onStopScan={handleScanClick}
              />
            ) : activeTaskCount === 1 ? (
              isAIDownloadingActive ? (
                <AIDownloadPill />
              ) : isPostProcessingActive ? (
                <PostProcessingPill />
              ) : isAIIndexingActive ? (
                <AIIndexingPill />
              ) : isTrashing ? (
                <TrashingPill />
              ) : (
                <ScanningPill isStopping={isStopping} onStopScan={handleScanClick} />
              )
            ) : (
              <div
                ref={scanGroupRef}
                style={{ viewTransitionName: "scan-pill-container" }}
                className="flex items-center -space-x-px animate-in fade-in duration-200"
              >
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 cursor-pointer gap-2 rounded-l-lg border-r border-primary-foreground/15 px-3.5 text-xs font-medium shadow-sm"
                  onClick={handleScanClick}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span className="hidden lg:inline">
                    {isFolderViewActive ? `Scan ${activeFolderName}` : "Scan All Folders"}
                  </span>
                  <span className="inline lg:hidden">
                    {isFolderViewActive ? "Scan Folder" : "Scan All"}
                  </span>
                </Button>
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open && scanGroupRef.current) {
                      setScanGroupWidth(scanGroupRef.current.offsetWidth)
                    }
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-9 w-7 cursor-pointer rounded-r-lg px-0 shadow-sm"
                    >
                      <ChevronDown className="h-3.5 w-3.5 text-primary-foreground/90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    style={{
                      width: scanGroupWidth ? `${scanGroupWidth}px` : undefined,
                      minWidth: scanGroupWidth ? `${scanGroupWidth}px` : undefined,
                    }}
                    className="border-border bg-card/95 font-sans text-xs text-foreground backdrop-blur-md"
                  >
                    {isFolderViewActive && (
                      <DropdownMenuItem
                        onClick={handleScanAllFolders}
                        className="cursor-pointer gap-2"
                      >
                        <Play className="h-3.5 w-3.5 text-muted-foreground group-data-[highlighted]/dropdown-menu-item:text-accent-foreground" />
                        Scan All Folders
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleOpenSelectiveScanDialog}
                      className="cursor-pointer gap-2"
                    >
                      <Play className="h-3.5 w-3.5 text-muted-foreground group-data-[highlighted]/dropdown-menu-item:text-accent-foreground" />
                      Scan Folders...
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleOpenRescanDialog}
                      className="cursor-pointer gap-2 font-medium"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                      Force Rescan...
                    </DropdownMenuItem>
                    {ENABLE_AI_FEATURES && aiStatus?.isDownloaded && (
                      <DropdownMenuItem
                        onClick={handleScanVisualIndex}
                        className="cursor-pointer gap-2 font-medium"
                        disabled={isAIIndexing}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                        Scan Visual Index
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg border-border hover:bg-accent"
              onClick={cycleTheme}
            >
              {renderThemeIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle Theme</TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={showSelectiveScanDialog} onOpenChange={setShowSelectiveScanDialog}>
        <DialogContent className="max-w-md gap-5 border border-border bg-card p-6 font-sans text-foreground outline-none">
          <DialogHeader className="space-y-1.5 border-b border-border pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-sm font-bold text-foreground">
              <Play className="h-4 w-4 fill-primary/20 text-primary" />
              Scan Selected Folders
            </DialogTitle>
            <DialogDescription className="text-2xs leading-normal text-muted-foreground">
              Choose which folders to scan. Only new or changed files will be
              indexed — existing metadata is preserved.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                Select Folders
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer px-2 text-2xs font-semibold text-primary hover:bg-primary/5 hover:text-primary/80"
                onClick={handleToggleSelectAll}
              >
                {selectedPaths.length === settings.folders.roots.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="max-h-56 scrollbar-thin space-y-2 overflow-y-auto pr-1">
              {settings.folders.roots.map((root) => {
                const isChecked = selectedPaths.includes(root.path)
                return (
                  <div
                    key={root.path}
                    onClick={() => handleToggleFolder(root.path)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-150 select-none ${
                      isChecked
                        ? "border-primary/45 bg-primary/5 hover:bg-primary/10"
                        : "border-border bg-background/40 hover:bg-accent/40"
                    }`}
                  >
                    <Checkbox
                      id={`selective-folder-${root.path}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleFolder(root.path)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <Label
                        htmlFor={`selective-folder-${root.path}`}
                        className="cursor-pointer truncate text-xs font-semibold text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {root.label}
                      </Label>
                      <span className="truncate text-2xs leading-normal text-muted-foreground">
                        {root.path}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="mt-1 gap-2.5 border-t border-border pt-4">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="h-9 cursor-pointer px-4 text-xs font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="default"
              className="h-9 cursor-pointer bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/95"
              disabled={selectedPaths.length === 0}
              onClick={handleStartSelectiveScan}
            >
              Start Scan ({selectedPaths.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRescanDialog} onOpenChange={setShowRescanDialog}>
        <DialogContent className="max-w-md gap-5 border border-border bg-card p-6 font-sans text-foreground outline-none">
          <DialogHeader className="space-y-1.5 border-b border-border pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-sm font-bold text-foreground">
              <RefreshCw className="h-4.5 w-4.5 text-primary" />
              Force Rescan Folders
            </DialogTitle>
            <DialogDescription className="text-2xs leading-normal text-muted-foreground">
              Bypass cached metadata and re-analyze all files. This is useful if
              files were edited outside the app, but scanning will take longer.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                Select Folders
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer px-2 text-2xs font-semibold text-primary hover:bg-primary/5 hover:text-primary/80"
                onClick={handleToggleSelectAll}
              >
                {selectedPaths.length === settings.folders.roots.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="max-h-56 scrollbar-thin space-y-2 overflow-y-auto pr-1">
              {settings.folders.roots.map((root) => {
                const isChecked = selectedPaths.includes(root.path)
                const folderData = folderCounts.get(root.path)
                return (
                  <div
                    key={root.path}
                    onClick={() => handleToggleFolder(root.path)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-150 select-none ${
                      isChecked
                        ? "border-primary/45 bg-primary/5 hover:bg-primary/10"
                        : "border-border bg-background/40 hover:bg-accent/40"
                    }`}
                  >
                    <Checkbox
                      id={`rescan-folder-${root.path}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleFolder(root.path)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label
                          htmlFor={`rescan-folder-${root.path}`}
                          className="cursor-pointer truncate text-xs font-semibold text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {root.label}
                        </Label>
                        {folderData?.rescanReason && (
                          <span className="shrink-0 text-2xs font-medium text-amber-500">
                            {folderData.rescanReason}
                          </span>
                        )}
                      </div>
                      <span className="truncate text-2xs leading-normal text-muted-foreground">
                        {root.path}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="mt-1 gap-2.5 border-t border-border pt-4">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="h-9 cursor-pointer px-4 text-xs font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="default"
              className="h-9 cursor-pointer bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/95"
              disabled={selectedPaths.length === 0}
              onClick={handleStartForcedRescan}
            >
              Start Rescan ({selectedPaths.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent
          width="xl"
          className="flex max-h-[85vh] flex-col gap-4 border border-border bg-card/95 p-5 font-sans text-foreground backdrop-blur-md outline-none"
        >
          {(() => {
            const HelpComponent = helpComponentsMap[currentView] || DefaultHelp
            return <HelpComponent />
          })()}
        </DialogContent>
      </Dialog>
    </header>
  )
}

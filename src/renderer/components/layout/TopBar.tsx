import React from "react"
import { useUIStore } from "../../stores/ui-store"
import { useMediaStore } from "../../stores/media-store"
import { useSettingsStore } from "../../stores/settings-store"
import { useScanStore } from "../../stores/scan-store"
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
} from "lucide-react"
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
import { helpComponentsMap, DefaultHelp } from "./help"

export const TopBar: React.FC = () => {
  const { currentView, theme, setTheme, setCurrentView } = useUIStore()
  const searchQuery = useMediaStore((state) => state.searchQuery)
  const setSearchQuery = useMediaStore((state) => state.setSearchQuery)
  const isScanning = useScanStore((state) => state.isScanning)
  const isStopping = useScanStore((state) => state.isStopping)
  const startScan = useScanStore((state) => state.startScan)
  const cancelScan = useScanStore((state) => state.cancelScan)
  const scanProgress = useScanStore((state) => state.scanProgress)
  const { settings } = useSettingsStore()

  const [showRescanDialog, setShowRescanDialog] = React.useState(false)
  const [selectedPaths, setSelectedPaths] = React.useState<string[]>([])
  const [showInfoDialog, setShowInfoDialog] = React.useState(false)

  const [localSearch, setLocalSearch] = React.useState(searchQuery)
  const searchTimeoutRef = React.useRef<any>(null)

  // Sync global search query back to local input (e.g. if cleared from store)
  React.useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  // Onboarding: Auto-open page info dialog on first visit to Media Culling
  React.useEffect(() => {
    if (currentView === "review") {
      const hasVisited = localStorage.getItem("galleo_visited_review")
      if (!hasVisited) {
        setShowInfoDialog(true)
        localStorage.setItem("galleo_visited_review", "true")
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

  const handleScanClick = () => {
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

  const cycleTheme = () => {
    if (theme === "system") setTheme("light")
    else if (theme === "light") setTheme("dark")
    else setTheme("system")
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

  return (
    <header className="relative flex h-16 items-center justify-between gap-4 border-b border-border bg-card/45 px-6 backdrop-blur-sm select-none">
      {/* Title & Trigger */}
      <div className="flex shrink-0 items-center gap-2">
        <SidebarTrigger className="h-8 w-8 rounded-lg border border-border bg-background/50 text-muted-foreground hover:text-foreground" />
        <h2 className="font-heading text-lg leading-none font-bold text-foreground">
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
      {(currentView === "browse" || currentView === "dashboard") && (
        <div className="absolute left-1/2 w-80 max-w-[30%] shrink-0 -translate-x-1/2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files..."
              className="h-9 w-full rounded-lg border-border bg-background/50 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-primary"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit()
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Global Actions */}
      <div className="ml-auto flex shrink-0 items-center gap-4">
        {/* Scan Controls & Unified Progress */}
        {settings.folders.roots.some((r) => r.enabled) && (
          <div className="flex items-center">
            {isScanning ? (
              <div className="flex h-10 items-center gap-3 rounded-xl border border-border bg-background/30 p-1.5 pl-3">
                <div className="flex w-40 flex-col gap-0.5">
                  <div className="flex items-center justify-between text-2xs leading-none">
                    <span className="animate-pulse font-semibold text-primary">
                      {isStopping ? "Stopping..." : "Scanning..."}
                    </span>
                    <span className="font-mono text-3xs font-semibold text-muted-foreground tabular-nums">
                      {scanProgress.totalCount > 0
                        ? `${Math.round((scanProgress.scannedCount / scanProgress.totalCount) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                  <Progress
                    value={
                      scanProgress.totalCount > 0
                        ? (scanProgress.scannedCount /
                            scanProgress.totalCount) *
                          100
                        : 0
                    }
                    className="h-1 rounded-full bg-muted"
                  />
                  <div
                    className="w-40 truncate text-2xs text-muted-foreground"
                    title={scanProgress.currentFile}
                  >
                    {isStopping
                      ? "Finishing DB..."
                      : scanProgress.currentFile || "Reading..."}
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 shrink-0 cursor-pointer rounded-lg"
                      onClick={handleScanClick}
                      disabled={isStopping}
                    >
                      {isStopping ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Square className="h-3 w-3 fill-current" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isStopping ? "Stopping scan..." : "Stop Scan"}
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="flex items-center -space-x-px">
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 cursor-pointer gap-2 rounded-l-lg border-r border-primary-foreground/15 px-3.5 text-xs font-medium shadow-sm"
                  onClick={handleScanClick}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Scan Folders
                </Button>
                <DropdownMenu>
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
                    className="w-36 border-border bg-card/95 font-sans text-xs text-foreground backdrop-blur-md"
                  >
                    <DropdownMenuItem
                      onClick={handleScanClick}
                      className="cursor-pointer gap-2"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Standard Scan
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleOpenRescanDialog}
                      className="cursor-pointer gap-2 font-medium text-primary focus:text-primary"
                    >
                      <Play className="h-3.5 w-3.5 fill-primary/10" />
                      Force Rescan
                    </DropdownMenuItem>
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
                      <Label
                        htmlFor={`rescan-folder-${root.path}`}
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
          className="bg-card/95 border border-border text-foreground font-sans outline-none p-5 max-h-[85vh] flex flex-col gap-4 backdrop-blur-md"
        >
          {(() => {
            const HelpComponent = helpComponentsMap[currentView] || DefaultHelp;
            return <HelpComponent />;
          })()}
        </DialogContent>
      </Dialog>
    </header>
  )
}

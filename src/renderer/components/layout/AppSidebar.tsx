import React, { useState, useEffect } from "react"
import { useUIStore } from "../../stores/ui-store"
import { useSettingsStore } from "../../stores/settings-store"
import { useMediaStore } from "../../stores/media-store"
import { useScanStore } from "../../stores/scan-store"
import { getFileManagerName } from "../../lib/os"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Copy,
  CalendarDays,
  Settings,
  Folder,
  Plus,
  Trash2,
  Aperture,
  Library,
  ScanSearch,
  X,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
  SidebarRail,
  SidebarMenuAction,
  SidebarFooter,
} from "@/components/ui/sidebar"

export const AppSidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    updateInfo,
    checkForUpdates,
    hasRunInitialUpdateCheck,
    dismissedVersion,
    dismissUpdate,
  } = useUIStore()
  const { settings, addRootFolder, removeRootFolder } = useSettingsStore()

  useEffect(() => {
    if (!hasRunInitialUpdateCheck) {
      checkForUpdates()
    }
  }, [hasRunInitialUpdateCheck, checkForUpdates])
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const fetchMediaItems = useMediaStore((s) => s.fetchMediaItems)
  const startScan = useScanStore((s) => s.startScan)
  const isScanning = useScanStore((s) => s.isScanning)

  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [showScanPrompt, setShowScanPrompt] = useState(false)
  const isWizardState = settings.folders.roots.length === 0

  const navItems = [
    { view: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { view: "browse" as const, label: "Browse Media", icon: FolderOpen },
    { view: "review" as const, label: "Media Culling", icon: CheckSquare },
    { view: "duplicates" as const, label: "Duplicate Audit", icon: Copy },
    { view: "organize" as const, label: "Organize Files", icon: CalendarDays },
    { view: "settings" as const, label: "Settings", icon: Settings },
  ]

  const handleAddFolder = async () => {
    try {
      const selected = await window.api.selectFolder()
      if (selected) {
        await addRootFolder(selected)
      }
    } catch (e) {
      console.error("Folder selection failed:", e)
    }
  }

  const handleFolderClick = async (path: string) => {
    const mediaViews = [
      "dashboard",
      "browse",
      "review",
      "duplicates",
      "organize",
    ]
    if (!mediaViews.includes(currentView)) {
      setCurrentView("browse")
    }
    await fetchMediaItems(path)
  }

  const hasAnyScanned = settings.folders.roots.some((r) => r.scanned)

  const handleAllMediaClick = () => {
    handleFolderClick("all")
  }

  const handleScanNow = () => {
    setShowScanPrompt(false)
    const enabledRoots = settings.folders.roots
      .filter((r) => r.enabled)
      .map((r) => r.path)
    if (enabledRoots.length > 0) {
      startScan(enabledRoots)
    }
  }

  return (
    <Sidebar className="border-r border-border bg-card/60">
      <SidebarHeader className="flex flex-row items-center gap-3 border-b border-border p-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-destructive text-primary-foreground">
          <Aperture className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-base font-bold tracking-wider text-foreground">
            Galleo
          </h1>
          <p className="font-sans text-xs text-muted-foreground">
            Smart Cleanup & Organizer
          </p>
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="flex flex-col gap-4 p-4">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.view
              const isDashboardInWizard =
                item.view === "dashboard" && isWizardState
              const label = isDashboardInWizard ? "Setup Wizard" : item.label
              return (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    isActive={isActive}
                    disabled={
                      isWizardState &&
                      item.view !== "settings" &&
                      item.view !== "dashboard"
                    }
                    onClick={() => {
                      setCurrentView(item.view)
                      if (
                        item.view === "settings" &&
                        updateInfo?.updateAvailable &&
                        updateInfo.latestVersion !== dismissedVersion
                      ) {
                        useUIStore.getState().setActiveSettingsTab("about")
                      }
                    }}
                    className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                    {item.view === "settings" &&
                      updateInfo?.updateAvailable &&
                      updateInfo.latestVersion !== dismissedVersion && (
                        <span className="ml-auto flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                      )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="bg-border opacity-50" />

        {/* All Media — standalone, above the Root Directories section */}
        {settings.folders.roots.length > 0 && (
          <SidebarGroup className="p-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      isActive={activeRootPath === "all"}
                      onClick={handleAllMediaClick}
                      className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium transition-colors"
                      disabled={isScanning}
                    >
                      <Library
                        className={`h-4 w-4 shrink-0 ${
                          !hasAnyScanned
                            ? "text-amber-500"
                            : activeRootPath === "all"
                              ? "text-primary"
                              : "text-muted-foreground"
                        }`}
                      />
                      <span className="truncate">All Media</span>
                      {!hasAnyScanned && (
                        <ScanSearch className="ml-auto h-3.5 w-3.5 shrink-0 text-amber-500/80" />
                      )}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {!hasAnyScanned && (
                    <TooltipContent side="right">
                      No folders scanned yet — click to scan now
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarSeparator className="bg-border opacity-50" />

        {/* Source Directories */}
        <SidebarGroup className="flex min-h-0 flex-1 flex-col p-0">
          <div className="mb-2 flex items-center justify-between px-2">
            <SidebarGroupLabel className="p-0 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Root Directories
            </SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={handleAddFolder}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <SidebarGroupContent className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {settings.folders.roots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                No folders added yet
              </div>
            ) : (
              <SidebarMenu className="gap-1">
                {settings.folders.roots.map((root) => {
                  const isScanned = !!root.scanned
                  const label = root.label || root.path
                  const isSelected =
                    activeRootPath?.replace(/\\/g, "/").toLowerCase() ===
                    root.path.replace(/\\/g, "/").toLowerCase()

                  return (
                    <SidebarMenuItem key={root.path}>
                      <ContextMenu>
                        <ContextMenuTrigger className="block w-full">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                isActive={isSelected}
                                onClick={() => {
                                  handleFolderClick(root.path)
                                }}
                                className="w-full justify-start gap-2.5 px-3 py-1.5"
                              >
                                <Folder
                                  className={`h-4 w-4 shrink-0 ${
                                    !isScanned
                                      ? "text-amber-500/80"
                                      : isSelected
                                        ? "text-primary"
                                        : "text-muted-foreground/75"
                                  }`}
                                />
                                <span className="flex-1 truncate font-sans text-xs">
                                  {label}
                                </span>
                                {!isScanned && (
                                  <ScanSearch className="ml-auto h-3.5 w-3.5 shrink-0 text-amber-500/60" />
                                )}
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {root.path} {!isScanned && " (Not Scanned)"}
                            </TooltipContent>
                          </Tooltip>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48 border-border bg-card font-sans text-xs text-foreground">
                          <ContextMenuItem
                            onClick={async () => {
                              await window.api.openFile(root.path)
                            }}
                            className="cursor-pointer gap-2"
                          >
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            Open in {getFileManagerName()}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuAction
                            showOnHover
                            className="h-5 w-5 rounded text-muted-foreground opacity-0 transition-all group-hover/item:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              setFolderToDelete(root.path)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </SidebarMenuAction>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Remove Folder
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {updateInfo?.updateAvailable &&
        updateInfo.latestVersion !== dismissedVersion && (
          <SidebarFooter className="p-3 pt-0">
            <div
              onClick={() => window.api.openExternal(updateInfo.downloadUrl)}
              className="group/update relative flex cursor-pointer items-center justify-between gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-2xs transition-all select-none hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15"
            >
              <span
                className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300"
                title="Click to download new update"
              >
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                Update v{updateInfo.latestVersion}
              </span>
              <div className="flex items-center gap-2">
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    window.api.openExternal(updateInfo.releaseUrl)
                  }}
                  className="font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  title="View release notes"
                >
                  Notes
                </span>
                <span className="h-2.5 w-px bg-border/40" />
                <span
                  className="font-semibold text-emerald-600 group-hover/update:underline dark:text-emerald-400"
                  title="Click to download new update"
                >
                  Download
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  dismissUpdate()
                }}
                className="absolute -top-1.5 -right-1.5 cursor-pointer rounded-full border border-border bg-background p-0.5 text-muted-foreground opacity-0 shadow-xs transition-opacity group-hover/update:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                title="Dismiss update notifier"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </SidebarFooter>
        )}

      {/* Scan prompt — shown when user clicks All Media with no indexed items */}
      <AlertDialog
        open={showScanPrompt}
        onOpenChange={(open) => !open && setShowScanPrompt(false)}
      >
        <AlertDialogContent className="max-w-sm border border-border bg-card/95 p-5 font-sans text-foreground backdrop-blur-md outline-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <ScanSearch className="h-4 w-4 text-amber-500" />
              Scan Folders Required
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1.5 text-xs leading-normal text-muted-foreground">
              Your folders have not been scanned yet. Scan them now to index
              your media library and access the catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer text-xs font-semibold"
              onClick={() => setShowScanPrompt(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              className="h-8 cursor-pointer text-xs font-semibold"
              onClick={handleScanNow}
            >
              Scan Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Alert Dialog for folder removal */}
      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <AlertDialogContent className="max-w-sm border border-border bg-card/95 p-5 font-sans text-foreground backdrop-blur-md outline-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Remove Folder from Galleo
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1.5 text-xs leading-normal text-muted-foreground">
              This removes{" "}
              <span className="font-semibold break-all text-foreground">
                {folderToDelete}
              </span>{" "}
              from Galleo.{" "}
              <span className="font-semibold text-foreground">
                Your actual files are completely safe.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer text-xs font-semibold"
              onClick={() => setFolderToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              className="h-8 cursor-pointer text-xs font-semibold"
              onClick={async () => {
                if (folderToDelete) {
                  await removeRootFolder(folderToDelete)
                  setFolderToDelete(null)
                }
              }}
            >
              Remove Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SidebarRail />
    </Sidebar>
  )
}

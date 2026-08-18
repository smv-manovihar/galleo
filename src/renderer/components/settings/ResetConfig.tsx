import React, { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertTriangle,
  RefreshCcw,
  Database,
  Settings,
  Trash2,
  CalendarDays,
  HardDrive,
  RefreshCw,
  Image,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useSettingsStore } from "../../stores/settings-store"
import { useMediaStore } from "../../stores/media-store"
import { formatBytes } from "../../lib/format"
import type { AppStorageUsage } from "../../../shared/types/ipc"
import { toast } from "sonner"

export const ResetConfig: React.FC = () => {
  const [options, setOptions] = useState({
    settings: false,
    database: false,
    sessions: false,
    cache: false,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<"granular" | "factory">(
    "granular"
  )
  const [storageUsage, setStorageUsage] = useState<AppStorageUsage | null>(null)
  const [isStorageLoading, setIsStorageLoading] = useState(false)

  const fetchMediaItems = useMediaStore((s) => s.fetchMediaItems)
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  const loadStorageUsage = useCallback(async (force = false) => {
    if (typeof window === "undefined" || !window.api?.getStorageUsage) return
    setIsStorageLoading(true)
    try {
      const usage = await window.api.getStorageUsage(force)
      setStorageUsage(usage)
    } catch {
      // ignore
    } finally {
      setIsStorageLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStorageUsage(false)
  }, [loadStorageUsage])

  const handleToggle = (key: keyof typeof options) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleResetExecute = async (mode: "granular" | "factory") => {
    setIsLoading(true)
    setIsAlertOpen(false)

    const resetPayload =
      mode === "factory"
        ? { settings: true, database: true, sessions: true, cache: true }
        : options

    try {
      const res = await window.api.resetApp(resetPayload)
      if (res.ok) {
        // Refresh stores depending on reset choices
        if (resetPayload.settings) {
          await fetchSettings()
        }
        if (resetPayload.database && activeRootPath) {
          await fetchMediaItems(activeRootPath)
        }

        // Reset selections
        setOptions({
          settings: false,
          database: false,
          sessions: false,
          cache: false,
        })

        // Refresh storage usage stats
        await loadStorageUsage()

        toast.success("Application reset executed successfully")
      } else {
        const errMsg =
          res.error.code === "UNKNOWN"
            ? (res.error as { message?: string }).message || "Unknown error"
            : `Error: ${res.error.code}`
        toast.error("Application reset failed", {
          description: errMsg,
        })
      }
    } catch (e: unknown) {
      const err = e as Error
      toast.error("Application reset failed", {
        description: err.message || "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const hasSelection = Object.values(options).some(Boolean)

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      {/* Storage Breakdown Card */}
      <Card className="border-border/60 bg-card/50 shadow-xs py-0 gap-0">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <HardDrive className="size-4 text-primary" />
                Local Storage & Cache Usage
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Disk space occupied by thumbnail previews and metadata index.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStorageUsage(true)}
              disabled={isStorageLoading}
              className="h-8 gap-1.5 px-2.5 text-xs cursor-pointer"
            >
              <RefreshCw
                className={`size-3.5 ${isStorageLoading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Total Storage */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Storage
              </div>
              <div className="text-lg font-bold text-foreground">
                {storageUsage ? formatBytes(storageUsage.totalBytes) : "..."}
              </div>
              <p className="text-2xs text-muted-foreground">
                Database + cached previews
              </p>
            </div>

            {/* Thumbnail Cache */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Image className="size-3 text-primary" />
                  Thumbnails Cache
                </div>
              </div>
              <div className="text-lg font-bold text-foreground">
                {storageUsage ? formatBytes(storageUsage.thumbnailBytes) : "..."}
              </div>
              <p className="text-2xs text-muted-foreground">
                {storageUsage
                  ? `${storageUsage.thumbnailCount.toLocaleString()} cached images/frames`
                  : "Calculating..."}
              </p>
            </div>

            {/* Database & Metadata */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="size-3 text-primary" />
                  Media Database
                </div>
              </div>
              <div className="text-lg font-bold text-foreground">
                {storageUsage ? formatBytes(storageUsage.databaseBytes) : "..."}
              </div>
              <p className="text-2xs text-muted-foreground">
                SQLite index & similarity vectors
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Application Data Card */}
      <Card className="border-border/60 bg-card/50 shadow-xs py-0 gap-0">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <RefreshCcw className="size-4 text-primary" />
            Reset Application Data
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Clear locally cached index databases, review sessions checkpoint logs, or restore defaults.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <Alert
            variant="destructive"
            className="flex gap-3 border-destructive/20 bg-destructive/5 p-4"
          >
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <AlertTitle className="text-xs font-semibold text-destructive">
                Caution
              </AlertTitle>
              <AlertDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Clears cache and metadata database entries only.{" "}
                <strong>
                  Original media files will not be renamed, moved, or deleted.
                </strong>
              </AlertDescription>
            </div>
          </Alert>

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground">
              Granular Reset Options
            </Label>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {/* Reset settings */}
              <div
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-all hover:bg-accent/30 sm:p-4"
                onClick={() => handleToggle("settings")}
              >
                <Checkbox
                  checked={options.settings}
                  onCheckedChange={() => handleToggle("settings")}
                  className="mt-1 shrink-0 border-border focus-visible:ring-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Settings className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">App Configurations</span>
                  </div>
                  <p className="text-xs leading-normal text-muted-foreground">
                    Reset roots, scan rules, quality thresholds, and themes to defaults.
                  </p>
                </div>
              </div>

              {/* Reset Media Index Database */}
              <div
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-all hover:bg-accent/30 sm:p-4"
                onClick={() => handleToggle("database")}
              >
                <Checkbox
                  checked={options.database}
                  onCheckedChange={() => handleToggle("database")}
                  className="mt-1 shrink-0 border-border focus-visible:ring-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">Scanned Media Index</span>
                    </div>
                    {storageUsage && (
                      <Badge variant="outline" className="font-mono text-2xs px-1.5 py-0">
                        {formatBytes(storageUsage.databaseBytes)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-normal text-muted-foreground">
                    Wipe local database index, quality metrics, and file records.
                  </p>
                </div>
              </div>

              {/* Reset Sessions */}
              <div
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-all hover:bg-accent/30 sm:p-4"
                onClick={() => handleToggle("sessions")}
              >
                <Checkbox
                  checked={options.sessions}
                  onCheckedChange={() => handleToggle("sessions")}
                  className="mt-1 shrink-0 border-border focus-visible:ring-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">Review Session Logs</span>
                  </div>
                  <p className="text-xs leading-normal text-muted-foreground">
                    Clear saved review sessions, history decisions, and checkpoint data.
                  </p>
                </div>
              </div>

              {/* Reset cache */}
              <div
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-all hover:bg-accent/30 sm:p-4"
                onClick={() => handleToggle("cache")}
              >
                <Checkbox
                  checked={options.cache}
                  onCheckedChange={() => handleToggle("cache")}
                  className="mt-1 shrink-0 border-border focus-visible:ring-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <Trash2 className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">Thumbnails Cache</span>
                    </div>
                    {storageUsage && (
                      <Badge variant="outline" className="font-mono text-2xs px-1.5 py-0">
                        {formatBytes(storageUsage.thumbnailBytes)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-normal text-muted-foreground">
                    Clear cached image thumbnails from disk to reclaim storage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="mt-6 flex flex-col items-stretch justify-between gap-3 border-t border-border/40 p-4 pt-0 sm:flex-row sm:items-center sm:p-6">
          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isLoading || !hasSelection}
                onClick={() => setConfirmType("granular")}
                className="h-10 w-full cursor-pointer border border-destructive/20 px-4 text-xs font-semibold hover:bg-destructive/90 sm:h-9 sm:w-auto"
              >
                Reset Selected Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-full max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm font-semibold">
                  Confirm Granular Reset
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-xs leading-normal text-muted-foreground">
                  You are about to delete selected categories of data. This
                  action is irreversible. Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 gap-2">
                <AlertDialogCancel className="h-9 cursor-pointer text-xs font-medium">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleResetExecute(confirmType)}
                  className="text-destructive-foreground h-9 cursor-pointer bg-destructive text-xs font-semibold hover:bg-destructive/90"
                >
                  Proceed Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={() => setConfirmType("factory")}
                className="h-10 w-full cursor-pointer px-4 text-xs font-semibold hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-auto"
              >
                Full Factory Reset (Clear All)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-full max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="size-4 shrink-0 text-destructive" />
                  Perform Complete Factory Reset?
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-xs leading-normal text-muted-foreground">
                  This will wipe all app settings, library database tables,
                  checkpoints, active review session decisions, and disk
                  thumbnail caches. Galleo will return to a clean install state.
                  Original media files will remain untouched.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 gap-2">
                <AlertDialogCancel className="h-9 cursor-pointer text-xs font-medium">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleResetExecute("factory")}
                  className="text-destructive-foreground h-9 cursor-pointer bg-destructive text-xs font-semibold hover:bg-destructive/90"
                >
                  Factory Reset App
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  )
}

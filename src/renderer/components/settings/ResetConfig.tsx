import React, { useState } from "react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertTriangle,
  RefreshCcw,
  Database,
  Settings,
  Trash2,
  CalendarDays,
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

  const fetchMediaItems = useMediaStore((s) => s.fetchMediaItems)
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const { fetchSettings } = useSettingsStore()

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

        toast.success("Application reset executed successfully")
      } else {
        const errMsg =
          res.error.code === "UNKNOWN"
            ? (res.error as any).message
            : `Error: ${res.error.code}`
        toast.error("Application reset failed", {
          description: errMsg,
        })
      }
    } catch (e: any) {
      toast.error("Application reset failed", {
        description: e.message || "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const hasSelection = Object.values(options).some(Boolean)

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <RefreshCcw className="h-4 w-4 text-primary" />
            Reset Application Data
          </CardTitle>
          <CardDescription className="mt-0.5 text-xs text-muted-foreground">
            Clear locally cached index databases, review sessions checkpoint
            logs, or restore defaults.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-4 sm:p-6">
          <Alert
            variant="destructive"
            className="flex gap-3 border-destructive/20 bg-destructive/5 p-3.5 sm:p-4"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <AlertTitle className="text-xs font-semibold text-destructive">
                Caution
              </AlertTitle>
              <AlertDescription className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Clears cache and metadata database entries only.{" "}
                <strong>
                  Original media files will not be renamed, moved, or deleted.
                </strong>
              </AlertDescription>
            </div>
          </Alert>

          <div className="space-y-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Granular Reset Options
            </Label>

            <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
              {/* Reset settings */}
              <div
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-all hover:bg-accent/30 sm:p-3.5"
                onClick={() => handleToggle("settings")}
              >
                <Checkbox
                  checked={options.settings}
                  onCheckedChange={() => handleToggle("settings")}
                  className="mt-0.5 shrink-0 border-border focus-visible:ring-1"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Settings className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">App Configurations</span>
                  </div>
                  <p className="text-xs leading-normal text-muted-foreground">
                    Reset roots, scan rules, defect thresholds, and themes to defaults.
                  </p>
                </div>
              </div>

              {/* Reset Media Index Database */}
              <div
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-all hover:bg-accent/30 sm:p-3.5"
                onClick={() => handleToggle("database")}
              >
                <Checkbox
                  checked={options.database}
                  onCheckedChange={() => handleToggle("database")}
                  className="mt-0.5 shrink-0 border-border focus-visible:ring-1"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">Scanned Media Index</span>
                  </div>
                  <p className="text-xs leading-normal text-muted-foreground">
                    Wipe local database index, quality metrics, and file records.
                  </p>
                </div>
              </div>

              {/* Reset Sessions */}
              <div
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-all hover:bg-accent/30 sm:p-3.5"
                onClick={() => handleToggle("sessions")}
              >
                <Checkbox
                  checked={options.sessions}
                  onCheckedChange={() => handleToggle("sessions")}
                  className="mt-0.5 shrink-0 border-border focus-visible:ring-1"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">Review Session Logs</span>
                  </div>
                  <p className="text-xs leading-normal text-muted-foreground">
                    Clear saved review sessions, history decisions, and checkpoint data.
                  </p>
                </div>
              </div>

              {/* Reset cache */}
              <div
                className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition-all hover:bg-accent/30 sm:p-3.5"
                onClick={() => handleToggle("cache")}
              >
                <Checkbox
                  checked={options.cache}
                  onCheckedChange={() => handleToggle("cache")}
                  className="mt-0.5 shrink-0 border-border focus-visible:ring-1"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Trash2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">Thumbnails Cache</span>
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
            <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
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
            <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
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

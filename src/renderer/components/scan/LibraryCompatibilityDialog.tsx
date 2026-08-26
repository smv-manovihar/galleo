import React from "react"
import { useScanStore } from "../../stores/scan-store"
import { useSettingsStore } from "../../stores/settings-store"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Database, RefreshCw, Play } from "lucide-react"
import { FORCE_SHOW_COMPATIBILITY_DIALOG } from "../../../shared/constants"

export const LibraryCompatibilityDialog: React.FC = () => {
  const showCompatibilityDialog = useScanStore((s) => s.showCompatibilityDialog)
  const compatibilityStatus = useScanStore((s) => s.compatibilityStatus)
  const dismissCompatibilityDialog = useScanStore((s) => s.dismissCompatibilityDialog)
  const startScan = useScanStore((s) => s.startScan)
  const isScanning = useScanStore((s) => s.isScanning)
  const folderRoots = useSettingsStore((s) => s.settings.folders.roots)

  const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV)
  const forceShowInDev = isDev && FORCE_SHOW_COMPATIBILITY_DIALOG

  if (!showCompatibilityDialog) {
    return null
  }

  if (!forceShowInDev && !compatibilityStatus?.needsForceRescan) {
    return null
  }

  const issueType = compatibilityStatus?.issueType
  const isInterruptedOnly = issueType === "interrupted"

  const handleScanAction = () => {
    dismissCompatibilityDialog()
    const enabledRoots = folderRoots
      .filter((r) => r.enabled)
      .map((r) => r.path)
    const targetRoots = enabledRoots.length > 0 ? enabledRoots : folderRoots.map((r) => r.path)
    if (targetRoots.length > 0) {
      // Normal scan for interrupted scan; force rescan only for version mismatch or missing columns
      startScan(targetRoots, !isInterruptedOnly)
    }
  }

  // Context-aware dialog titles, descriptions, and actions based on root cause
  let title = "Library Re-Index Required"
  let description = "Your library index is not up to date due to recent changes."
  let noticeHeading = "Features may not work as expected"
  let noticeBody =
    "Please force scan your library to ensure all features and search functions work properly."
  let actionButtonText = "Force Rescan Library"

  if (issueType === "interrupted") {
    title = "Previous Scan Interrupted"
    description = "The app stopped unexpectedly before the previous scan could finish."
    noticeHeading = "Scan incomplete"
    noticeBody =
      "Some files or metadata were not fully indexed. Continue scanning to finish indexing your library."
    actionButtonText = "Resume Scan"
  } else if (issueType === "missing_data") {
    title = "Missing Library Data"
    description = "Some metadata or index columns are missing in your library."
    noticeHeading = "Data missing or corrupted"
    noticeBody =
      "Required metadata is missing due to interrupted operations or database corruption. Please force scan to repair and regenerate your library data."
    actionButtonText = "Force Rescan Library"
  } else if (issueType === "version_mismatch") {
    title = "Library Re-Index Required"
    description = "Your library index is not up to date due to recent app updates."
    noticeHeading = "Features may not work as expected"
    noticeBody =
      "Please force scan your library to update the index schema and ensure all features work properly."
    actionButtonText = "Force Rescan Library"
  }

  return (
    <AlertDialog
      open={showCompatibilityDialog}
      onOpenChange={(open) => {
        if (!open) {
          dismissCompatibilityDialog()
        }
      }}
    >
      <AlertDialogContent className="gap-4 max-w-md">
        <AlertDialogHeader className="flex flex-row items-center gap-3 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <AlertDialogTitle className="text-sm font-bold tracking-tight text-foreground">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <span className="font-semibold block mb-0.5 text-foreground">
            {noticeHeading}
          </span>
          <span className="text-muted-foreground leading-relaxed block">
            {noticeBody}
          </span>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={dismissCompatibilityDialog}
            className="text-xs"
          >
            Remind Me Later
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleScanAction}
            disabled={isScanning}
            className="gap-1.5 text-xs font-semibold"
          >
            {isInterruptedOnly ? (
              <Play className="h-3.5 w-3.5 fill-current" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {actionButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

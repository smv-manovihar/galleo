import React from "react"
import { useMediaStore } from "../../stores/media-store"
import { useScanStore } from "../../stores/scan-store"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FolderNotScannedProps {
  activeRootPath: string
  featureDescription?: string
  className?: string
}

export const FolderNotScanned: React.FC<FolderNotScannedProps> = ({
  activeRootPath,
  featureDescription,
  className,
}) => {
  const items = useMediaStore((s) => s.items)
  const folderCounts = useScanStore((s) => s.folderCounts)
  const isScanning = useScanStore((s) => s.isScanning)

  const hasScannedItems = React.useMemo(() => {
    if (activeRootPath === "all" || !activeRootPath) {
      return items.length > 0
    }
    const normalizedRoot = activeRootPath.replace(/\\/g, "/").toLowerCase()
    return items.some((item) =>
      item.path.replace(/\\/g, "/").toLowerCase().startsWith(normalizedRoot)
    )
  }, [activeRootPath, items])

  const folderData = folderCounts.get(activeRootPath)
  const liveDiskCount = folderData?.count

  const dbCount = React.useMemo(() => {
    if (activeRootPath === "all" || !activeRootPath) {
      return items.length
    }
    const normRoot = activeRootPath.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
    return items.filter((item) => {
      const itemNorm = item.path.replace(/\\/g, "/").toLowerCase()
      return itemNorm === normRoot || itemNorm.startsWith(normRoot + "/")
    }).length
  }, [activeRootPath, items])

  if (isScanning) {
    return null
  }

  const isPartial =
    hasScannedItems &&
    liveDiskCount !== undefined &&
    liveDiskCount > 0 &&
    dbCount < liveDiskCount

  const needsRescan = !isPartial && !!folderData?.needsRescan

  const folderName =
    activeRootPath === "all" || !activeRootPath
      ? "library folders"
      : `"${activeRootPath.split(/[\\/]/).pop() || activeRootPath}"`

  const bannerTitle = hasScannedItems
    ? isPartial
      ? "Folder partially scanned"
      : needsRescan
        ? "Folder changes detected: rescan recommended"
        : "Folder status"
    : "Folder not scanned"

  const rescanReason = folderData?.rescanReason

  const defaultSubtitle = hasScannedItems
    ? isPartial
      ? `scan ${folderName} to index remaining ${liveDiskCount - dbCount} files (${dbCount} of ${liveDiskCount} indexed)`
      : needsRescan
        ? rescanReason
          ? `rescan ${folderName} (${rescanReason})`
          : `rescan ${folderName} to index modified files`
        : `scan ${folderName} to index remaining media files`
    : `scan ${folderName} to index media files`

  const subtitleText = featureDescription
    ? `scan ${folderName} to ${featureDescription}`
    : defaultSubtitle

  const isSkyTheme = needsRescan && !isPartial

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b px-4 py-2 text-xs text-foreground shrink-0 animate-in fade-in duration-200 select-none",
        isSkyTheme
          ? "border-sky-500/20 bg-sky-500/10 dark:bg-sky-500/15"
          : "border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/15",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle
          className={cn(
            "h-4 w-4 shrink-0",
            isSkyTheme
              ? "text-sky-600 dark:text-sky-400"
              : "text-amber-600 dark:text-amber-400"
          )}
        />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-medium text-foreground shrink-0">
            {bannerTitle}
          </span>
          <span className="text-muted-foreground truncate hidden sm:inline">
            - {subtitleText}
          </span>
        </div>
      </div>
    </div>
  )
}


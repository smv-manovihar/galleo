import React from "react"
import { useMediaStore } from "../../stores/media-store"
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

  const hasScannedItems = React.useMemo(() => {
    if (activeRootPath === "all" || !activeRootPath) {
      return items.length > 0
    }
    const normalizedRoot = activeRootPath.replace(/\\/g, "/").toLowerCase()
    return items.some((item) =>
      item.path.replace(/\\/g, "/").toLowerCase().startsWith(normalizedRoot)
    )
  }, [activeRootPath, items])

  const folderName =
    activeRootPath === "all" || !activeRootPath
      ? "library folders"
      : `"${activeRootPath.split(/[\\/]/).pop() || activeRootPath}"`

  const bannerTitle = hasScannedItems
    ? "Folder partially scanned"
    : "Folder not scanned"

  const defaultSubtitle = hasScannedItems
    ? `scan ${folderName} to index remaining media files`
    : `scan ${folderName} to index media files`

  const subtitleText = featureDescription
    ? `scan ${folderName} to ${featureDescription}`
    : defaultSubtitle

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/15 px-4 py-2 text-xs text-foreground shrink-0 animate-in fade-in duration-200 select-none",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
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


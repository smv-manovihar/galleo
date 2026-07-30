import React from "react"
import { DateOrganizer } from "../components/organize/DateOrganizer"
import { useMediaStore } from "../stores/media-store"
import { useSettingsStore } from "../stores/settings-store"
import { PageContainer } from "@/components/ui/page-layout"
import { FolderSearch } from "lucide-react"

export const OrganizeFilesPage: React.FC = () => {
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const items = useMediaStore((s) => s.items)
  const { settings } = useSettingsStore()

  const isScanned = React.useMemo(() => {
    if (!activeRootPath || activeRootPath === "all") {
      return settings.folders.roots.some((r) => r.enabled && r.scanned)
    }
    return !!settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned
  }, [activeRootPath, settings.folders.roots])

  if (!activeRootPath) {
    return (
      <PageContainer
        className="flex h-full min-h-100 flex-1 flex-col items-center justify-center font-sans text-xs select-none"
        maxWidth="xl"
      >
        <div className="flex flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
          <FolderSearch className="h-8 w-8 text-muted-foreground/60 mb-1" />
          <span className="text-sm font-medium text-foreground">No Folder Selected</span>
          <span className="text-2xs text-muted-foreground">Please select a folder from the sidebar directory listing to begin.</span>
        </div>
      </PageContainer>
    )
  }

  if (items.length === 0) {
    return (
      <PageContainer
        className="flex h-full min-h-100 flex-1 flex-col items-center justify-center font-sans text-xs select-none"
        maxWidth="xl"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center text-muted-foreground">
          {!isScanned ? (
            <>
              <FolderSearch className="h-8 w-8 text-amber-500/80 mb-1" />
              <span className="text-sm font-medium text-foreground">Folder not scanned</span>
              <span className="text-2xs text-muted-foreground">Use the Scan Folders button above to index media files.</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-foreground">No photos or videos found</span>
              <span className="text-2xs text-muted-foreground">This folder contains no media files to organize.</span>
            </>
          )}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      className="flex min-h-0 flex-1 flex-col justify-start gap-4 py-3 md:py-4 font-sans text-xs select-none"
      maxWidth="xl"
    >
      <div className="flex min-h-0 w-full flex-col items-stretch gap-6 lg:flex-row">
        <DateOrganizer />
      </div>
    </PageContainer>
  )
}

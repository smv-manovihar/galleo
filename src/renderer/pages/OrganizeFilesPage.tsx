import React from "react"
import { DateOrganizer } from "../components/organize/DateOrganizer"
import { useMediaStore } from "../stores/media-store"
import { useSettingsStore } from "../stores/settings-store"
import { FolderNotScanned } from "../components/media/FolderNotScanned"
import { PageContainer } from "@/components/ui/page-layout"

export const OrganizeFilesPage: React.FC = () => {
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const items = useMediaStore((s) => s.items)
  const { settings } = useSettingsStore()

  const isScanned = React.useMemo(() => {
    if (!activeRootPath) return false
    if (activeRootPath === "all") {
      return settings.folders.roots.some((r) => r.scanned)
    }
    return !!settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned
  }, [activeRootPath, settings.folders.roots])

  if (!activeRootPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center font-sans text-xs text-muted-foreground select-none">
        <span>
          Please select a folder from the sidebar directory listing to begin.
        </span>
      </div>
    )
  }

  if (!isScanned) {
    return (
      <FolderNotScanned
        activeRootPath={activeRootPath}
        featureDescription="and organize files"
      />
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center font-sans text-xs text-muted-foreground select-none">
        <span>This folder contains no photos or videos.</span>
      </div>
    )
  }

  return (
    <PageContainer
      className="flex min-h-0 flex-col items-stretch gap-6 font-sans text-xs select-none lg:flex-row"
      maxWidth="xl"
    >
      <DateOrganizer />
    </PageContainer>
  )
}

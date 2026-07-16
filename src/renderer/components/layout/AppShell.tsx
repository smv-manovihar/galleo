import React, { useEffect } from "react"
import { useUIStore } from "../../stores/ui-store"
import { useSettingsStore } from "../../stores/settings-store"
import { useMediaStore } from "../../stores/media-store"
import { AppSidebar } from "./AppSidebar"
import { TopBar } from "./TopBar"
import { StatusBar } from "./StatusBar"
import { SetupWizard } from "../onboarding/SetupWizard"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

// Lazy load actual pages
import { DashboardPage } from "../../pages/DashboardPage"
import { BrowseMediaPage } from "../../pages/BrowseMediaPage"
import { MediaCullingPage } from "../../pages/MediaCullingPage"
import { DuplicateAuditPage } from "../../pages/DuplicateAuditPage"
import { OrganizeFilesPage } from "../../pages/OrganizeFilesPage"
import { SettingsPage } from "../../pages/SettingsPage"

export const AppShell: React.FC = () => {
  const { currentView, setTheme } = useUIStore()
  const { settings, fetchSettings } = useSettingsStore()
  const hasItems = useMediaStore((s) => s.items.length > 0)
  const fetchMediaItems = useMediaStore((s) => s.fetchMediaItems)

  useEffect(() => {
    // Initial settings load from database
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    // Sync theme settings class list
    setTheme(settings.ui.theme || "system")
  }, [settings.ui.theme, setTheme])

  useEffect(() => {
    // Sync base font size zoom scale
    const fontSize = settings.ui.fontSize || "md"
    const scaleMap = {
      sm: "85%",
      md: "100%",
      lg: "115%",
      xl: "130%",
    }
    const scaleValue = scaleMap[fontSize] || "100%"
    document.documentElement.style.setProperty("--font-scale", scaleValue)
  }, [settings.ui.fontSize])

  useEffect(() => {
    // Auto-scan or load items for all root paths combined on startup
    if (settings.folders.roots.length > 0 && !hasItems) {
      fetchMediaItems("all")
    }
  }, [settings.folders.roots, fetchMediaItems, hasItems])

  const isElectron = typeof window !== "undefined" && window.api !== undefined

  const renderContent = () => {
    // Allow Settings page to be accessed even if no root folders are configured
    if (currentView === "settings") {
      return <SettingsPage />
    }

    // Onboarding setup wizard triggers if roots list is completely empty
    if (settings.folders.roots.length === 0) {
      return <SetupWizard />
    }

    switch (currentView) {
      case "dashboard":
        return <DashboardPage />
      case "browse":
        return <BrowseMediaPage />
      case "review":
        return <MediaCullingPage />
      case "duplicates":
        return <DuplicateAuditPage />
      case "organize":
        return <OrganizeFilesPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground"
    >
      <SidebarProvider className="min-h-0 flex-1">
        <div className="flex h-full w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="relative flex h-full min-w-0 flex-1 flex-col">
            <TopBar />
            {!isElectron && (
              <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-6 py-2.5 font-sans text-xs text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">
                    ⚠️ Web Browser Preview Mode:
                  </span>
                  Galleo requires the Electron app wrapper to access the file
                  system and select folders.
                </span>
              </div>
            )}
            <main className="relative flex-1 overflow-x-hidden overflow-y-auto bg-background/50 contain-strict">
              {renderContent()}
            </main>
            <StatusBar />
          </SidebarInset>
        </div>
      </SidebarProvider>
      <Toaster />
    </div>
  )
}

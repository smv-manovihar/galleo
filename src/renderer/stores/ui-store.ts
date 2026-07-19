import { create } from "zustand"
import type { UpdateCheckResult } from "../../shared/types/ipc"

type ViewMode =
  "dashboard" | "browse" | "review" | "duplicates" | "organize" | "settings"

interface UIState {
  currentView: ViewMode
  sidebarOpen: boolean
  keyboardShortcutsOpen: boolean
  activeSettingsTab:
    "folders" | "scan" | "quality" | "appearance" | "reset" | "about"
  activeDuplicatesTab: "auto" | "manual"
  updateInfo: UpdateCheckResult | null
  isCheckingUpdate: boolean
  updateError: string | null
  hasRunInitialUpdateCheck: boolean
  dismissedVersion: string | null

  setCurrentView: (view: ViewMode) => void
  setSidebarOpen: (open: boolean) => void
  setKeyboardShortcutsOpen: (open: boolean) => void
  setActiveSettingsTab: (
    tab: "folders" | "scan" | "quality" | "appearance" | "reset" | "about"
  ) => void
  setActiveDuplicatesTab: (tab: "auto" | "manual") => void
  checkForUpdates: () => Promise<void>
  dismissUpdate: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  currentView: "dashboard",
  sidebarOpen: true,
  keyboardShortcutsOpen: false,
  activeSettingsTab: "folders",
  activeDuplicatesTab: "auto",
  updateInfo: null,
  isCheckingUpdate: false,
  updateError: null,
  hasRunInitialUpdateCheck: false,
  dismissedVersion:
    typeof window !== "undefined"
      ? localStorage.getItem("galleo_dismissed_update")
      : null,

  setCurrentView: (currentView) => set({ currentView }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setKeyboardShortcutsOpen: (keyboardShortcutsOpen) =>
    set({ keyboardShortcutsOpen }),
  setActiveSettingsTab: (activeSettingsTab) => set({ activeSettingsTab }),
  setActiveDuplicatesTab: (activeDuplicatesTab) => set({ activeDuplicatesTab }),
  checkForUpdates: async () => {
    if (typeof window === "undefined" || !window.api) return

    set({ isCheckingUpdate: true, updateError: null })
    try {
      const result = await window.api.checkForUpdates()
      if (result.ok) {
        const isDev = import.meta.env.DEV
        if (isDev) {
          set({
            updateInfo: {
              ...result.data,
              updateAvailable: true,
              latestVersion: result.data.latestVersion || "1.0.0-dev",
              releaseNotes:
                result.data.releaseNotes ||
                "### Galleo Update Notifier\nNo release notes found on GitHub. Build a new release tag to see notes here.",
            },
            isCheckingUpdate: false,
            hasRunInitialUpdateCheck: true,
          })
        } else {
          set({
            updateInfo: result.data,
            isCheckingUpdate: false,
            hasRunInitialUpdateCheck: true,
          })
        }
      } else {
        const errorMsg =
          result.error.code === "UNKNOWN"
            ? result.error.message
            : `Check for updates failed (${result.error.code})`
        set({
          updateError: errorMsg,
          isCheckingUpdate: false,
          hasRunInitialUpdateCheck: true,
        })
      }
    } catch (e: any) {
      set({
        updateError: e.message || "Failed to communicate with update checker",
        isCheckingUpdate: false,
        hasRunInitialUpdateCheck: true,
      })
    }
  },
  dismissUpdate: () => {
    const info = get().updateInfo
    if (info) {
      localStorage.setItem("galleo_dismissed_update", info.latestVersion)
      set({ dismissedVersion: info.latestVersion })
    }
  },
}))

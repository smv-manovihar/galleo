import { create } from "zustand"
import { toast } from "sonner"
import type { UpdateCheckResult } from "../../shared/types/ipc"
import { withViewTransition } from "../lib/view-transition"

type ViewMode =
  | "dashboard"
  | "browse"
  | "review"
  | "duplicates"
  | "organize"
  | "settings"

interface UIState {
  currentView: ViewMode
  sidebarOpen: boolean
  keyboardShortcutsOpen: boolean
  activeSettingsTab:
    | "folders"
    | "scan"
    | "quality"
    | "appearance"
    | "ai"
    | "reset"
    | "about"
  activeDuplicatesTab: "auto" | "manual"
  previewMetaPanelOpen: boolean
  previewTransitionAnimation: boolean
  updateInfo: UpdateCheckResult | null
  isCheckingUpdate: boolean
  isDownloadingUpdate: boolean
  updateDownloadProgress: number
  isUpdateDownloaded: boolean
  updateError: string | null
  hasRunInitialUpdateCheck: boolean
  dismissedVersion: string | null

  setCurrentView: (view: ViewMode) => void
  setSidebarOpen: (open: boolean) => void
  setKeyboardShortcutsOpen: (open: boolean) => void
  setPreviewMetaPanelOpen: (open: boolean) => void
  togglePreviewMetaPanel: () => void
  setPreviewTransitionAnimation: (enabled: boolean) => void
  togglePreviewTransitionAnimation: () => void
  setActiveSettingsTab: (
    tab:
      | "folders"
      | "scan"
      | "quality"
      | "appearance"
      | "ai"
      | "reset"
      | "about"
  ) => void
  setActiveDuplicatesTab: (tab: "auto" | "manual") => void
  checkForUpdates: (force?: boolean) => Promise<void>
  startUpdateDownload: () => Promise<void>
  installUpdate: () => Promise<void>
  dismissUpdate: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  currentView: "dashboard",
  sidebarOpen: true,
  keyboardShortcutsOpen: false,
  activeSettingsTab: "folders",
  activeDuplicatesTab: "auto",
  previewMetaPanelOpen:
    typeof window !== "undefined"
      ? localStorage.getItem("galleo_preview_meta_panel_open") === "true"
      : false,
  previewTransitionAnimation:
    typeof window !== "undefined"
      ? localStorage.getItem("galleo_preview_transition_animation") !== "false"
      : true,
  updateInfo: null,
  isCheckingUpdate: false,
  isDownloadingUpdate: false,
  updateDownloadProgress: 0,
  isUpdateDownloaded: false,
  updateError: null,
  hasRunInitialUpdateCheck: false,
  dismissedVersion:
    typeof window !== "undefined"
      ? localStorage.getItem("galleo_dismissed_update")
      : null,

  setCurrentView: (currentView) => {
    if (get().currentView === currentView) return
    withViewTransition(() => {
      set({ currentView })
    })
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setKeyboardShortcutsOpen: (keyboardShortcutsOpen) =>
    set({ keyboardShortcutsOpen }),
  setPreviewMetaPanelOpen: (previewMetaPanelOpen) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "galleo_preview_meta_panel_open",
        String(previewMetaPanelOpen)
      )
    }
    set({ previewMetaPanelOpen })
  },
  togglePreviewMetaPanel: () => {
    const next = !get().previewMetaPanelOpen
    if (typeof window !== "undefined") {
      localStorage.setItem("galleo_preview_meta_panel_open", String(next))
    }
    set({ previewMetaPanelOpen: next })
  },
  setPreviewTransitionAnimation: (previewTransitionAnimation) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "galleo_preview_transition_animation",
        String(previewTransitionAnimation)
      )
    }
    set({ previewTransitionAnimation })
  },
  togglePreviewTransitionAnimation: () => {
    const next = !get().previewTransitionAnimation
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "galleo_preview_transition_animation",
        String(next)
      )
    }
    set({ previewTransitionAnimation: next })
  },
  setActiveSettingsTab: (activeSettingsTab) => set({ activeSettingsTab }),
  setActiveDuplicatesTab: (activeDuplicatesTab) => set({ activeDuplicatesTab }),
  checkForUpdates: async (force = false) => {
    if (typeof window === "undefined" || !window.api) return

    set({ isCheckingUpdate: true, updateError: null })
    try {
      const result = await window.api.checkForUpdates(force)
      if (result.ok) {
        const isDev = import.meta.env.DEV
        if (isDev) {
          set({
            updateInfo: {
              ...result.data,
              updateAvailable: true,
              latestVersion:
                result.data.latestVersion ||
                `${result.data.currentVersion || "1.1.1"}-dev`,
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
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Failed to communicate with update checker"
      set({
        updateError: message,
        isCheckingUpdate: false,
        hasRunInitialUpdateCheck: true,
      })
    }
  },
  startUpdateDownload: async () => {
    const info = get().updateInfo
    if (!info?.downloadUrl || typeof window === "undefined" || !window.api)
      return

    const isDirectBinary = /\.(exe|msi|dmg|pkg|AppImage|deb|zip)(\?.*)?$/i.test(
      info.downloadUrl
    )

    if (!isDirectBinary && import.meta.env.DEV) {
      set({
        isDownloadingUpdate: true,
        updateDownloadProgress: 0,
        updateError: null,
      })
      toast.info("Simulating update download in dev mode...", {
        id: "update-download-toast",
      })
      for (let i = 25; i <= 100; i += 25) {
        await new Promise((r) => setTimeout(r, 350))
        set({ updateDownloadProgress: i })
      }
      set({
        isDownloadingUpdate: false,
        isUpdateDownloaded: true,
        updateDownloadProgress: 100,
      })
      toast.success(
        `Update v${info.latestVersion} downloaded and ready to install!`,
        {
          id: "update-download-toast",
          action: {
            label: "Install & Restart",
            onClick: () => {
              get().installUpdate()
            },
          },
          duration: 12000,
        }
      )
      return
    }

    if (!isDirectBinary) {
      window.api.openExternal(info.releaseUrl || info.downloadUrl)
      return
    }

    set({
      isDownloadingUpdate: true,
      updateDownloadProgress: 0,
      updateError: null,
    })

    toast.info("Downloading Galleo update in the background...", {
      id: "update-download-toast",
    })

    const cleanup = window.api.onUpdateDownloadProgress((progress) => {
      set({ updateDownloadProgress: progress })
    })

    try {
      const res = await window.api.downloadUpdate(info.downloadUrl)
      cleanup()
      if (res.ok) {
        set({
          isDownloadingUpdate: false,
          isUpdateDownloaded: true,
          updateDownloadProgress: 100,
        })
        toast.success(
          `Update v${info.latestVersion} is downloaded and ready to install!`,
          {
            id: "update-download-toast",
            action: {
              label: "Install & Restart",
              onClick: () => {
                get().installUpdate()
              },
            },
            duration: 12000,
          }
        )
      } else {
        const errorMsg =
          res.error.code === "UNKNOWN"
            ? res.error.message
            : `Failed to download update (${res.error.code})`
        set({
          isDownloadingUpdate: false,
          updateError: errorMsg,
        })
        toast.error(`Update download failed: ${errorMsg}`, {
          id: "update-download-toast",
        })
      }
    } catch (e: unknown) {
      cleanup()
      const message =
        e instanceof Error ? e.message : "Download update request failed"
      set({
        isDownloadingUpdate: false,
        updateError: message,
      })
      toast.error(`Update download failed: ${message}`, {
        id: "update-download-toast",
      })
    }
  },
  installUpdate: async () => {
    if (typeof window === "undefined" || !window.api) return
    try {
      const res = await window.api.installUpdate()
      if (!res.ok) {
        if (import.meta.env.DEV) {
          toast.success(
            "Update installer launched (Dev Simulation: App would restart in production)",
            {
              duration: 5000,
            }
          )
          return
        }
        const errorMsg =
          res.error.code === "UNKNOWN"
            ? res.error.message
            : `Failed to launch installer (${res.error.code})`
        set({
          updateError: errorMsg,
        })
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to launch update installer"
      set({
        updateError: message,
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

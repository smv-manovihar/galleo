import { create } from "zustand"
import type { AppSettings, RootFolder } from "../../shared/types/settings"
import { DEFAULT_SETTINGS } from "../../shared/constants"
import { useMediaStore } from "./media-store"

interface SettingsState {
  settings: AppSettings
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  fetchSettings: () => Promise<void>
  saveSettings: (settings: AppSettings) => Promise<boolean>
  addRootFolder: (folderPath: string) => Promise<boolean>
  removeRootFolder: (folderPath: string) => Promise<void>
  toggleRootFolder: (folderPath: string, enabled: boolean) => Promise<void>
  setDestinationFolder: (folderPath: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isInitialized: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const settings = await window.api.getSettings()
      set({ settings, isLoading: false, isInitialized: true })
    } catch (e: any) {
      set({
        error: e.message || "Failed to load settings",
        isLoading: false,
        isInitialized: true,
      })
    }
  },

  saveSettings: async (newSettings: AppSettings) => {
    set({ isLoading: true, error: null })
    try {
      const result = await window.api.saveSettings(newSettings)
      if (result.ok) {
        set({ settings: newSettings, isLoading: false })
        return true
      } else {
        const errorMsg =
          result.error.code === "UNKNOWN"
            ? result.error.message
            : `Error: ${result.error.code}`
        set({ error: errorMsg, isLoading: false })
        return false
      }
    } catch (e: any) {
      set({ error: e.message || "Failed to save settings", isLoading: false })
      return false
    }
  },

  addRootFolder: async (folderPath: string) => {
    const { settings, saveSettings } = get()

    const normalize = (p: string) =>
      p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase()
    const newNormalized = normalize(folderPath)

    // 1. Check if the folder path or any parent of it is already added
    const isAlreadyCovered = settings.folders.roots.some((r) => {
      const existingNormalized = normalize(r.path)
      return (
        existingNormalized === newNormalized ||
        newNormalized.startsWith(existingNormalized + "/")
      )
    })

    if (isAlreadyCovered) {
      // The folder (or a parent of it) is already in the roots list. We don't add it.
      return false
    }

    // 2. Check if the new folder path is a parent of any existing folders.
    // If so, we should remove those existing subfolders to avoid settings redundancy.
    // We do NOT clear their index from the database, which preserves any existing
    // culling states and metadata for those files.
    const subfoldersToRemove = settings.folders.roots.filter((r) => {
      const existingNormalized = normalize(r.path)
      return existingNormalized.startsWith(newNormalized + "/")
    })

    const subPathsToRemoveSet = new Set(
      subfoldersToRemove.map((s) => s.path.toLowerCase())
    )
    const remainingRoots = settings.folders.roots.filter(
      (r) => !subPathsToRemoveSet.has(r.path.toLowerCase())
    )

    const newRoot: RootFolder = {
      path: folderPath,
      enabled: true,
      label: folderPath.split(/[\\/]/).pop() || folderPath,
    }

    const updatedSettings: AppSettings = {
      ...settings,
      folders: {
        ...settings.folders,
        roots: [...remainingRoots, newRoot],
      },
    }

    const ok = await saveSettings(updatedSettings)

    // Refresh media store items
    const mediaStore = useMediaStore.getState()
    const currentActive = mediaStore.activeRootPath
    if (currentActive) {
      await mediaStore.fetchMediaItems(currentActive)
    }

    return ok
  },

  removeRootFolder: async (folderPath: string) => {
    const { settings, saveSettings } = get()

    // Clear scanned metadata from database
    await window.api.clearFolderIndex(folderPath)

    const updatedRoots = settings.folders.roots.filter(
      (r) => r.path.toLowerCase() !== folderPath.toLowerCase()
    )

    const updatedSettings: AppSettings = {
      ...settings,
      folders: {
        ...settings.folders,
        roots: updatedRoots,
      },
    }
    await saveSettings(updatedSettings)

    // Refresh media store items
    const mediaStore = useMediaStore.getState()
    const currentActive = mediaStore.activeRootPath

    // Determine the next active path
    let nextActive: string | null = currentActive
    if (updatedRoots.length === 0) {
      nextActive = null
    } else if (
      !currentActive ||
      currentActive.toLowerCase() === folderPath.toLowerCase()
    ) {
      nextActive = "all"
    }

    mediaStore.setActiveRootPath(nextActive)
    if (nextActive) {
      await mediaStore.fetchMediaItems(nextActive)
    } else {
      useMediaStore.setState({ items: [] })
    }
  },

  toggleRootFolder: async (folderPath: string, enabled: boolean) => {
    const { settings, saveSettings } = get()
    const updatedSettings: AppSettings = {
      ...settings,
      folders: {
        ...settings.folders,
        roots: settings.folders.roots.map((r) =>
          r.path.toLowerCase() === folderPath.toLowerCase()
            ? { ...r, enabled }
            : r
        ),
      },
    }
    await saveSettings(updatedSettings)

    // Re-fetch current view so disabled folder items disappear immediately
    const mediaStore = useMediaStore.getState()
    if (mediaStore.activeRootPath) {
      await mediaStore.fetchMediaItems(mediaStore.activeRootPath)
    }
  },

  setDestinationFolder: async (folderPath: string) => {
    const { settings, saveSettings } = get()
    const updatedSettings: AppSettings = {
      ...settings,
      folders: {
        ...settings.folders,
        destination: folderPath,
      },
    }
    await saveSettings(updatedSettings)
  },
}))

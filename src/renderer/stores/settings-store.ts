import { create } from 'zustand';
import type { AppSettings, RootFolder } from '../../shared/types/settings';
import { DEFAULT_SETTINGS } from '../../shared/constants';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;
  addRootFolder: (folderPath: string) => Promise<boolean>;
  removeRootFolder: (folderPath: string) => Promise<void>;
  toggleRootFolder: (folderPath: string, enabled: boolean) => Promise<void>;
  setDestinationFolder: (folderPath: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await window.api.getSettings();
      set({ settings, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to load settings', isLoading: false });
    }
  },

  saveSettings: async (newSettings: AppSettings) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.api.saveSettings(newSettings);
      if (result.ok) {
        set({ settings: newSettings, isLoading: false });
        return true;
      } else {
        const errorMsg = result.error.code === 'UNKNOWN' ? result.error.message : `Error: ${result.error.code}`;
        set({ error: errorMsg, isLoading: false });
        return false;
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to save settings', isLoading: false });
      return false;
    }
  },

  addRootFolder: async (folderPath: string) => {
    const { settings, saveSettings } = get();
    // Prevent duplicates
    if (settings.folders.roots.some(r => r.path.toLowerCase() === folderPath.toLowerCase())) {
      return true;
    }

    const newRoot: RootFolder = {
      path: folderPath,
      enabled: true,
      label: folderPath.split(/[\\/]/).pop() || folderPath
    };

    const updatedSettings: AppSettings = {
      ...settings,
      folders: {
        ...settings.folders,
        roots: [...settings.folders.roots, newRoot]
      }
    };

    return await saveSettings(updatedSettings);
  },

  removeRootFolder: async (folderPath: string) => {
    const { settings, saveSettings } = get();
    const updatedSettings: AppSettings = {
      ...settings,
      folders: {
        ...settings.folders,
        roots: settings.folders.roots.filter(
          r => r.path.toLowerCase() !== folderPath.toLowerCase()
        )
      }
    };
    await saveSettings(updatedSettings);
  },

  toggleRootFolder: async (folderPath: string, enabled: boolean) => {
    const { settings, saveSettings } = get();
    const updatedSettings: AppSettings = {
      ...settings,
      folders: {
        ...settings.folders,
        roots: settings.folders.roots.map(r =>
          r.path.toLowerCase() === folderPath.toLowerCase() ? { ...r, enabled } : r
        )
      }
    };
    await saveSettings(updatedSettings);
  },

  setDestinationFolder: async (folderPath: string) => {
    const { settings, saveSettings } = get();
    const updatedSettings: AppSettings = {
      ...settings,
      folders: {
        ...settings.folders,
        destination: folderPath
      }
    };
    await saveSettings(updatedSettings);
  }
}));

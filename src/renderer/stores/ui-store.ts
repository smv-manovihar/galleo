import { create } from 'zustand';

type ViewMode = 'dashboard' | 'browse' | 'review' | 'organize' | 'settings';

interface UIState {
  currentView: ViewMode;
  sidebarOpen: boolean;
  keyboardShortcutsOpen: boolean;
  activeSettingsTab: 'folders' | 'scan' | 'quality' | 'appearance' | 'reset';
  theme: 'dark' | 'light' | 'system';
  
  setCurrentView: (view: ViewMode) => void;
  setSidebarOpen: (open: boolean) => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setActiveSettingsTab: (tab: 'folders' | 'scan' | 'quality' | 'appearance' | 'reset') => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'dashboard',
  sidebarOpen: true,
  keyboardShortcutsOpen: false,
  activeSettingsTab: 'folders',
  theme: 'system',

  setCurrentView: (currentView) => set({ currentView }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setKeyboardShortcutsOpen: (keyboardShortcutsOpen) => set({ keyboardShortcutsOpen }),
  setActiveSettingsTab: (activeSettingsTab) => set({ activeSettingsTab }),
  setTheme: (theme) => {
    set({ theme });
    // Apply class to HTML tag for Tailwind dark theme class variant matching
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }
}));

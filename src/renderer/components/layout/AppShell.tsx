import React, { useEffect } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useMediaStore } from '../../stores/media-store';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { SetupWizard } from '../onboarding/SetupWizard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

// Lazy load actual pages
import { DashboardPage } from '../../pages/DashboardPage';
import { BrowsePage } from '../../pages/BrowsePage';
import { ReviewPage } from '../../pages/ReviewPage';
import { DuplicatesPage } from '../../pages/DuplicatesPage';
import { OrganizePage } from '../../pages/OrganizePage';
import { SettingsPage } from '../../pages/SettingsPage';

export const AppShell: React.FC = () => {
  const { currentView, setTheme } = useUIStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { fetchMediaItems, items } = useMediaStore();

  useEffect(() => {
    // Initial settings load from database
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    // Sync theme settings class list
    setTheme(settings.ui.theme || 'system');
  }, [settings.ui.theme, setTheme]);

  useEffect(() => {
    // Sync base font size zoom scale
    const fontSize = settings.ui.fontSize || 'md';
    const scaleMap = {
      sm: '85%',
      md: '100%',
      lg: '115%',
      xl: '130%',
    };
    const scaleValue = scaleMap[fontSize] || '100%';
    document.documentElement.style.setProperty('--font-scale', scaleValue);
  }, [settings.ui.fontSize]);

  useEffect(() => {
    // Auto-scan or load items for first configured root path on startup
    if (settings.folders.roots.length > 0 && items.length === 0) {
      const activeRoot = settings.folders.roots.find(r => r.enabled) || settings.folders.roots[0];
      if (activeRoot) {
        fetchMediaItems(activeRoot.path);
      }
    }
  }, [settings.folders.roots, fetchMediaItems, items.length]);

  const isElectron = typeof window !== 'undefined' && window.api !== undefined;

  const renderContent = () => {
    // Allow Settings page to be accessed even if no root folders are configured
    if (currentView === 'settings') {
      return <SettingsPage />;
    }

    // Onboarding setup wizard triggers if roots list is completely empty
    if (settings.folders.roots.length === 0) {
      return <SetupWizard />;
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'browse':
        return <BrowsePage />;
      case 'review':
        return <ReviewPage />;
      case 'duplicates':
        return <DuplicatesPage />;
      case 'organize':
        return <OrganizePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0 h-full relative">
          <TopBar />
          {!isElectron && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-amber-600 dark:text-amber-400 font-sans text-xs">
              <span className="flex items-center gap-2">
                <span className="font-semibold">⚠️ Web Browser Preview Mode:</span>
                MediaPurge requires the Electron app wrapper to access the file system and select folders.
              </span>
            </div>
          )}
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background/50">
            {renderContent()}
          </main>
          <StatusBar />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

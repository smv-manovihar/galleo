import React from 'react';
import { DateOrganizer } from '../components/organize/DateOrganizer';
import { useMediaStore } from '../stores/media-store';
import { useSettingsStore } from '../stores/settings-store';
import { FolderNotScanned } from '../components/media/FolderNotScanned';
import { PageContainer } from '@/components/ui/page-layout';

export const OrganizeFilesPage: React.FC = () => {
  const activeRootPath = useMediaStore((s) => s.activeRootPath);
  const items = useMediaStore((s) => s.items);
  const { settings } = useSettingsStore();

  const isScanned = React.useMemo(() => {
    if (!activeRootPath) return false;
    if (activeRootPath === "all") {
      return settings.folders.roots.some((r) => r.scanned);
    }
    return !!settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned;
  }, [activeRootPath, settings.folders.roots]);

  if (!activeRootPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs select-none">
        <span>Please select a folder from the sidebar directory listing to begin.</span>
      </div>
    );
  }

  if (!isScanned) {
    return (
      <FolderNotScanned activeRootPath={activeRootPath} featureDescription="and organize files" />
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs select-none">
        <span>This folder contains no photos or videos.</span>
      </div>
    );
  }

  return (
    <PageContainer className="select-none flex flex-col lg:flex-row gap-6 min-h-0 text-xs font-sans items-stretch" maxWidth="xl">
      <DateOrganizer />
    </PageContainer>
  );
};

import React, { useState, useEffect } from 'react';
import { useMediaStore } from '../stores/media-store';
import { useSessionStore } from '../stores/session-store';
import { useScanStore } from '../stores/scan-store';
import { useSettingsStore } from '../stores/settings-store';
import { FolderNotScanned } from '../components/media/FolderNotScanned';
import { MediaCullingMode } from '../components/media-culling/MediaCullingMode';
import { MediaCullingSummary } from '../components/media-culling/MediaCullingSummary';
import { PageContainer } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';

export const MediaCullingPage: React.FC = () => {
  const items = useMediaStore((s) => s.items);
  const activeRootPath = useMediaStore((s) => s.activeRootPath);
  const isScanning = useScanStore((s) => s.isScanning);
  const { settings } = useSettingsStore();
  const { initSession } = useSessionStore();

  const isScanned = React.useMemo(() => {
    if (!activeRootPath) return false;
    if (activeRootPath === "all") {
      return settings.folders.roots.some((r) => r.scanned);
    }
    return !!settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned;
  }, [activeRootPath, settings.folders.roots]);

  const [showSummary, setShowSummary] = useState(false);
  const [onlyShowFlagged, setOnlyShowFlagged] = useState(false);

  // Initialize review session
  useEffect(() => {
    if (isScanning) return;
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length);
    }
  }, [activeRootPath, items.length, isScanning, initSession]);

  const filteredItems = React.useMemo(() => {
    if (onlyShowFlagged) {
      return items.filter(item => 
        item.isDuplicate || 
        (item.quality !== undefined && (
          item.quality.isBlurry || 
          item.quality.isDark || 
          item.quality.isScreenshot || 
          item.quality.isSmall
        ))
      );
    }
    return items;
  }, [items, onlyShowFlagged]);

  if (!activeRootPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs gap-2 select-none">
        <span>Please select a folder from the sidebar directory listing to begin.</span>
      </div>
    );
  }

  if (!isScanned) {
    return (
      <FolderNotScanned activeRootPath={activeRootPath} featureDescription="and access culling" />
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs gap-2 select-none">
        <span>This folder contains no photos or videos.</span>
      </div>
    );
  }

  return (
    <PageContainer className="h-full select-none" maxWidth="xl">
      <div className="flex-1 min-h-0 relative flex flex-col">
        {!showSummary ? (
          filteredItems.length > 0 ? (
            <MediaCullingMode
              items={filteredItems}
              onComplete={() => setShowSummary(true)}
              onlyShowFlagged={onlyShowFlagged}
              onOnlyShowFlaggedChange={setOnlyShowFlagged}
            />
          ) : (
            <div className="flex h-96 flex-col items-center justify-center gap-3.5 font-sans text-xs select-none">
              <span className="text-muted-foreground text-center">
                No flagged low-quality or duplicate media items found in this directory.
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setOnlyShowFlagged(false)}
                className="h-8 text-2xs cursor-pointer border-border hover:bg-accent"
              >
                Switch to Cull All Media
              </Button>
            </div>
          )
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <MediaCullingSummary onBackToQueue={() => setShowSummary(false)} />
          </div>
        )}
      </div>
    </PageContainer>
  );
};

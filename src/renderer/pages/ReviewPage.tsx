import React, { useState, useEffect } from 'react';
import { useMediaStore } from '../stores/media-store';
import { useSessionStore } from '../stores/session-store';
import { ReviewMode } from '../components/review/ReviewMode';
import { ReviewSummary } from '../components/review/ReviewSummary';
import { PageContainer } from '@/components/ui/page-layout';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export const ReviewPage: React.FC = () => {
  const { items, activeRootPath } = useMediaStore();
  const { initSession } = useSessionStore();

  const [showSummary, setShowSummary] = useState(false);
  const [onlyShowFlagged, setOnlyShowFlagged] = useState(false);

  // Initialize review session
  useEffect(() => {
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length);
    }
  }, [activeRootPath, items.length, initSession]);

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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs gap-2 select-none">
        <span>No media items found in directory. Run a folder scan first.</span>
      </div>
    );
  }

  return (
    <PageContainer className="h-full select-none" maxWidth="xl">
      <div className="flex-1 min-h-0 relative flex flex-col gap-4">
        {/* Subtle Cull Mode Toggle Bar */}
        {!showSummary && (
          <div className="flex items-center justify-between px-4 py-2.5 border border-border bg-card/45 backdrop-blur-md rounded-lg shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Culling Queue Mode</span>
              <span className="text-2xs text-muted-foreground">({filteredItems.length} items)</span>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="cull-mode" className="text-2xs font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                Focus on Low-Quality & Duplicates
              </Label>
              <Switch
                id="cull-mode"
                checked={onlyShowFlagged}
                onCheckedChange={setOnlyShowFlagged}
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 relative flex flex-col">
          {!showSummary ? (
            filteredItems.length > 0 ? (
              <ReviewMode items={filteredItems} onComplete={() => setShowSummary(true)} />
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
            <ReviewSummary onBackToQueue={() => setShowSummary(false)} />
          )}
        </div>
      </div>
    </PageContainer>
  );
};

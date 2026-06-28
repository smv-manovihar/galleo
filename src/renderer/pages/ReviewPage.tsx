import React, { useState, useEffect } from 'react';
import { useMediaStore } from '../stores/media-store';
import { useSessionStore } from '../stores/session-store';
import { ReviewMode } from '../components/review/ReviewMode';
import { BatchReview } from '../components/review/BatchReview';
import { ReviewSummary } from '../components/review/ReviewSummary';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/page-layout';
import { CheckSquare, LayoutList, Eye } from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const { items, activeRootPath } = useMediaStore();
  const { initSession } = useSessionStore();

  const [reviewTab, setReviewTab] = useState<'swipe' | 'batch' | 'summary'>('swipe');

  // Filter items in the folder that are pending review
  // Or keep it consistent: Swipe Mode goes sequentially through all items.
  const swipeItems = items;

  // Filter items that have duplicate hashes in this directory for duplicates tab
  const duplicateItems = items.filter(i => i.isDuplicate);

  // Initialize review session
  useEffect(() => {
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length);
    }
  }, [activeRootPath, items.length, initSession]);

  const handleReviewAction = async (mediaId: string, state: 'keep' | 'delete' | 'skipped') => {
    const item = items.find(i => i.id === mediaId);
    if (item) {
      await useSessionStore.getState().submitDecision(mediaId, state, item);
      item.reviewState = state; // Sync immediately
      useMediaStore.setState({ items: [...items] });
    }
  };

  const handleSessionComplete = () => {
    setReviewTab('summary');
  };

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
      {/* Top review type toggles */}
      {reviewTab !== 'summary' && (
        <div className="flex items-center justify-between shrink-0 w-full">
          <Tabs value={reviewTab} onValueChange={(val: string) => setReviewTab(val as any)}>
            <TabsList className="bg-background border border-border h-8 p-0.5 rounded-lg">
              <TabsTrigger value="swipe" className="h-7 text-xs rounded-md font-medium px-3.5 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                Swipe Mode
              </TabsTrigger>
              <TabsTrigger value="batch" className="h-7 text-xs rounded-md font-medium px-3.5 flex items-center gap-1.5">
                <LayoutList className="w-3.5 h-3.5" />
                Duplicates Review
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-border text-xs font-medium cursor-pointer"
            onClick={() => setReviewTab('summary')}
          >
            <Eye className="w-3.5 h-3.5" />
            Finish & Review Summary
          </Button>
        </div>
      )}

      {/* Main Review viewport content */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {reviewTab === 'swipe' && (
          <ReviewMode items={swipeItems} onComplete={handleSessionComplete} />
        )}
        {reviewTab === 'batch' && (
          <BatchReview items={duplicateItems} onReviewAction={handleReviewAction} />
        )}
        {reviewTab === 'summary' && (
          <ReviewSummary onBackToQueue={() => setReviewTab('swipe')} />
        )}
      </div>
    </PageContainer>
  );
};

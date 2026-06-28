import React from 'react';
import { useMediaStore } from '../stores/media-store';
import { useSessionStore } from '../stores/session-store';
import { BatchReview } from '../components/review/BatchReview';
import { PageContainer } from '@/components/ui/page-layout';

export const DuplicatesPage: React.FC = () => {
  const { items, activeRootPath } = useMediaStore();
  const { initSession, submitDecision } = useSessionStore();

  // Initialize review session when activeRootPath changes or is loaded
  React.useEffect(() => {
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length);
    }
  }, [activeRootPath, items.length, initSession]);

  const handleReviewAction = async (mediaId: string, state: 'keep' | 'delete' | 'skipped') => {
    const item = items.find(i => i.id === mediaId);
    if (item) {
      await submitDecision(mediaId, state, item);
      item.reviewState = state;
      useMediaStore.setState({ items: [...items] });
    }
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

  const duplicateItems = items.filter(i => i.isDuplicate);

  return (
    <PageContainer className="h-full select-none" maxWidth="xl">
      <div className="flex-1 min-h-0 relative flex flex-col">
        <BatchReview items={duplicateItems} onReviewAction={handleReviewAction} />
      </div>
    </PageContainer>
  );
};

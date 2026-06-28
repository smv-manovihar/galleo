import React from 'react';
import { DateOrganizer } from '../components/organize/DateOrganizer';
import { useMediaStore } from '../stores/media-store';
import { PageContainer } from '@/components/ui/page-layout';

export const OrganizePage: React.FC = () => {
  const { activeRootPath, items } = useMediaStore();

  if (!activeRootPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs select-none">
        <span>Please select a folder from the sidebar directory listing to begin.</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs select-none">
        <span>No media items found in directory. Run a folder scan first.</span>
      </div>
    );
  }

  return (
    <PageContainer className="h-full select-none flex flex-col min-h-0 lg:h-full lg:overflow-hidden" maxWidth="xl">
      <div className="flex-1 min-h-0 lg:overflow-hidden">
        <DateOrganizer />
      </div>
    </PageContainer>
  );
};

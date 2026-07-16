import React, { useState } from 'react';
import { useMediaStore } from '../stores/media-store';
import { useSessionStore } from '../stores/session-store';
import { useScanStore } from '../stores/scan-store';
import { useSettingsStore } from '../stores/settings-store';
import { FolderNotScanned } from '../components/media/FolderNotScanned';
import { DuplicateAuditReview } from '../components/duplicate-audit/DuplicateAuditReview';
import { DuplicateAuditSummary } from '../components/duplicate-audit/DuplicateAuditSummary';
import { DuplicateAuditAutoCleanup } from '../components/duplicate-audit/DuplicateAuditAutoCleanup';
import { PageContainer } from '@/components/ui/page-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bookmark } from 'lucide-react';
import type { MediaItem } from '../../shared/types/media';
import { getNormalizedFilenameBase } from '../../shared/filename-utils';

export const DuplicateAuditPage: React.FC = () => {
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

  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [showSummary, setShowSummary] = useState(false);
  const [manualGroupIndex, setManualGroupIndex] = useState(0);

  const lastLoadedFolderRef = React.useRef<string | null>(null);

  // Initialize review session when activeRootPath changes or is loaded
  React.useEffect(() => {
    if (isScanning) return;
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length);
    }
  }, [activeRootPath, items.length, isScanning, initSession]);



  // Group duplicate items
  const duplicateGroups = React.useMemo(() => {
    const groups: Record<string, MediaItem[]> = {};
    for (const item of items) {
      if (item.isDuplicate && item.duplicateGroupId) {
        if (!groups[item.duplicateGroupId]) {
          groups[item.duplicateGroupId] = [];
        }
        groups[item.duplicateGroupId].push(item);
      }
    }
    return Object.values(groups).filter(g => g.length > 1);
  }, [items]);

  // Partition duplicates into exact copies vs similar files
  const { exactDupsToDelete, exactDupsToKeep, exactDupsGroups, manualReviewGroups } = React.useMemo(() => {
    const dupsToDelete: MediaItem[] = [];
    const dupsToKeep: MediaItem[] = [];
    const exactGroups: MediaItem[][] = [];
    const manualGroups: MediaItem[][] = [];

    for (const group of duplicateGroups) {
      // Group items in this perceptual group by their exact duplicates key: (normalizedFilenameBase, size)
      const exactSubGroupsMap = new Map<string, MediaItem[]>();
      for (const item of group) {
        const key = `${getNormalizedFilenameBase(item.name).toLowerCase()}_${item.size}`;
        if (!exactSubGroupsMap.has(key)) {
          exactSubGroupsMap.set(key, []);
        }
        exactSubGroupsMap.get(key)!.push(item);
      }

      // Collect representatives for each exact sub-group, and identify the exact copies to delete
      const similarCandidates: MediaItem[] = [];

      for (const subGroup of exactSubGroupsMap.values()) {
        if (subGroup.length > 1) {
          // Identify the best representative to keep (either the overall best item or the highest quality item)
          let bestInSubGroup = subGroup.find(i => i.isBestInDuplicateGroup) || subGroup[0];
          for (const item of subGroup) {
            const itemScore = item.quality?.compositeScore ?? 0;
            const bestScore = bestInSubGroup.quality?.compositeScore ?? 0;
            if (itemScore > bestScore) {
              bestInSubGroup = item;
            } else if (itemScore === bestScore) {
              const itemRes = (item.width ?? 0) * (item.height ?? 0);
              const bestRes = (bestInSubGroup.width ?? 0) * (bestInSubGroup.height ?? 0);
              if (itemRes > bestRes) {
                bestInSubGroup = item;
              }
            }
          }

          dupsToKeep.push(bestInSubGroup);
          dupsToDelete.push(...subGroup.filter(i => i.id !== bestInSubGroup.id));
          exactGroups.push(subGroup);
          similarCandidates.push(bestInSubGroup);
        } else {
          similarCandidates.push(subGroup[0]);
        }
      }

      // If we have more than one distinct similar candidate left in the group,
      // they constitute a manual review group for similar media!
      if (similarCandidates.length > 1) {
        manualGroups.push(similarCandidates);
      }
    }

    return {
      exactDupsToDelete: dupsToDelete,
      exactDupsToKeep: dupsToKeep,
      exactDupsGroups: exactGroups,
      manualReviewGroups: manualGroups,
    };
  }, [duplicateGroups]);

  const manualReviewItems = React.useMemo(() => {
    return manualReviewGroups.flat();
  }, [manualReviewGroups]);

  // Restore and initialize local tab/index states when activeRootPath changes or items load
  React.useEffect(() => {
    if (activeRootPath && activeRootPath !== lastLoadedFolderRef.current && items.length > 0) {
      lastLoadedFolderRef.current = activeRootPath;

      // Restore active tab
      const savedTab = localStorage.getItem(`duplicates_active_tab_${activeRootPath}`);
      if (savedTab === 'auto' || savedTab === 'manual') {
        setActiveTab(savedTab as 'auto' | 'manual');
      } else {
        setActiveTab('auto');
      }

      // Restore group index
      const savedIndex = localStorage.getItem(`duplicates_manual_group_index_${activeRootPath}`);
      if (savedIndex !== null) {
        const parsed = parseInt(savedIndex, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < manualReviewGroups.length) {
          setManualGroupIndex(parsed);
          return;
        }
      }

      // Fallback: find the first group that has at least one pending item to review
      const firstUncompleted = manualReviewGroups.findIndex(group =>
        group.some(item => !item.reviewState || item.reviewState === 'pending')
      );
      if (firstUncompleted !== -1) {
        setManualGroupIndex(firstUncompleted);
      } else {
        setManualGroupIndex(0);
      }
    }
  }, [activeRootPath, items.length, manualReviewGroups]);

  const handleTabChange = (tab: 'auto' | 'manual') => {
    setActiveTab(tab);
    if (activeRootPath) {
      localStorage.setItem(`duplicates_active_tab_${activeRootPath}`, tab);
    }
  };

  const handleGroupIndexChange = (index: number) => {
    setManualGroupIndex(index);
    if (activeRootPath) {
      localStorage.setItem(`duplicates_manual_group_index_${activeRootPath}`, index.toString());
    }
  };

  if (!activeRootPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs gap-2 select-none">
        <span>Please select a folder from the sidebar directory listing to begin.</span>
      </div>
    );
  }

  if (!isScanned) {
    return (
      <FolderNotScanned activeRootPath={activeRootPath} featureDescription="and audit duplicates" />
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
      <div className="flex-1 min-h-0 relative flex flex-col gap-4">
        {showSummary ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <DuplicateAuditSummary onBackToQueue={() => setShowSummary(false)} />
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={val => handleTabChange(val as any)}
            className="w-full flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-center border-b border-border pb-3 shrink-0">
              <TabsList className="bg-muted/50 border border-border h-9 p-0.5">
                <TabsTrigger value="auto" className="text-xs h-8 px-4 rounded-md">
                  Exact Duplicates ({exactDupsGroups?.length || 0} groups)
                </TabsTrigger>
                <TabsTrigger value="manual" className="text-xs h-8 px-4 rounded-md">
                  Similar Media ({manualReviewGroups.length} groups)
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 mt-4">
              <TabsContent value="auto" className="h-full m-0 flex flex-col min-h-0">
                <DuplicateAuditAutoCleanup
                  exactDupsToDelete={exactDupsToDelete}
                  exactDupsToKeep={exactDupsToKeep}
                  duplicateGroups={exactDupsGroups}
                />
              </TabsContent>

              <TabsContent value="manual" className="h-full m-0 flex flex-col min-h-0">
                {manualReviewItems.length > 0 ? (
                  <DuplicateAuditReview
                    items={manualReviewItems}
                    onComplete={() => setShowSummary(true)}
                    activeGroupIndex={manualGroupIndex}
                    onGroupIndexChange={handleGroupIndexChange}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-8 bg-card/10 h-64">
                    <Bookmark className="w-10 h-10 text-primary mb-3" />
                    <h3 className="text-xs font-semibold text-foreground">All Similar Photos Reviewed</h3>
                    <p className="text-2xs text-muted-foreground mt-1 text-center max-w-sm">
                      No groups of similar files are currently left to review. Great job!
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </PageContainer>
  );
};
